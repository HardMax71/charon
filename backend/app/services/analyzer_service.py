from collections import defaultdict

from app.core import get_logger
from app.core.models import FileInput
from app.core.parsing_models import DependencyAnalysis
from app.utils.ast_parser import parse_file, extract_module_path
from app.utils.import_resolver import ImportResolver
from app.services.complexity_service import ComplexityService

logger = get_logger(__name__)


async def analyze_files(
    files: list[FileInput], project_name: str = "project"
) -> DependencyAnalysis:
    """
    Analyze Python files and extract dependencies.

    Args:
        files: List of file inputs
        project_name: Name of the project (used as root)

    Returns:
        DependencyAnalysis with validated, type-safe data
    """
    logger.info(
        "Starting analysis of %d files for project '%s'", len(files), project_name
    )

    module_map: dict[str, str] = {}
    modules: dict[str, str] = {}

    for file in files:
        if not file.path.endswith(".py"):
            continue

        module_path = extract_module_path(file.path, "")
        if not module_path:
            module_path = (
                file.path.replace("/", ".").replace("\\", ".").replace(".py", "")
            )

        module_map[file.path] = module_path
        modules[module_path] = file.content

    logger.debug("Found %d Python modules", len(modules))

    resolver = ImportResolver(set(modules.keys()))
    complexity_service = ComplexityService()

    imports = {}
    dependencies = defaultdict(set)
    import_details = {}
    complexity = {}
    errors = []

    for file in files:
        if not file.path.endswith(".py"):
            continue
        module_path = module_map[file.path]

        complexity_metrics = complexity_service.analyze_file(file.path, file.content)
        complexity[module_path] = complexity_metrics

        parse_result = parse_file(file.content, file.path)

        if not parse_result.is_valid:
            errors.extend(parse_result.errors)

        imports[module_path] = parse_result.imports

        for import_info in parse_result.imports:
            import_type, resolved_module = resolver.classify(import_info, module_path)

            if import_type == "stdlib":
                continue

            if import_type == "third_party":
                top_level = resolved_module.split(".")[0]
                resolved_module = f"third_party.{top_level}"

            dependencies[module_path].add(resolved_module)

            key = (module_path, resolved_module)
            if key not in import_details:
                import_details[key] = []
            import_details[key].extend(import_info.names)

    cache_stats = resolver.get_cache_stats()
    logger.info(
        "Analysis complete: %d modules, %d dependencies, %d errors, cache: %d entries",
        len(modules),
        sum(len(deps) for deps in dependencies.values()),
        len(errors),
        cache_stats["cache_size"],
    )

    return DependencyAnalysis(
        modules=modules,
        imports=imports,
        dependencies=dict(dependencies),
        import_details=import_details,
        complexity=complexity,
        errors=errors,
    )
