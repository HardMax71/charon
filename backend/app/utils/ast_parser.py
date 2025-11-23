import ast
from pathlib import Path

from app.core import get_logger
from app.core.parsing_models import ImportInfo, ParseResult

logger = get_logger(__name__)

MAX_AST_DEPTH = 100


def parse_file(content: str, filepath: str, max_depth: int = MAX_AST_DEPTH) -> ParseResult:
    """
    Parse Python file and extract imports using functional list comprehensions.

    Minimalist approach: single try-except, list comprehensions for import extraction.
    """
    try:
        tree = ast.parse(content, filename=filepath)

        module_path = extract_module_path(filepath, "")
        if not module_path:
            module_path = filepath.replace("/", ".").replace("\\", ".").replace(".py", "")

        # Check depth to prevent stack overflow
        if (depth := _get_ast_depth(tree)) > max_depth:
            logger.warning("AST depth %d exceeds limit for %s", depth, filepath)
            return ParseResult(imports=[], errors=[f"AST too deep ({depth} > {max_depth})"])

        # Extract all imports in functional style with list comprehensions
        imports = [
            # Handle 'import x' statements
            ImportInfo(
                module=alias.name,
                names=[alias.name.split(".")[0]],
                level=0,
                lineno=node.lineno
            )
            for node in ast.walk(tree)
            if isinstance(node, ast.Import)
            for alias in node.names
        ] + [
            # Handle 'from x import y' statements
            ImportInfo(
                module=node.module or _resolve_relative_base(module_path, node.level),
                names=[a.name for a in node.names],
                level=node.level,
                lineno=node.lineno
            )
            for node in ast.walk(tree)
            if isinstance(node, ast.ImportFrom) and not (node.module is None and node.level == 0)
        ]

        logger.debug("Parsed %s: %d imports", filepath, len(imports))
        return ParseResult(imports=imports, errors=[])

    except Exception as e:
        # Single exception handler with conditional error message
        error_msg = (
            f"Syntax error in {filepath}:{e.lineno}: {e.msg}"
            if isinstance(e, SyntaxError)
            else f"Parse error in {filepath}: {str(e)}"
        )
        logger.error(error_msg, exc_info=not isinstance(e, SyntaxError))
        return ParseResult(imports=[], errors=[error_msg])


def _get_ast_depth(node: ast.AST) -> int:
    """
    Calculate maximum depth of AST tree iteratively.

    Uses iterative approach instead of recursion to avoid stack overflow.

    Args:
        node: Root AST node

    Returns:
        Maximum depth of the tree
    """
    max_depth = 0
    stack = [(node, 0)]

    while stack:
        current_node, depth = stack.pop()
        max_depth = max(max_depth, depth)

        for child in ast.iter_child_nodes(current_node):
            stack.append((child, depth + 1))

    return max_depth


def _resolve_relative_base(module_path: str, level: int) -> str:
    """Infer the module path targeted by a relative import."""
    if level <= 0 or not module_path:
        return module_path

    parts = module_path.split(".")
    if level >= len(parts):
        return ""

    base = parts[:-level]
    return ".".join(base) if base else ""


def extract_module_path(filepath: str, project_root: str) -> str:
    """
    Convert a file path to a Python module path.

    Example: 'src/package/module.py' -> 'package.module'
    """
    # Normalize filepath by stripping leading slashes to handle both absolute and relative paths
    normalized_filepath = filepath.lstrip('/')

    file_path = Path(normalized_filepath)
    root_path = Path(project_root) if project_root else Path(".")

    try:
        relative = file_path.relative_to(root_path) if project_root else file_path
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
