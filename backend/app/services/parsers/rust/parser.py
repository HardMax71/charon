from __future__ import annotations

from pathlib import Path

from tree_sitter import Query

from app.core import RUST_EXTENSIONS
from app.core.models import Language, NodeType
from app.services.parsers.base import (
    ImportResolution,
    ParsedImport,
    ParsedNode,
    ProjectContext,
)
from app.services.parsers.registry import ParserRegistry
from app.services.parsers.rust.import_resolver import RustImportResolver
from app.services.parsers.tree_sitter_base import TreeSitterParser


@ParserRegistry.register
class RustParser(TreeSitterParser):
    """Parser for Rust source files."""

    language = Language.RUST
    language_name = "rust"
    file_extensions = tuple(RUST_EXTENSIONS)

    # Use declarations (actual imports)
    USE_QUERY = """
    (use_declaration) @use
    """

    # Module declarations (file references, not imports)
    MODULE_DECL_QUERY = """
    (mod_item
      name: (identifier) @mod_name)
    """

    CLASS_QUERY = """
    (struct_item
      name: (type_identifier) @name)
    (enum_item
      name: (type_identifier) @name)
    (trait_item
      name: (type_identifier) @name)
    (impl_item
      type: (type_identifier) @name)
    """

    FUNCTION_QUERY = """
    (function_item
      name: (identifier) @name)
    """

    def __init__(self) -> None:
        super().__init__()
        self._resolver: RustImportResolver | None = None
        self._project_context: ProjectContext | None = None
        # Compile separate queries for use declarations and module declarations
        self._use_query: Query | None = None
        self._module_decl_query: Query | None = None
        if self.USE_QUERY:
            self._use_query = Query(self.ts_language, self.USE_QUERY)
        if self.MODULE_DECL_QUERY:
            self._module_decl_query = Query(self.ts_language, self.MODULE_DECL_QUERY)

    def detect_project(self, path: Path) -> bool:
        return (path / "Cargo.toml").exists()

    def extract_imports(self, tree, source: bytes) -> list[dict]:
        """Extract both use declarations and module declarations."""
        results = []

        # Extract use declarations (actual imports)
        if self._use_query:
            use_captures = self._run_query(self._use_query, tree.root_node)
            results.extend(self._process_use_captures(use_captures, source))

        # Extract module declarations (file references)
        if self._module_decl_query:
            mod_captures = self._run_query(self._module_decl_query, tree.root_node)
            results.extend(self._process_module_decl_captures(mod_captures, source))

        return results

    def parse_file(self, path: Path, content: str | None = None) -> list[ParsedNode]:
        source = content.encode("utf-8") if content else path.read_bytes()
        tree = self.parse_source(source)

        imports = self.extract_imports(tree, source)
        types = self.extract_classes(tree, source)
        functions = self.extract_functions(tree, source)

        module_id = self._path_to_module_id(path)
        nodes = []

        parsed_imports = [
            ParsedImport(
                module=imp["path"],
                names=imp.get("names", []),
                is_relative=imp.get("is_relative", False),
            )
            for imp in imports
            if imp.get("type") == "use"
        ]

        # Add mod declarations as imports too (they reference other modules)
        for imp in imports:
            if imp.get("type") == "mod":
                parsed_imports.append(
                    ParsedImport(
                        module=imp["path"],
                        names=[],
                        is_relative=True,
                    )
                )

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

        for type_def in types:
            nodes.append(
                ParsedNode(
                    id=f"{module_id}::{type_def['name']}",
                    name=type_def["name"],
                    node_type=type_def.get("node_type", NodeType.CLASS),
                    language=self.language,
                    file_path=str(path),
                    start_line=type_def["start_line"],
                    end_line=type_def["end_line"],
                )
            )

        for func in functions:
            nodes.append(
                ParsedNode(
                    id=f"{module_id}::{func['name']}",
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
            self._resolver = RustImportResolver(project_root)
            if self._project_context:
                self._resolver.set_context(self._project_context)
        return self._resolver.resolve(import_stmt, from_file)

    def set_project_context(self, context: ProjectContext) -> None:
        self._project_context = context
        if self._resolver:
            self._resolver.set_context(context)

    def _process_import_captures(self, captures: list, source: bytes) -> list[dict]:
        """Not used - see _process_use_captures and _process_module_decl_captures."""
        return []

    def _process_use_captures(self, captures: list, source: bytes) -> list[dict]:
        """Process use declaration captures."""
        results = []
        seen: set[str] = set()

        for node, capture_name in captures:
            if capture_name == "use":
                path = self._extract_use_path(node, source)
                if path and path not in seen:
                    seen.add(path)
                    is_relative = path.startswith(("super::", "self::", "crate::"))
                    results.append(
                        {
                            "type": "use",
                            "path": path,
                            "line": node.start_point[0] + 1,
                            "is_relative": is_relative,
                        }
                    )

        return results

    def _process_module_decl_captures(
        self, captures: list, source: bytes
    ) -> list[dict]:
        """Process module declaration captures (mod foo;)."""
        results = []
        seen: set[str] = set()

        for node, capture_name in captures:
            if capture_name == "mod_name":
                mod_name = self.get_node_text(node, source)
                parent = node.parent
                if parent and parent.type == "mod_item":
                    # Only include mod declarations without body (mod foo;)
                    # Exclude mod blocks (mod foo { ... })
                    has_body = any(
                        c.type == "declaration_list" for c in parent.children
                    )
                    if not has_body and mod_name not in seen:
                        seen.add(mod_name)
                        results.append(
                            {
                                "type": "mod",
                                "path": mod_name,
                                "line": node.start_point[0] + 1,
                                "is_relative": True,
                            }
                        )

        return results

    def _extract_use_path(self, node, source: bytes) -> str:
        """Extract the use path from a use_declaration node."""
        for child in node.children:
            if child.type == "scoped_identifier":
                return self._flatten_scoped_identifier(child, source)
            elif child.type == "identifier":
                return self.get_node_text(child, source)
            elif child.type == "scoped_use_list":
                # Handle use path::{a, b, c}
                base = self._get_use_base(child, source)
                return base
            elif child.type == "use_wildcard":
                # Handle use path::*
                return self._get_use_base(child, source)
        return ""

    def _get_use_base(self, node, source: bytes) -> str:
        """Get the base path from a scoped_use_list or use_wildcard."""
        for child in node.children:
            if child.type == "scoped_identifier":
                return self._flatten_scoped_identifier(child, source)
            elif child.type == "identifier":
                return self.get_node_text(child, source)
        return ""

    def _flatten_scoped_identifier(self, node, source: bytes) -> str:
        """Recursively flatten a scoped_identifier to a :: path."""
        parts = []
        for child in node.children:
            if child.type == "scoped_identifier":
                parts.append(self._flatten_scoped_identifier(child, source))
            elif child.type == "identifier":
                parts.append(self.get_node_text(child, source))
            elif child.type in ("crate", "super", "self"):
                parts.append(self.get_node_text(child, source))
            elif child.type == "type_identifier":
                parts.append(self.get_node_text(child, source))
        return "::".join(parts)

    def _process_class_captures(self, captures: list, source: bytes) -> list[dict]:
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
                node_type = NodeType.CLASS

                if parent:
                    if parent.type == "trait_item":
                        node_type = NodeType.INTERFACE
                    elif parent.type == "enum_item":
                        node_type = NodeType.CLASS
                    elif parent.type == "impl_item":
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
        name = path.stem
        if name in ("mod", "lib", "main"):
            return str(path.parent).replace("/", "::").replace("\\", "::")
        return str(path.with_suffix("")).replace("/", "::").replace("\\", "::")
