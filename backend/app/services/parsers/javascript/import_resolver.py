import json
from pathlib import Path

from app.core import JAVASCRIPT_EXTENSIONS, TYPESCRIPT_EXTENSIONS
from app.services.parsers.base import ImportResolution, ParsedImport, ProjectContext

JS_TS_EXTENSIONS = JAVASCRIPT_EXTENSIONS | TYPESCRIPT_EXTENSIONS

NODE_BUILTINS = frozenset(
    {
        "assert",
        "async_hooks",
        "buffer",
        "child_process",
        "cluster",
        "console",
        "constants",
        "crypto",
        "dgram",
        "diagnostics_channel",
        "dns",
        "domain",
        "events",
        "fs",
        "http",
        "http2",
        "https",
        "inspector",
        "module",
        "net",
        "os",
        "path",
        "perf_hooks",
        "process",
        "punycode",
        "querystring",
        "readline",
        "repl",
        "stream",
        "string_decoder",
        "sys",
        "timers",
        "tls",
        "trace_events",
        "tty",
        "url",
        "util",
        "v8",
        "vm",
        "wasi",
        "worker_threads",
        "zlib",
    }
)


class JavaScriptImportResolver:
    def __init__(
        self,
        project_root: Path,
        context: ProjectContext | None = None,
    ):
        self.project_root = project_root
        self._package_json = {}
        self._tsconfig = {}
        self._project_files: set[str] | None = None
        if context is not None:
            self.set_context(context)
        else:
            self._package_json = self._load_package_json()
            self._tsconfig = self._load_tsconfig()

    def _load_package_json(self) -> dict:
        package_path = self.project_root / "package.json"
        if package_path.exists():
            return json.loads(package_path.read_text())
        return {}

    def _load_tsconfig(self) -> dict:
        for name in ("tsconfig.json", "jsconfig.json"):
            config_path = self.project_root / name
            if config_path.exists():
                return json.loads(config_path.read_text())
        return {}

    def resolve(
        self,
        import_stmt: ParsedImport,
        from_file: Path,
    ) -> ImportResolution:
        import_path = import_stmt.module.strip("'\"")

        if import_path.startswith("node:"):
            return ImportResolution(
                resolved_path=import_path,
                is_internal=False,
                is_external=False,
                is_stdlib=True,
            )

        if import_path in NODE_BUILTINS:
            return ImportResolution(
                resolved_path=f"node:{import_path}",
                is_internal=False,
                is_external=False,
                is_stdlib=True,
            )

        if import_path.startswith("."):
            return self._resolve_relative(import_path, from_file)

        if self._is_path_alias(import_path):
            resolved = self._resolve_path_alias(import_path, from_file)
            if resolved:
                return resolved

        return self._resolve_package(import_path)

    def _resolve_relative(self, import_path: str, from_file: Path) -> ImportResolution:
        base = from_file.parent
        extensions = ("",) + tuple(JS_TS_EXTENSIONS)
        index_extensions = tuple(f"/index{ext}" for ext in JS_TS_EXTENSIONS)

        for ext in extensions:
            if ext:
                candidate = base / (import_path + ext)
            else:
                candidate = base / import_path
            if self._candidate_exists(candidate):
                return ImportResolution(
                    resolved_path=str(candidate.resolve()),
                    is_internal=True,
                    is_external=False,
                    is_stdlib=False,
                )

        for ext in index_extensions:
            candidate = base / (import_path + ext)
            if self._candidate_exists(candidate):
                return ImportResolution(
                    resolved_path=str(candidate.resolve()),
                    is_internal=True,
                    is_external=False,
                    is_stdlib=False,
                )

        return ImportResolution(
            resolved_path=str((base / import_path).resolve()),
            is_internal=True,
            is_external=False,
            is_stdlib=False,
        )

    def _resolve_package(self, package: str) -> ImportResolution:
        parts = package.split("/")

        if parts[0].startswith("@") and len(parts) >= 2:
            pkg_name = f"{parts[0]}/{parts[1]}"
        else:
            pkg_name = parts[0]

        node_modules_locations = [
            self.project_root / "node_modules",
            self.project_root.parent / "node_modules",
        ]

        for node_modules in node_modules_locations:
            pkg_path = node_modules / pkg_name / "package.json"
            if pkg_path.exists():
                pkg_json = json.loads(pkg_path.read_text())
                return ImportResolution(
                    resolved_path=f"external:{pkg_name}",
                    is_internal=False,
                    is_external=True,
                    is_stdlib=False,
                    package_name=pkg_name,
                    version=pkg_json.get("version"),
                )

        deps = {
            **self._package_json.get("dependencies", {}),
            **self._package_json.get("devDependencies", {}),
        }

        if pkg_name in deps:
            return ImportResolution(
                resolved_path=f"external:{pkg_name}",
                is_internal=False,
                is_external=True,
                is_stdlib=False,
                package_name=pkg_name,
                version=deps[pkg_name],
            )

        return ImportResolution(
            resolved_path=f"external:{pkg_name}",
            is_internal=False,
            is_external=True,
            is_stdlib=False,
            package_name=pkg_name,
        )

    def _is_path_alias(self, import_path: str) -> bool:
        compiler_options = self._tsconfig.get("compilerOptions", {})
        paths = compiler_options.get("paths", {})

        for alias in paths:
            pattern = alias.rstrip("*")
            if import_path.startswith(pattern):
                return True

        return False

    def _resolve_path_alias(
        self, import_path: str, from_file: Path
    ) -> ImportResolution | None:
        compiler_options = self._tsconfig.get("compilerOptions", {})
        paths = compiler_options.get("paths", {})
        base_url = compiler_options.get("baseUrl", ".")

        base_path = self.project_root / base_url

        for alias, targets in paths.items():
            pattern = alias.rstrip("*")
            if import_path.startswith(pattern):
                remainder = import_path[len(pattern) :]

                for target in targets:
                    target_path = target.rstrip("*") + remainder
                    full_path = base_path / target_path

                    for ext in ("",) + tuple(JS_TS_EXTENSIONS):
                        candidate = full_path.with_suffix(ext) if ext else full_path
                        if self._candidate_exists(candidate):
                            return ImportResolution(
                                resolved_path=str(candidate.resolve()),
                                is_internal=True,
                                is_external=False,
                                is_stdlib=False,
                            )

        return None

    def set_context(self, context: ProjectContext) -> None:
        self.project_root = context.project_root
        self._project_files = context.project_files
        self._package_json = context.package_json or {}
        self._tsconfig = context.tsconfig or {}

    def _candidate_exists(self, candidate: Path) -> bool:
        if self._project_files is None:
            return candidate.exists() and candidate.is_file()

        try:
            relative = candidate.relative_to(self.project_root)
        except ValueError:
            relative = candidate

        normalized = relative.as_posix().lstrip("/")
        return normalized in self._project_files
