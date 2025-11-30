import sys
from functools import lru_cache

from app.core import get_logger
from app.core.parsing_models import ImportInfo, ImportType

logger = get_logger(__name__)

# Use Python's built-in stdlib module names (available since Python 3.10)
_STDLIB_MODULES: frozenset[str] = frozenset(sys.stdlib_module_names)


def is_standard_library(module_name: str) -> bool:
    """Check if a module is part of the Python standard library."""
    if not module_name:
        return False

    top_level = module_name.split(".")[0]
    return top_level in _STDLIB_MODULES


def extract_top_level_module(module_path: str) -> str:
    """Extract the top-level module from a module path."""
    return module_path.split(".")[0] if module_path else module_path


class ImportResolver:
    """Stateful import resolver with caching for better performance.

    This class consolidates all import resolution strategies and provides
    caching to avoid repeated string operations and lookups.

    Usage:
        resolver = ImportResolver(project_modules)
        import_type, resolved = resolver.classify(import_info, current_module)
    """

    def __init__(self, project_modules: set[str]):
        """
        Initialize resolver with project modules.

        Args:
            project_modules: Set of all module paths in the project
        """
        self.project_modules = project_modules
        self._cache: dict[tuple[str, str, int], tuple[ImportType, str]] = {}
        logger.debug(
            "ImportResolver initialized with %d project modules", len(project_modules)
        )

    def classify(
        self, import_info: ImportInfo, current_module: str
    ) -> tuple[ImportType, str]:
        """
        Classify import with caching for performance.

        Args:
            import_info: Import information
            current_module: Current module path

        Returns:
            Tuple of (import_type, resolved_module)
        """
        cache_key = (import_info.module, current_module, import_info.level)

        if cache_key in self._cache:
            return self._cache[cache_key]

        result = self._classify_uncached(import_info, current_module)
        self._cache[cache_key] = result
        return result

    def _classify_uncached(
        self, import_info: ImportInfo, current_module: str
    ) -> tuple[ImportType, str]:
        """Classify import without caching."""
        resolved = self._resolve_relative(import_info, current_module)

        if self._is_stdlib(resolved):
            return "stdlib", resolved

        internal = self._find_internal(resolved, current_module)
        if internal:
            return "internal", internal

        return "third_party", resolved

    def _resolve_relative(self, import_info: ImportInfo, current_module: str) -> str:
        """Resolve relative import to absolute module path."""
        if import_info.level == 0:
            return import_info.module

        parts = current_module.split(".")
        if import_info.level > len(parts):
            logger.warning(
                "Invalid relative import level %d in %s",
                import_info.level,
                current_module,
            )
            return import_info.module

        base = parts[: -import_info.level] if import_info.level > 0 else parts
        if import_info.module:
            base.append(import_info.module)

        return ".".join(base)

    @lru_cache(maxsize=512)
    def _is_stdlib(self, module: str) -> bool:
        """Check if module is stdlib (cached)."""
        return is_standard_library(module)

    def _find_internal(self, resolved: str, current_module: str) -> str | None:
        """
        Find internal module using all resolution strategies.

        Strategies (in order):
        1. Exact match
        2. Resolved is parent of project modules
        3. Project module is parent of resolved
        4. Context-aware resolution
        """
        if resolved in self.project_modules:
            return resolved

        if any(pm.startswith(resolved + ".") for pm in self.project_modules):
            return resolved

        for pm in self.project_modules:
            if resolved.startswith(pm + "."):
                return pm

        parts = current_module.split(".")
        for depth in range(1, len(parts)):
            parent = ".".join(parts[:depth])
            candidate = f"{parent}.{resolved}"

            if candidate in self.project_modules:
                return candidate

            if any(pm.startswith(candidate + ".") for pm in self.project_modules):
                return candidate

        return None

    def clear_cache(self) -> None:
        """Clear the classification cache."""
        self._cache.clear()
        logger.debug("ImportResolver cache cleared")

    def get_cache_stats(self) -> dict[str, int]:
        """Get cache statistics."""
        return {
            "cache_size": len(self._cache),
            "project_modules": len(self.project_modules),
        }
