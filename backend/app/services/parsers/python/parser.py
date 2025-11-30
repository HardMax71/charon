from pathlib import Path

from app.core import PYTHON_EXTENSIONS
from app.core.models import Language, NodeType
from app.services.parsers.base import ImportResolution, ParsedImport, ParsedNode
from app.services.parsers.python.import_resolver import PythonImportResolver
from app.services.parsers.registry import ParserRegistry
from app.services.parsers.tree_sitter_base import TreeSitterParser


@ParserRegistry.register
class PythonParser(TreeSitterParser):
    language = Language.PYTHON
    language_name = "python"
    file_extensions = tuple(PYTHON_EXTENSIONS)

    IMPORT_QUERY = """
    (import_statement
      name: (dotted_name) @module)
    (import_from_statement
      module_name: (dotted_name) @module)
    (import_from_statement
      module_name: (relative_import) @relative)
    """

    CLASS_QUERY = """
    (class_definition
      name: (identifier) @name)
    """

    FUNCTION_QUERY = """
    (function_definition
      name: (identifier) @name)
    """

    def __init__(self):
        super().__init__()
        self._resolver: PythonImportResolver | None = None

    def detect_project(self, path: Path) -> bool:
        indicators = ("pyproject.toml", "setup.py", "requirements.txt", "setup.cfg")
        return any((path / indicator).exists() for indicator in indicators)

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
                module=imp["module"],
                names=imp.get("names", []),
                is_relative=imp.get("is_relative", False),
                level=imp.get("level", 0),
            )
            for imp in imports
        ]

        nodes.append(
            ParsedNode(
                id=module_id,
                name=path.stem,
                node_type=NodeType.MODULE,
                language=Language.PYTHON,
                file_path=str(path),
                start_line=1,
                end_line=tree.root_node.end_point[0] + 1,
                imports=parsed_imports,
            )
        )

        for cls in classes:
            nodes.append(
                ParsedNode(
                    id=f"{module_id}.{cls['name']}",
                    name=cls["name"],
                    node_type=NodeType.CLASS,
                    language=Language.PYTHON,
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
                    language=Language.PYTHON,
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
            self._resolver = PythonImportResolver(project_root)
        return self._resolver.resolve(import_stmt, from_file)

    def set_project_modules(self, modules: set[str]):
        if self._resolver:
            self._resolver.set_project_modules(modules)

    def _process_import_captures(self, captures: list, source: bytes) -> list[dict]:
        results = []

        i = 0
        while i < len(captures):
            node, capture_name = captures[i]

            if capture_name == "module":
                module_text = self.get_node_text(node, source)
                parent = node.parent

                names = []
                if parent and parent.type == "import_from_statement":
                    for child in parent.children:
                        if child.type == "import_list":
                            for name_node in child.children:
                                if name_node.type == "dotted_name":
                                    names.append(self.get_node_text(name_node, source))
                                elif name_node.type == "aliased_import":
                                    for sub in name_node.children:
                                        if sub.type == "dotted_name":
                                            names.append(
                                                self.get_node_text(sub, source)
                                            )
                                            break

                results.append(
                    {
                        "module": module_text,
                        "names": names,
                        "is_relative": False,
                        "level": 0,
                        "line": node.start_point[0] + 1,
                    }
                )

            elif capture_name == "relative":
                parent = node.parent
                level = 0
                module_text = ""

                for child in node.children:
                    if child.type == "import_prefix":
                        level = self.get_node_text(child, source).count(".")
                    elif child.type == "dotted_name":
                        module_text = self.get_node_text(child, source)

                names = []
                if parent:
                    for child in parent.children:
                        if child.type == "import_list":
                            for name_node in child.children:
                                if name_node.type == "dotted_name":
                                    names.append(self.get_node_text(name_node, source))

                results.append(
                    {
                        "module": module_text,
                        "names": names,
                        "is_relative": True,
                        "level": level,
                        "line": node.start_point[0] + 1,
                    }
                )

            i += 1

        return results

    def _process_class_captures(self, captures: list, source: bytes) -> list[dict]:
        results = []
        for node, capture_name in captures:
            if capture_name == "name":
                parent = node.parent
                results.append(
                    {
                        "name": self.get_node_text(node, source),
                        "start_line": parent.start_point[0] + 1
                        if parent
                        else node.start_point[0] + 1,
                        "end_line": parent.end_point[0] + 1
                        if parent
                        else node.end_point[0] + 1,
                    }
                )
        return results

    def _process_function_captures(self, captures: list, source: bytes) -> list[dict]:
        results = []
        for node, capture_name in captures:
            if capture_name == "name":
                parent = node.parent
                results.append(
                    {
                        "name": self.get_node_text(node, source),
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
        parts = list(path.parts)
        if parts and parts[-1].endswith(".py"):
            parts[-1] = parts[-1][:-3]
        if parts and parts[-1] == "__init__":
            parts = parts[:-1]
        return ".".join(parts) if parts else path.stem
