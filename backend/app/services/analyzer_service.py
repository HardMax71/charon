from collections import defaultdict
from typing import Dict, List, Set

from app.core.models import FileInput
from app.utils.ast_parser import parse_file, extract_module_path, ImportInfo
from app.utils.import_resolver import classify_import
from app.services.complexity_service import ComplexityService


class DependencyData:
    """Container for dependency analysis data."""

    def __init__(self):
        self.modules: Dict[str, str] = {}  # module_path -> file_content
        self.imports: Dict[str, List[ImportInfo]] = {}  # module_path -> imports
        self.dependencies: Dict[str, Set[str]] = defaultdict(set)  # from_module -> set(to_modules)
        self.import_details: Dict[tuple[str, str], List[str]] = {}  # (from, to) -> imported_names
        self.complexity: Dict[str, Dict] = {}  # module_path -> complexity metrics
        self.errors: List[str] = []


def analyze_files(files: List[FileInput], project_name: str = "project") -> DependencyData:
    """
    Analyze a list of Python files and extract dependencies.

    Args:
        files: List of file inputs
        project_name: Name of the project (used as root)

    Returns:
        DependencyData object with analysis results
    """
    data = DependencyData()

    # First pass: collect all modules
    module_map: Dict[str, str] = {}  # filepath -> module_path
    for file in files:
        if not file.path.endswith(".py"):
            continue

        module_path = extract_module_path(file.path, "")
        if not module_path:
            module_path = file.path.replace("/", ".").replace("\\", ".").replace(".py", "")

        module_map[file.path] = module_path
        data.modules[module_path] = file.content

    project_modules = set(data.modules.keys())

    # Second pass: parse imports and analyze complexity
    complexity_service = ComplexityService()

    for file in files:
        if not file.path.endswith(".py"):
            continue

        module_path = module_map[file.path]

        # Analyze code complexity
        complexity_metrics = complexity_service.analyze_file(file.path, file.content)
        data.complexity[module_path] = complexity_metrics

        # Parse imports
        imports, errors = parse_file(file.content, file.path)

        if errors:
            data.errors.extend(errors)

        data.imports[module_path] = imports

        # Process each import
        for import_info in imports:
            import_type, resolved_module = classify_import(
                import_info, module_path, project_modules
            )

            # Skip standard library
            if import_type == "stdlib":
                continue

            # For third-party, use top-level package name
            if import_type == "third_party":
                top_level = resolved_module.split(".")[0]
                resolved_module = f"third_party.{top_level}"

            # Add dependency
            data.dependencies[module_path].add(resolved_module)

            # Track import details
            key = (module_path, resolved_module)
            if key not in data.import_details:
                data.import_details[key] = []
            data.import_details[key].extend(import_info.names)

    return data
