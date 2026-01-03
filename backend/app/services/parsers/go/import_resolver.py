from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

from app.services.parsers.base import ImportResolution, ParsedImport, ProjectContext

# Go standard library packages (partial list of common ones)
GO_STDLIB = frozenset(
    {
        "archive",
        "bufio",
        "builtin",
        "bytes",
        "compress",
        "container",
        "context",
        "crypto",
        "database",
        "debug",
        "embed",
        "encoding",
        "errors",
        "expvar",
        "flag",
        "fmt",
        "go",
        "hash",
        "html",
        "image",
        "index",
        "io",
        "log",
        "maps",
        "math",
        "mime",
        "net",
        "os",
        "path",
        "plugin",
        "reflect",
        "regexp",
        "runtime",
        "slices",
        "sort",
        "strconv",
        "strings",
        "sync",
        "syscall",
        "testing",
        "text",
        "time",
        "unicode",
        "unsafe",
    }
)


@dataclass
class GoImportResolver:
    """Resolves Go import paths."""

    project_root: Path
    module_name: str = ""
    project_files: set[str] = field(default_factory=set)
    _context: ProjectContext | None = None

    def __post_init__(self) -> None:
        self._load_go_mod()

    def _load_go_mod(self) -> None:
        """Load module name from go.mod."""
        go_mod = self.project_root / "go.mod"
        if go_mod.exists():
            content = go_mod.read_text()
            for line in content.splitlines():
                if line.startswith("module "):
                    self.module_name = line.split()[1].strip()
                    break

    def set_context(self, context: ProjectContext) -> None:
        self._context = context
        if context.project_files:
            self.project_files = context.project_files

    def resolve(self, import_stmt: ParsedImport, from_file: Path) -> ImportResolution:
        """Resolve a Go import path."""
        import_path = import_stmt.module

        # Check if standard library
        root_pkg = import_path.split("/")[0]
        if root_pkg in GO_STDLIB:
            return ImportResolution(
                resolved_path=import_path,
                is_internal=False,
                is_external=False,
                is_stdlib=True,
                package_name=root_pkg,
            )

        # Check if internal to this module
        if self.module_name and import_path.startswith(self.module_name):
            relative_path = import_path[len(self.module_name) :].lstrip("/")
            return ImportResolution(
                resolved_path=import_path,
                is_internal=True,
                is_external=False,
                is_stdlib=False,
                package_name=relative_path.split("/")[0] if relative_path else "",
            )

        # External dependency
        return ImportResolution(
            resolved_path=import_path,
            is_internal=False,
            is_external=True,
            is_stdlib=False,
            package_name=root_pkg,
        )
