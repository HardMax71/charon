from __future__ import annotations

from pathlib import Path

from app.core import GO_EXTENSIONS
from app.core.models import Language, NodeType
from app.services.parsers.base import (
    ImportResolution,
    ParsedImport,
    ParsedNode,
    ProjectContext,
)
from app.services.parsers.go.import_resolver import GoImportResolver
from app.services.parsers.registry import ParserRegistry
from app.services.parsers.tree_sitter_base import TreeSitterParser


@ParserRegistry.register
class GoParser(TreeSitterParser):
    """Parser for Go source files."""

    language = Language.GO
    language_name = "go"
    file_extensions = tuple(GO_EXTENSIONS)

    # Tree-sitter queries for Go
    IMPORT_QUERY = """
    (import_declaration
      (import_spec
        path: (interpreted_string_literal) @path))
    (import_declaration
      (import_spec_list
        (import_spec
          path: (interpreted_string_literal) @path)))
    """

    CLASS_QUERY = """
    (type_declaration
      (type_spec
        name: (type_identifier) @name
        type: (struct_type)))
    (type_declaration
      (type_spec
        name: (type_identifier) @name
        type: (interface_type)))
    """

    FUNCTION_QUERY = """
    (function_declaration
      name: (identifier) @name)
    (method_declaration
      name: (field_identifier) @name)
    """

    def __init__(self) -> None:
        super().__init__()
        self._resolver: GoImportResolver | None = None
        self._project_context: ProjectContext | None = None

    def detect_project(self, path: Path) -> bool:
        return (path / "go.mod").exists()

    def parse_file(self, path: Path, content: str | None = None) -> list[ParsedNode]:
        source = content.encode("utf-8") if content else path.read_bytes()
        tree = self.parse_source(source)

        imports = self.extract_imports(tree, source)
        structs = self.extract_classes(tree, source)
        functions = self.extract_functions(tree, source)

        module_id = self._path_to_module_id(path)
        nodes = []

        parsed_imports = [
            ParsedImport(module=imp["path"], names=[], is_relative=False)
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

        for struct in structs:
            node_type = (
                NodeType.INTERFACE if struct.get("is_interface") else NodeType.CLASS
            )
            nodes.append(
                ParsedNode(
                    id=f"{module_id}.{struct['name']}",
                    name=struct["name"],
                    node_type=node_type,
                    language=self.language,
                    file_path=str(path),
                    start_line=struct["start_line"],
                    end_line=struct["end_line"],
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
            self._resolver = GoImportResolver(project_root)
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
            if capture_name == "path":
                # Remove quotes from string literal
                path_text = self.get_node_text(node, source).strip('"')
                if path_text in seen:
                    continue
                seen.add(path_text)
                results.append({"path": path_text, "line": node.start_point[0] + 1})

        return results

    def _process_class_captures(self, captures: list, source: bytes) -> list[dict]:
        results = []
        seen = set()

        for node, capture_name in captures:
            if capture_name == "name":
                name = self.get_node_text(node, source)
                if name in seen:
                    continue
                seen.add(name)

                # Get the type_declaration parent for line info
                parent = node.parent
                while parent and parent.type != "type_declaration":
                    parent = parent.parent

                # Check if it's an interface
                type_spec = node.parent
                is_interface = False
                if type_spec:
                    for child in type_spec.children:
                        if child.type == "interface_type":
                            is_interface = True
                            break

                results.append(
                    {
                        "name": name,
                        "start_line": parent.start_point[0] + 1
                        if parent
                        else node.start_point[0] + 1,
                        "end_line": parent.end_point[0] + 1
                        if parent
                        else node.end_point[0] + 1,
                        "is_interface": is_interface,
                    }
                )

        return results

    def _process_function_captures(self, captures: list, source: bytes) -> list[dict]:
        results = []
        seen = set()

        for node, capture_name in captures:
            if capture_name == "name":
                name = self.get_node_text(node, source)
                if name in seen:
                    continue
                seen.add(name)

                parent = node.parent
                while parent and parent.type not in (
                    "function_declaration",
                    "method_declaration",
                ):
                    parent = parent.parent

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
