from __future__ import annotations

from pathlib import Path

from app.core import JAVA_EXTENSIONS
from app.core.models import Language, NodeType
from app.services.parsers.base import (
    ImportResolution,
    ParsedImport,
    ParsedNode,
    ProjectContext,
)
from app.services.parsers.java.import_resolver import JavaImportResolver
from app.services.parsers.registry import ParserRegistry
from app.services.parsers.tree_sitter_base import TreeSitterParser


@ParserRegistry.register
class JavaParser(TreeSitterParser):
    """Parser for Java source files."""

    language = Language.JAVA
    language_name = "java"
    file_extensions = tuple(JAVA_EXTENSIONS)

    IMPORT_QUERY = """
    (import_declaration) @import
    """

    CLASS_QUERY = """
    (class_declaration
      name: (identifier) @name)
    (interface_declaration
      name: (identifier) @name)
    (enum_declaration
      name: (identifier) @name)
    (record_declaration
      name: (identifier) @name)
    """

    FUNCTION_QUERY = """
    (method_declaration
      name: (identifier) @name)
    (constructor_declaration
      name: (identifier) @name)
    """

    def __init__(self) -> None:
        super().__init__()
        self._resolver: JavaImportResolver | None = None
        self._project_context: ProjectContext | None = None

    def detect_project(self, path: Path) -> bool:
        indicators = ("pom.xml", "build.gradle", "build.gradle.kts")
        return any((path / ind).exists() for ind in indicators)

    def parse_file(self, path: Path, content: str | None = None) -> list[ParsedNode]:
        source = content.encode("utf-8") if content else path.read_bytes()
        tree = self.parse_source(source)

        imports = self.extract_imports(tree, source)
        classes = self.extract_classes(tree, source)
        functions = self.extract_functions(tree, source)

        module_id = self._path_to_module_id(path)
        nodes = []

        parsed_imports = [
            ParsedImport(
                module=imp["path"],
                names=imp.get("names", []),
                is_relative=False,
            )
            for imp in imports
        ]

        nodes.append(
            ParsedNode(
                id=module_id,
                name=path.stem,
                node_type=NodeType.MODULE,
                language=self.language,
                file_path=str(path),
                start_line=1,
                end_line=tree.root_node.end_point[0] + 1,
                imports=parsed_imports,
                exports=[],
            )
        )

        for cls in classes:
            node_type = cls.get("node_type", NodeType.CLASS)
            nodes.append(
                ParsedNode(
                    id=f"{module_id}.{cls['name']}",
                    name=cls["name"],
                    node_type=node_type,
                    language=self.language,
                    file_path=str(path),
                    start_line=cls["start_line"],
                    end_line=cls["end_line"],
                )
            )

        for func in functions:
            nodes.append(
                ParsedNode(
                    id=f"{module_id}.{func['name']}",
                    name=func["name"],
                    node_type=NodeType.FUNCTION,
                    language=self.language,
                    file_path=str(path),
                    start_line=func["start_line"],
                    end_line=func["end_line"],
                )
            )

        return nodes

    def resolve_import(
        self,
        import_stmt: ParsedImport,
        from_file: Path,
        project_root: Path,
    ) -> ImportResolution:
        if not self._resolver or self._resolver.project_root != project_root:
            self._resolver = JavaImportResolver(project_root)
            if self._project_context:
                self._resolver.set_context(self._project_context)
        return self._resolver.resolve(import_stmt, from_file)

    def set_project_context(self, context: ProjectContext) -> None:
        self._project_context = context
        if self._resolver:
            self._resolver.set_context(context)

    def _process_import_captures(self, captures: list, source: bytes) -> list[dict]:
        results = []
        seen = set()

        for node, capture_name in captures:
            if capture_name == "import":
                import_text = self.get_node_text(node, source)
                path = self._extract_import_path(node, source)
                if path and path not in seen:
                    seen.add(path)
                    is_static = "static" in import_text
                    is_wildcard = import_text.rstrip(";").endswith("*")
                    results.append(
                        {
                            "path": path,
                            "line": node.start_point[0] + 1,
                            "is_static": is_static,
                            "is_wildcard": is_wildcard,
                            "names": ["*"]
                            if is_wildcard
                            else [path.rsplit(".", 1)[-1]],
                        }
                    )

        return results

    def _extract_import_path(self, node, source: bytes) -> str:
        """Extract the full import path from an import_declaration node."""
        parts = []
        has_wildcard = False

        for child in node.children:
            if child.type == "scoped_identifier":
                parts.append(self._flatten_scoped_identifier(child, source))
            elif child.type == "identifier":
                parts.append(self.get_node_text(child, source))
            elif child.type == "asterisk":
                has_wildcard = True

        result = ".".join(parts)
        if has_wildcard:
            result = result + ".*" if result else "*"
        return result

    def _flatten_scoped_identifier(self, node, source: bytes) -> str:
        """Recursively flatten a scoped_identifier to a dotted path."""
        parts = []
        for child in node.children:
            if child.type == "scoped_identifier":
                parts.append(self._flatten_scoped_identifier(child, source))
            elif child.type == "identifier":
                parts.append(self.get_node_text(child, source))
        return ".".join(parts)

    def _process_class_captures(self, captures: list, source: bytes) -> list[dict]:
        results = []
        seen = set()

        for node, capture_name in captures:
            if capture_name == "name":
                name = self.get_node_text(node, source)
                if name in seen:
                    continue
                seen.add(name)

                parent = node.parent
                node_type = NodeType.CLASS
                if parent:
                    if parent.type == "interface_declaration":
                        node_type = NodeType.INTERFACE
                    elif parent.type == "enum_declaration":
                        node_type = NodeType.CLASS

                results.append(
                    {
                        "name": name,
                        "start_line": parent.start_point[0] + 1
                        if parent
                        else node.start_point[0] + 1,
                        "end_line": parent.end_point[0] + 1
                        if parent
                        else node.end_point[0] + 1,
                        "node_type": node_type,
                    }
                )

        return results

    def _process_function_captures(self, captures: list, source: bytes) -> list[dict]:
        results = []
        seen = set()

        for node, capture_name in captures:
            if capture_name == "name":
                name = self.get_node_text(node, source)
                key = f"{node.start_point[0]}:{name}"
                if key in seen:
                    continue
                seen.add(key)

                parent = node.parent
                results.append(
                    {
                        "name": name,
                        "start_line": parent.start_point[0] + 1
                        if parent
                        else node.start_point[0] + 1,
                        "end_line": parent.end_point[0] + 1
                        if parent
                        else node.end_point[0] + 1,
                    }
                )

        return results

    def _path_to_module_id(self, path: Path) -> str:
        return str(path.with_suffix("")).replace("/", ".").replace("\\", ".")
