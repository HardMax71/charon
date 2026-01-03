from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

from app.services.parsers.base import ImportResolution, ParsedImport, ProjectContext

# Regex to match: name = "value" or name = 'value' (with optional whitespace)
_TOML_NAME_PATTERN = re.compile(r'^name\s*=\s*["\']([^"\']+)["\']')

# Rust standard library crates
RUST_STDLIB = frozenset(
    {
        "std",
        "core",
        "alloc",
        "proc_macro",
        "test",
    }
)


@dataclass
class RustImportResolver:
    """Resolves Rust use paths."""

    project_root: Path
    crate_name: str = ""
    project_files: set[str] = field(default_factory=set)
    _context: ProjectContext | None = None

    def __post_init__(self) -> None:
        self._load_cargo_toml()

    def _load_cargo_toml(self) -> None:
        """Load crate name from Cargo.toml."""
        cargo_toml = self.project_root / "Cargo.toml"
        if not cargo_toml.exists():
            return

        try:
            content = cargo_toml.read_text(encoding="utf-8")
        except OSError:
            return

        in_package = False
        for line in content.splitlines():
            stripped = line.strip()
            # Skip comments
            if stripped.startswith("#"):
                continue
            if stripped == "[package]":
                in_package = True
            elif stripped.startswith("[") and in_package:
                break
            elif in_package:
                match = _TOML_NAME_PATTERN.match(stripped)
                if match:
                    self.crate_name = match.group(1)
                    break

    def set_context(self, context: ProjectContext) -> None:
        self._context = context
        if context.project_files:
            self.project_files = context.project_files

    def resolve(self, import_stmt: ParsedImport, from_file: Path) -> ImportResolution:
        """Resolve a Rust use path."""
        use_path = import_stmt.module

        # Handle crate-relative paths
        if use_path.startswith("crate::"):
            return ImportResolution(
                resolved_path=use_path,
                is_internal=True,
                is_external=False,
                is_stdlib=False,
                package_name=self.crate_name or "crate",
            )

        # Handle super/self paths (relative imports)
        if use_path.startswith("super::") or use_path.startswith("self::"):
            return ImportResolution(
                resolved_path=use_path,
                is_internal=True,
                is_external=False,
                is_stdlib=False,
                package_name=self.crate_name or "crate",
            )

        # Check if standard library
        root_crate = use_path.split("::")[0]
        if root_crate in RUST_STDLIB:
            return ImportResolution(
                resolved_path=use_path,
                is_internal=False,
                is_external=False,
                is_stdlib=True,
                package_name=root_crate,
            )

        # External crate
        return ImportResolution(
            resolved_path=use_path,
            is_internal=False,
            is_external=True,
            is_stdlib=False,
            package_name=root_crate,
        )
