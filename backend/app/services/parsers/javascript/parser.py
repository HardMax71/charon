from pathlib import Path

from tree_sitter import Query

from app.core import JAVASCRIPT_EXTENSIONS, TYPESCRIPT_EXTENSIONS
from app.core.models import Language, NodeType
from app.services.parsers.base import (
    ImportResolution,
    ParsedImport,
    ParsedNode,
    ProjectContext,
)
from app.services.parsers.javascript.import_resolver import JavaScriptImportResolver
from app.services.parsers.registry import ParserRegistry
from app.services.parsers.tree_sitter_base import TreeSitterParser


class BaseJavaScriptParser(TreeSitterParser):
    IMPORT_QUERY = """
    (import_statement
      source: (string) @source)
    (export_statement
      source: (string) @source)
    (call_expression
      function: (identifier) @func (#eq? @func "require")
      arguments: (arguments (string) @source))
    (call_expression
      function: (import)
      arguments: (arguments (string) @source))
    """

    CLASS_QUERY = """
    (class_declaration
      name: (identifier) @name)
    (class
      name: (identifier) @name)
    """

    FUNCTION_QUERY = """
    (function_declaration
      name: (identifier) @name)
    (lexical_declaration
      (variable_declarator
        name: (identifier) @name
        value: (arrow_function)))
    (variable_declaration
      (variable_declarator
        name: (identifier) @name
        value: (arrow_function)))
    """

    EXPORT_QUERY = """
    (export_statement
      declaration: (lexical_declaration
        (variable_declarator name: (identifier) @export_name)))
    (export_statement
      declaration: (function_declaration name: (identifier) @export_name))
    (export_statement
      declaration: (class_declaration name: (identifier) @export_name))
    (export_statement
      (export_clause (export_specifier name: (identifier) @export_name)))
    """

    def __init__(self):
        super().__init__()
        self._resolver: JavaScriptImportResolver | None = None
        self._export_query = None
        self._project_context: ProjectContext | None = None
        if self.EXPORT_QUERY:
            self._export_query = Query(self.ts_language, self.EXPORT_QUERY)

    def detect_project(self, path: Path) -> bool:
        indicators = ("package.json", "node_modules")
        return any((path / indicator).exists() for indicator in indicators)

    def parse_file(self, path: Path, content: str | None = None) -> list[ParsedNode]:
        source = content.encode("utf-8") if content else path.read_bytes()
        tree = self.parse_source(source)

        imports = self.extract_imports(tree, source)
        classes = self.extract_classes(tree, source)
        functions = self.extract_functions(tree, source)
        exports = self._extract_exports(tree, source)

        module_id = self._path_to_module_id(path)
        nodes = []

        parsed_imports = [
            ParsedImport(
                module=imp["source"],
                names=imp.get("names", []),
                is_relative=imp["source"].startswith("."),
            )
            for imp in imports
        ]

        nodes.append(
            ParsedNode(
                id=module_id,
                name=path.stem,
                node_type=self._determine_node_type(path, source),
                language=self.language,
                file_path=str(path),
                start_line=1,
                end_line=tree.root_node.end_point[0] + 1,
                imports=parsed_imports,
                exports=exports,
            )
        )

        for cls in classes:
            nodes.append(
                ParsedNode(
                    id=f"{module_id}.{cls['name']}",
                    name=cls["name"],
                    node_type=NodeType.CLASS,
                    language=self.language,
                    file_path=str(path),
                    start_line=cls["start_line"],
                    end_line=cls["end_line"],
                )
            )

        for func in functions:
            node_type = (
                NodeType.HOOK if func["name"].startswith("use") else NodeType.FUNCTION
            )
            nodes.append(
                ParsedNode(
                    id=f"{module_id}.{func['name']}",
                    name=func["name"],
                    node_type=node_type,
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
            self._resolver = JavaScriptImportResolver(
                project_root,
                context=self._project_context,
            )
        return self._resolver.resolve(import_stmt, from_file)

    def set_project_context(self, context: ProjectContext) -> None:
        self._project_context = context
        if self._resolver:
            self._resolver.set_context(context)

    def _process_import_captures(self, captures: list, source: bytes) -> list[dict]:
        results = []
        seen_sources = set()

        for node, capture_name in captures:
            if capture_name == "source":
                source_text = self.get_node_text(node, source).strip("'\"")

                if source_text in seen_sources:
                    continue
                seen_sources.add(source_text)

                results.append(
                    {
                        "source": source_text,
                        "line": node.start_point[0] + 1,
                        "is_dynamic": node.parent
                        and node.parent.type == "call_expression",
                    }
                )

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
        seen_names = set()

        for node, capture_name in captures:
            if capture_name == "name":
                name = self.get_node_text(node, source)
                if name in seen_names:
                    continue
                seen_names.add(name)

                parent = node.parent
                while parent and parent.type in (
                    "variable_declarator",
                    "lexical_declaration",
                    "variable_declaration",
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

    def _extract_exports(self, tree, source: bytes) -> list[str]:
        if not self._export_query:
            return []

        captures = self._run_query(self._export_query, tree.root_node)
        exports = []
        seen = set()

        for node, capture_name in captures:
            if capture_name == "export_name":
                name = self.get_node_text(node, source)
                if name not in seen:
                    seen.add(name)
                    exports.append(name)

        return exports

    def _determine_node_type(self, path: Path, source: bytes) -> NodeType:
        name = path.stem.lower()
        content = source.decode("utf-8", errors="ignore")

        if (
            name.startswith("use")
            or "export function use" in content
            or "export const use" in content
        ):
            return NodeType.HOOK

        jsx_indicators = ("<", "React", "jsx", "tsx", "return (")
        if path.suffix in (".jsx", ".tsx") or any(
            ind in content for ind in jsx_indicators
        ):
            if "export default" in content or "export function" in content:
                return NodeType.COMPONENT

        return NodeType.MODULE

    def _path_to_module_id(self, path: Path) -> str:
        name = path.stem
        if name == "index":
            return str(path.parent).replace("/", ".").replace("\\", ".")
        return str(path.with_suffix("")).replace("/", ".").replace("\\", ".")


@ParserRegistry.register
class JavaScriptParser(BaseJavaScriptParser):
    language = Language.JAVASCRIPT
    language_name = "javascript"
    file_extensions = tuple(JAVASCRIPT_EXTENSIONS)


@ParserRegistry.register
class TypeScriptParser(BaseJavaScriptParser):
    language = Language.TYPESCRIPT
    language_name = "typescript"
    file_extensions = tuple(TYPESCRIPT_EXTENSIONS)

    IMPORT_QUERY = """
    (import_statement
      source: (string) @source)
    (export_statement
      source: (string) @source)
    (call_expression
      function: (identifier) @func (#eq? @func "require")
      arguments: (arguments (string) @source))
    (call_expression
      function: (import)
      arguments: (arguments (string) @source))
    """

    CLASS_QUERY = """
    (class_declaration
      name: (type_identifier) @name)
    (class
      name: (type_identifier) @name)
    """

    # TypeScript uses type_identifier for class names in exports
    EXPORT_QUERY = """
    (export_statement
      declaration: (lexical_declaration
        (variable_declarator name: (identifier) @export_name)))
    (export_statement
      declaration: (function_declaration name: (identifier) @export_name))
    (export_statement
      declaration: (class_declaration name: (type_identifier) @export_name))
    (export_statement
      (export_clause (export_specifier name: (identifier) @export_name)))
    """

    def detect_project(self, path: Path) -> bool:
        indicators = ("tsconfig.json", "package.json")
        return any((path / indicator).exists() for indicator in indicators)
