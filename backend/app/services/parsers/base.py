from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Protocol, runtime_checkable

from app.core.models import Language, NodeType


@dataclass(frozen=True, slots=True)
class ImportResolution:
    resolved_path: str | None
    is_internal: bool
    is_external: bool
    is_stdlib: bool
    package_name: str | None = None
    version: str | None = None


@dataclass(slots=True)
class ParsedImport:
    module: str
    names: list[str] = field(default_factory=list)
    alias: str | None = None
    is_relative: bool = False
    level: int = 0  # for Python relative imports


@dataclass(slots=True)
class ParsedNode:
    id: str
    name: str
    node_type: NodeType
    language: Language
    file_path: str
    start_line: int
    end_line: int
    imports: list[ParsedImport] = field(default_factory=list)
    exports: list[str] = field(default_factory=list)
    docstring: str | None = None
    metadata: dict = field(default_factory=dict)


@runtime_checkable
class LanguageParser(Protocol):
    language: Language
    file_extensions: tuple[str, ...]

    def parse_file(
        self, path: Path, content: str | None = None
    ) -> list[ParsedNode]: ...

    def resolve_import(
        self,
        import_stmt: ParsedImport,
        from_file: Path,
        project_root: Path,
    ) -> ImportResolution: ...

    def detect_project(self, path: Path) -> bool: ...

    def set_project_modules(self, modules: set[str]) -> None: ...


class BaseParser(ABC):
    language: Language
    file_extensions: tuple[str, ...]

    @abstractmethod
    def parse_file(self, path: Path, content: str | None = None) -> list[ParsedNode]:
        pass

    @abstractmethod
    def resolve_import(
        self,
        import_stmt: ParsedImport,
        from_file: Path,
        project_root: Path,
    ) -> ImportResolution:
        pass

    @abstractmethod
    def detect_project(self, path: Path) -> bool:
        pass

    def parse_content(self, content: str, file_path: str) -> list[ParsedNode]:
        return self.parse_file(Path(file_path), content)

    def set_project_modules(self, modules: set[str]) -> None:
        """Optional hook for parsers that need project module context."""
        pass
