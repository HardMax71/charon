from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

from app.services.parsers.base import ImportResolution, ParsedImport, ProjectContext

# Java standard library root packages
JAVA_STDLIB = frozenset(
    {
        "java",
        "javax",
        "sun",
        "com.sun",
        "jdk",
        "org.w3c",
        "org.xml",
        "org.omg",
        "org.ietf",
    }
)


@dataclass
class JavaImportResolver:
    """Resolves Java import paths."""

    project_root: Path
    package_name: str = ""
    project_files: set[str] = field(default_factory=set)
    _context: ProjectContext | None = None

    def set_context(self, context: ProjectContext) -> None:
        self._context = context
        if context.project_files:
            self.project_files = context.project_files

    def resolve(self, import_stmt: ParsedImport, from_file: Path) -> ImportResolution:
        """Resolve a Java import."""
        import_path = import_stmt.module

        # Check if standard library
        for stdlib_pkg in JAVA_STDLIB:
            if import_path.startswith(stdlib_pkg + ".") or import_path == stdlib_pkg:
                return ImportResolution(
                    resolved_path=import_path,
                    is_internal=False,
                    is_external=False,
                    is_stdlib=True,
                    package_name=import_path.split(".")[0],
                )

        # Check if internal by looking for source file
        relative_path = import_path.replace(".", "/") + ".java"
        potential_paths = [
            self.project_root / "src" / "main" / "java" / relative_path,
            self.project_root / "src" / relative_path,
            self.project_root / relative_path,
        ]

        for potential in potential_paths:
            if potential.exists() or str(potential) in self.project_files:
                return ImportResolution(
                    resolved_path=import_path,
                    is_internal=True,
                    is_external=False,
                    is_stdlib=False,
                    package_name=import_path.rsplit(".", 1)[0]
                    if "." in import_path
                    else "",
                )

        # External dependency
        parts = import_path.split(".")
        package_name = ".".join(parts[:2]) if len(parts) >= 2 else parts[0]
        return ImportResolution(
            resolved_path=import_path,
            is_internal=False,
            is_external=True,
            is_stdlib=False,
            package_name=package_name,
        )
