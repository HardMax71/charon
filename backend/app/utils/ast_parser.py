"""
Python AST parser for extracting and resolving imports.

Uses ast.NodeVisitor - the standard library pattern used by pylint, mypy, black, ruff.
Import resolution mirrors CPython's importlib._bootstrap._resolve_name.
"""

from __future__ import annotations

import ast
from dataclasses import dataclass, field
from pathlib import PurePosixPath
from typing import Final

from app.core import get_logger
from app.core.models import ImportInfo, ParseResult

logger = get_logger(__name__)

MAX_AST_DEPTH: Final[int] = 100
_SOURCE_PREFIXES: Final[frozenset[str]] = frozenset({"src", "lib", "source"})


def resolve_relative_import(name: str, package: str, level: int) -> str | None:
    """
    Resolve a relative module name to an absolute one.

    Mirrors CPython's importlib._bootstrap._resolve_name:
        bits = package.rsplit('.', level - 1)
        if len(bits) < level: raise ImportError
        base = bits[0]
        return f'{base}.{name}' if name else base
    """
    if level == 0:
        return name or None

    if not package:
        return None

    bits = package.rsplit(".", level - 1)

    if len(bits) < level:
        return None

    base = bits[0]
    return f"{base}.{name}" if name else base


@dataclass(frozen=True, slots=True)
class ModuleContext:
    """Context for a Python module, used for resolving relative imports."""

    module_path: str
    package: str
    file_path: str
    is_package: bool


def filepath_to_module(filepath: str) -> str:
    """Convert a file path to a Python module path."""
    return get_module_context(filepath).module_path


def get_module_context(filepath: str) -> ModuleContext:
    """
    Determine the module context from a file path.

    For __init__.py: package equals module (a.b.__init__ -> module='a.b', package='a.b')
    For regular files: package is parent (a.b.c -> module='a.b.c', package='a.b')
    """
    normalized = filepath.lstrip("/").replace("\\", "/")
    path = PurePosixPath(normalized)
    parts = list(path.parts)

    if not parts:
        return ModuleContext("", "", filepath, False)

    is_package = parts[-1] in ("__init__.py", "__init__")

    if parts[0] in _SOURCE_PREFIXES:
        parts = parts[1:]

    if not parts:
        return ModuleContext("", "", filepath, is_package)

    if parts[-1].endswith(".py"):
        parts[-1] = parts[-1][:-3]

    if parts and parts[-1] == "__init__":
        parts = parts[:-1]

    module_path = ".".join(parts) if parts else ""

    package = (
        module_path
        if (is_package or "." not in module_path)
        else module_path.rsplit(".", 1)[0]
    )

    return ModuleContext(module_path, package, filepath, is_package)


def _measure_ast_depth(node: ast.AST) -> int:
    """Calculate maximum depth of AST tree iteratively."""
    max_depth = 0
    stack: list[tuple[ast.AST, int]] = [(node, 0)]

    while stack:
        current, depth = stack.pop()
        max_depth = max(max_depth, depth)
        stack.extend((child, depth + 1) for child in ast.iter_child_nodes(current))

    return max_depth


@dataclass
class ImportExtractor(ast.NodeVisitor):
    """
    AST visitor that extracts and resolves imports.

    Standard library pattern - dispatch handled by NodeVisitor base class.
    """

    context: ModuleContext
    imports: list[ImportInfo] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def visit_Import(self, node: ast.Import) -> None:
        """Handle 'import x' and 'import x.y.z' statements."""
        for alias in node.names:
            self.imports.append(
                ImportInfo(
                    module=alias.name,
                    names=[alias.name.split(".")[0]],
                    level=0,
                    lineno=node.lineno,
                )
            )

    def visit_ImportFrom(self, node: ast.ImportFrom) -> None:
        """Handle 'from x import y' statements."""
        level = node.level
        module_name = node.module

        # Resolve base module
        if level > 0:
            resolved = resolve_relative_import(
                module_name or "", self.context.package, level
            )
            if resolved is None:
                self.errors.append(
                    f"{self.context.file_path}:{node.lineno}: "
                    f"Invalid relative import (level={level}, package='{self.context.package}')"
                )
                return
            base_module = resolved
        else:
            if not module_name:
                self.errors.append(
                    f"{self.context.file_path}:{node.lineno}: Invalid import syntax"
                )
                return
            base_module = module_name

        imported_names = [alias.name for alias in node.names]

        # 'from . import x, y' - each name is a potential submodule
        if module_name is None and level > 0:
            for name in imported_names:
                target = (
                    base_module
                    if name == "*"
                    else (f"{base_module}.{name}" if base_module else name)
                )
                self.imports.append(
                    ImportInfo(
                        module=target,
                        names=["*"] if name == "*" else [name],
                        level=0,
                        lineno=node.lineno,
                    )
                )
            return

        # 'from x import y' or 'from .x import y'
        self.imports.append(
            ImportInfo(
                module=base_module,
                names=imported_names,
                level=0,
                lineno=node.lineno,
            )
        )


def parse_file(
    content: str,
    filepath: str,
    max_depth: int = MAX_AST_DEPTH,
) -> ParseResult:
    """
    Parse Python source code and extract resolved imports.

    All relative imports are resolved to absolute module paths.
    """
    try:
        tree = ast.parse(content, filename=filepath)
    except SyntaxError as e:
        msg = f"Syntax error in {filepath}:{e.lineno}: {e.msg}"
        logger.error(msg)
        return ParseResult(imports=[], errors=[msg])
    except Exception as e:
        msg = f"Parse error in {filepath}: {e}"
        logger.error(msg, exc_info=True)
        return ParseResult(imports=[], errors=[msg])

    depth = _measure_ast_depth(tree)
    if depth > max_depth:
        logger.warning("AST depth %d exceeds limit for %s", depth, filepath)
        return ParseResult(imports=[], errors=[f"AST too deep ({depth} > {max_depth})"])

    context = get_module_context(filepath)
    extractor = ImportExtractor(context=context)
    extractor.visit(tree)

    logger.debug("Parsed %s: %d imports", filepath, len(extractor.imports))
    return ParseResult(imports=extractor.imports, errors=extractor.errors)
