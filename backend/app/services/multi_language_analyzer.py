from collections import defaultdict
from pathlib import Path, PurePosixPath

from app.core import (
    get_logger,
    EXTENSION_TO_LANGUAGE,
    JAVASCRIPT_EXTENSIONS,
    TYPESCRIPT_EXTENSIONS,
)
from app.core.models import FileInput, Language, NodeType
from app.core.parsing_models import (
    ComplexityMetrics,
    DependencyAnalysis,
    ImportInfo,
    ModuleMetadata,
)
from app.services.complexity_service import ComplexityService
from app.services.parsers import ParserRegistry

logger = get_logger(__name__)

JS_TS_EXTENSIONS = JAVASCRIPT_EXTENSIONS | TYPESCRIPT_EXTENSIONS


class MultiLanguageAnalyzer:
    def __init__(self):
        self._complexity_service = ComplexityService()
        self._path_to_module: dict[str, str] = {}
        self._module_to_path: dict[str, str] = {}
        self._detected_services: set[str] = set()

    def analyze(
        self,
        files: list[FileInput],
        project_name: str = "project",
    ) -> DependencyAnalysis:
        files_by_language = self._group_by_language(files)

        if not files_by_language:
            logger.warning("No supported files found for analysis")
            return DependencyAnalysis(
                modules={},
                imports={},
                dependencies={},
                import_details={},
                complexity={},
                errors=["No supported files found"],
            )

        all_modules: dict[str, str] = {}
        all_imports: dict[str, list[ImportInfo]] = {}
        all_dependencies: dict[str, set[str]] = defaultdict(set)
        all_import_details: dict[tuple[str, str], list[str]] = {}
        all_complexity: dict[str, ComplexityMetrics] = {}
        all_metadata: dict[str, ModuleMetadata] = {}
        all_errors: list[str] = []

        # First pass: build path-to-module mappings and detect services
        self._path_to_module.clear()
        self._module_to_path.clear()
        self._detected_services.clear()

        # Detect services from all file paths first
        for file in files:
            service = self._detect_service(file.path)
            if service:
                self._detected_services.add(service)

        for language, lang_files in files_by_language.items():
            for file in lang_files:
                module_id = self._file_to_module_id(file.path, language)
                normalized_path = file.path.lstrip("/")
                self._path_to_module[normalized_path] = module_id
                self._module_to_path[module_id] = normalized_path

                # Store metadata for each module
                service = self._detect_service(file.path)
                node_kind = self._detect_node_kind(file.path, file.content, language)
                all_metadata[module_id] = ModuleMetadata(
                    language=language.value,
                    file_path=file.path,
                    service=service,
                    node_kind=node_kind.value,
                )

                # Also map without extension for JS/TS index resolution
                if language in (Language.JAVASCRIPT, Language.TYPESCRIPT):
                    path_no_ext = str(PurePosixPath(normalized_path).with_suffix(""))
                    self._path_to_module[path_no_ext] = module_id

                    # Map index files to their directory
                    if PurePosixPath(normalized_path).stem == "index":
                        dir_path = str(PurePosixPath(normalized_path).parent)
                        self._path_to_module[dir_path] = module_id

        # Second pass: parse and analyze
        for language, lang_files in files_by_language.items():
            try:
                parser = ParserRegistry.get_parser(language)
            except ValueError as e:
                logger.warning("No parser for %s: %s", language, e)
                continue

            project_modules: set[str] = set()
            for file in lang_files:
                module_id = self._file_to_module_id(file.path, language)
                project_modules.add(module_id)
                all_modules[module_id] = file.content

            parser.set_project_modules(project_modules)

            for file in lang_files:
                module_id = self._file_to_module_id(file.path, language)

                try:
                    nodes = parser.parse_file(Path(file.path), file.content)
                except Exception as e:
                    error_msg = f"Parse error in {file.path}: {e}"
                    logger.error(error_msg)
                    all_errors.append(error_msg)
                    continue

                module_node = next(
                    (
                        n
                        for n in nodes
                        if n.id == module_id or n.name == Path(file.path).stem
                    ),
                    None,
                )
                if not module_node:
                    continue

                import_infos = []
                for parsed_import in module_node.imports:
                    import_infos.append(
                        ImportInfo(
                            module=parsed_import.module,
                            names=parsed_import.names,
                            level=parsed_import.level,
                            lineno=1,  # Default line number, actual value not tracked
                        )
                    )

                    # Try direct path resolution for relative imports (JS/TS)
                    target = None
                    if language in (Language.JAVASCRIPT, Language.TYPESCRIPT):
                        if parsed_import.module.startswith("."):
                            target = self._resolve_relative_js_import(
                                parsed_import.module, file.path
                            )

                    # Fall back to parser resolver
                    if target is None:
                        resolution = parser.resolve_import(
                            parsed_import,
                            Path(file.path),
                            Path("."),
                        )

                        if resolution.is_stdlib:
                            continue

                        if resolution.is_external:
                            pkg = (
                                resolution.package_name
                                or parsed_import.module.split(".")[0]
                            )
                            target = f"third_party.{pkg}"
                        elif resolution.is_internal and resolution.resolved_path:
                            target = self._resolve_path_to_module(
                                resolution.resolved_path, language, project_modules
                            )
                        else:
                            target = f"third_party.{parsed_import.module.split('.')[0]}"

                    if target:
                        all_dependencies[module_id].add(target)

                        key = (module_id, target)
                        if key not in all_import_details:
                            all_import_details[key] = []
                        all_import_details[key].extend(
                            parsed_import.names or [parsed_import.module]
                        )

                all_imports[module_id] = import_infos

                if language == Language.PYTHON:
                    complexity = self._complexity_service.analyze_file(
                        file.path, file.content
                    )
                    all_complexity[module_id] = complexity

        logger.info(
            "Multi-language analysis complete: %d modules across %d languages, %d services detected",
            len(all_modules),
            len(files_by_language),
            len(self._detected_services),
        )

        return DependencyAnalysis(
            modules=all_modules,
            imports=all_imports,
            dependencies={k: v for k, v in all_dependencies.items()},
            import_details=all_import_details,
            complexity=all_complexity,
            errors=all_errors,
            module_metadata=all_metadata,
        )

    def _detect_service(self, file_path: str) -> str | None:
        """Detect service/package name from file path.

        Handles common monorepo patterns:
        - frontend/, backend/, api/, web/, mobile/
        - packages/<name>/, libs/<name>/, apps/<name>/
        - services/<name>/, modules/<name>/
        - src/ (single service, use parent dir or 'main')
        """
        normalized = file_path.lstrip("/")
        parts = normalized.split("/")

        if not parts:
            return None

        # Common top-level service directories
        top_level_services = {
            "frontend",
            "backend",
            "api",
            "web",
            "mobile",
            "server",
            "client",
            "admin",
            "dashboard",
            "core",
            "common",
            "shared",
        }

        # Monorepo package directories (take next segment as service name)
        package_dirs = {"packages", "libs", "apps", "services", "modules", "projects"}

        first_part = parts[0].lower()

        # Direct top-level service
        if first_part in top_level_services:
            return parts[0]

        # Monorepo pattern: packages/<name>/...
        if first_part in package_dirs and len(parts) > 1:
            return parts[1]

        # If starts with src/ and there are more parts, might be single-service repo
        if first_part == "src" and len(parts) > 1:
            # Check if second part looks like a service
            second = parts[1].lower()
            if second in top_level_services or second in package_dirs:
                return parts[1]
            # Otherwise use 'main' as default service
            return "main"

        # Use first directory as service if we have nested structure
        if len(parts) > 1:
            return parts[0]

        return None

    def _detect_node_kind(
        self, file_path: str, content: str, language: Language
    ) -> NodeType:
        """Detect the type of node based on file path and content."""
        path = Path(file_path)
        name = path.stem.lower()

        # JavaScript/TypeScript specific patterns
        if language in (Language.JAVASCRIPT, Language.TYPESCRIPT):
            # React hooks
            if (
                name.startswith("use")
                or "export function use" in content
                or "export const use" in content
            ):
                return NodeType.HOOK

            # React components (check for JSX indicators)
            jsx_indicators = ["<", "React", "jsx", "tsx", "return ("]
            if path.suffix in (".jsx", ".tsx") or any(
                ind in content for ind in jsx_indicators
            ):
                if (
                    "export default" in content
                    or "export function" in content
                    or "export const" in content
                ):
                    return NodeType.COMPONENT

            # Service files
            if "service" in name:
                return NodeType.SERVICE

        # Python specific patterns
        elif language == Language.PYTHON:
            # Check for class definitions
            if "class " in content:
                return NodeType.CLASS

            # Service files
            if "service" in name or "_service" in name:
                return NodeType.SERVICE

        # Default to module
        return NodeType.MODULE

    def _group_by_language(
        self, files: list[FileInput]
    ) -> dict[Language, list[FileInput]]:
        result: dict[Language, list[FileInput]] = defaultdict(list)

        for file in files:
            ext = Path(file.path).suffix.lower()
            if ext in EXTENSION_TO_LANGUAGE:
                result[EXTENSION_TO_LANGUAGE[ext]].append(file)

        return result

    def _file_to_module_id(self, file_path: str, language: Language) -> str:
        path = Path(file_path.lstrip("/"))
        parts = list(path.parts)

        if language == Language.PYTHON:
            if parts[-1].endswith(".py"):
                parts[-1] = parts[-1][:-3]
            if parts[-1] == "__init__":
                parts = parts[:-1]
        elif language in (Language.JAVASCRIPT, Language.TYPESCRIPT):
            js_ts_extensions = JAVASCRIPT_EXTENSIONS | TYPESCRIPT_EXTENSIONS
            for ext in js_ts_extensions:
                if parts[-1].endswith(ext):
                    parts[-1] = parts[-1][: -len(ext)]
                    break
            if parts[-1] == "index":
                parts = parts[:-1]
        else:
            parts[-1] = path.stem

        return ".".join(parts) if parts else path.stem

    def _resolve_relative_js_import(
        self, import_path: str, from_file: str
    ) -> str | None:
        """Resolve a relative JS/TS import to a module ID using our path mappings."""
        from_path = PurePosixPath(from_file.lstrip("/"))
        base_dir = from_path.parent

        # Normalize the import path (handle ./ and ../)
        import_posix = PurePosixPath(import_path)
        resolved = (base_dir / import_posix).as_posix()

        # Normalize parent references
        parts = []
        for part in resolved.split("/"):
            if part == "..":
                if parts:
                    parts.pop()
            elif part and part != ".":
                parts.append(part)
        resolved = "/".join(parts)

        # Try exact match first
        if resolved in self._path_to_module:
            return self._path_to_module[resolved]

        # Try with various extensions
        for ext in JS_TS_EXTENSIONS:
            candidate = resolved + ext
            if candidate in self._path_to_module:
                return self._path_to_module[candidate]

        # Try index files
        for ext in JS_TS_EXTENSIONS:
            candidate = f"{resolved}/index{ext}"
            if candidate in self._path_to_module:
                return self._path_to_module[candidate]

        logger.debug(
            "Could not resolve JS import '%s' from '%s'", import_path, from_file
        )
        return None

    def _resolve_path_to_module(
        self, resolved_path: str, language: Language, project_modules: set[str]
    ) -> str:
        """Convert a resolved path to a module ID, falling back to third_party."""
        if resolved_path.startswith(("external:", "stdlib:")):
            return resolved_path

        # Try direct lookup in our path mapping
        normalized = resolved_path.lstrip("/")
        if normalized in self._path_to_module:
            return self._path_to_module[normalized]

        # Try converting to module ID and checking project_modules
        module_id = self._file_to_module_id(resolved_path, language)
        if module_id in project_modules:
            return module_id

        # Check if any project module starts with this (package match)
        for proj_mod in project_modules:
            if proj_mod.startswith(module_id + ".") or module_id.startswith(
                proj_mod + "."
            ):
                return proj_mod

        # Unknown internal import - treat as third party
        first_part = resolved_path.lstrip("/").split("/")[0]
        return f"third_party.{first_part}"


async def analyze_files_multi_language(
    files: list[FileInput],
    project_name: str = "project",
) -> DependencyAnalysis:
    analyzer = MultiLanguageAnalyzer()
    return analyzer.analyze(files, project_name)
