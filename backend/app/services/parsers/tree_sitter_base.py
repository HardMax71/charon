from abc import abstractmethod
from pathlib import Path

from tree_sitter import Query, QueryCursor
from tree_sitter_language_pack import get_language, get_parser

from app.services.parsers.base import BaseParser, ParsedNode


class TreeSitterParser(BaseParser):
    language_name: str
    IMPORT_QUERY: str = ""
    CLASS_QUERY: str = ""
    FUNCTION_QUERY: str = ""

    def __init__(self):
        self.ts_language = get_language(self.language_name)
        self.parser = get_parser(self.language_name)
        self._import_query = None
        self._class_query = None
        self._function_query = None
        self._compile_queries()

    def _compile_queries(self):
        if self.IMPORT_QUERY:
            self._import_query = Query(self.ts_language, self.IMPORT_QUERY)
        if self.CLASS_QUERY:
            self._class_query = Query(self.ts_language, self.CLASS_QUERY)
        if self.FUNCTION_QUERY:
            self._function_query = Query(self.ts_language, self.FUNCTION_QUERY)

    def _run_query(self, query: Query, node) -> list[tuple]:
        """Run a query and return captures in the legacy format (node, capture_name)."""
        cursor = QueryCursor(query)
        captures = []
        for _pattern_idx, capture_dict in cursor.matches(node):
            for capture_name, nodes in capture_dict.items():
                for captured_node in nodes:
                    captures.append((captured_node, capture_name))
        return captures

    def parse_source(self, source: bytes):
        return self.parser.parse(source)

    def parse_file_tree(self, path: Path, content: str | None = None):
        if content is not None:
            source = content.encode("utf-8")
        else:
            source = path.read_bytes()
        return self.parse_source(source)

    def extract_imports(self, tree, source: bytes) -> list[dict]:
        if not self._import_query:
            return []
        captures = self._run_query(self._import_query, tree.root_node)
        return self._process_import_captures(captures, source)

    def extract_classes(self, tree, source: bytes) -> list[dict]:
        if not self._class_query:
            return []
        captures = self._run_query(self._class_query, tree.root_node)
        return self._process_class_captures(captures, source)

    def extract_functions(self, tree, source: bytes) -> list[dict]:
        if not self._function_query:
            return []
        captures = self._run_query(self._function_query, tree.root_node)
        return self._process_function_captures(captures, source)

    def get_node_text(self, node, source: bytes) -> str:
        return source[node.start_byte:node.end_byte].decode("utf-8")

    @abstractmethod
    def _process_import_captures(self, captures: list, source: bytes) -> list[dict]:
        pass

    @abstractmethod
    def _process_class_captures(self, captures: list, source: bytes) -> list[dict]:
        pass

    @abstractmethod
    def _process_function_captures(self, captures: list, source: bytes) -> list[dict]:
        pass
