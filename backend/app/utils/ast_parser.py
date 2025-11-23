import ast
from pathlib import Path

from app.core import get_logger
from app.core.parsing_models import ImportInfo, ParseResult

logger = get_logger(__name__)

MAX_AST_DEPTH = 100


def parse_file(
    content: str,
    filepath: str,
    max_depth: int = MAX_AST_DEPTH
) -> ParseResult:
    """
    Parse a Python file and extract all imports safely.

    Args:
        content: File content as string
        filepath: Path to the file (for error reporting)
        max_depth: Maximum AST depth to prevent stack overflow (default: 100)

    Returns:
        ParseResult with imports and errors
    """
    imports: list[ImportInfo] = []
    errors: list[str] = []

    try:
        tree = ast.parse(content, filename=filepath)

        depth = _get_ast_depth(tree)
        if depth > max_depth:
            logger.warning("AST depth %d exceeds limit %d for %s", depth, max_depth, filepath)
            errors.append(f"AST too deep ({depth} > {max_depth}), skipping detailed analysis")
            return ParseResult(imports=[], errors=errors)

    except SyntaxError as e:
        logger.error("Syntax error in %s:%d: %s", filepath, e.lineno, e.msg)
        errors.append(f"Syntax error in {filepath}:{e.lineno}: {e.msg}")
        return ParseResult(imports=imports, errors=errors)
    except RecursionError:
        logger.error("Recursion limit hit parsing %s", filepath, exc_info=True)
        errors.append(f"File too complex to parse: {filepath}")
        return ParseResult(imports=imports, errors=errors)
    except Exception as e:
        logger.error("Failed to parse %s: %s", filepath, str(e), exc_info=True)
        errors.append(f"Failed to parse {filepath}: {str(e)}")
        return ParseResult(imports=imports, errors=errors)

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
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
            if node.module is None and node.level == 0:
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

    logger.debug("Parsed %s: %d imports, %d errors", filepath, len(imports), len(errors))
    return ParseResult(imports=imports, errors=errors)


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
