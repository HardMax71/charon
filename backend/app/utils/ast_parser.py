"""AST parsing utilities for extracting imports from Python files."""

import ast
from pathlib import Path
from typing import NamedTuple


class ImportInfo(NamedTuple):
    """Information about a single import statement."""

    module: str  # The module being imported from
    names: list[str]  # The names being imported
    level: int  # Relative import level (0 for absolute)
    lineno: int  # Line number in source


def parse_file(content: str, filepath: str) -> tuple[list[ImportInfo], list[str]]:
    """
    Parse a Python file and extract all imports.

    Args:
        content: File content as string
        filepath: Path to the file (for error reporting)

    Returns:
        Tuple of (imports, errors)
    """
    imports: list[ImportInfo] = []
    errors: list[str] = []

    try:
        tree = ast.parse(content, filename=filepath)
    except SyntaxError as e:
        errors.append(f"Syntax error in {filepath}:{e.lineno}: {e.msg}")
        return imports, errors
    except Exception as e:
        errors.append(f"Failed to parse {filepath}: {str(e)}")
        return imports, errors

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            # import foo, bar
            for alias in node.names:
                imports.append(
                    ImportInfo(
                        module=alias.name,
                        names=[alias.name.split(".")[0]],
                        level=0,
                        lineno=node.lineno,
                    )
                )

        elif isinstance(node, ast.ImportFrom):
            # from foo import bar, baz
            # from .relative import something
            if node.module is None and node.level == 0:
                # Weird edge case: `from __future__ import ...`
                continue

            module = node.module or ""
            names = [alias.name for alias in node.names]

            imports.append(
                ImportInfo(
                    module=module,
                    names=names,
                    level=node.level,
                    lineno=node.lineno,
                )
            )

    return imports, errors


def extract_module_path(filepath: str, project_root: str) -> str:
    """
    Convert a file path to a Python module path.

    Example: 'src/package/module.py' -> 'package.module'
    """
    file_path = Path(filepath)
    root_path = Path(project_root)

    try:
        relative = file_path.relative_to(root_path)
    except ValueError:
        # File is outside project root
        relative = file_path

    # Remove .py extension and convert path separators to dots
    parts = list(relative.parts)
    if parts[-1].endswith(".py"):
        parts[-1] = parts[-1][:-3]

    # Remove __init__ from path
    if parts[-1] == "__init__":
        parts = parts[:-1]

    return ".".join(parts) if parts else ""
