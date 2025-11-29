from app.core.models import Language

PYTHON_EXTENSIONS = frozenset({".py", ".pyi"})

JAVASCRIPT_EXTENSIONS = frozenset({".js", ".jsx", ".mjs", ".cjs"})

TYPESCRIPT_EXTENSIONS = frozenset({".ts", ".tsx", ".mts", ".cts"})

GO_EXTENSIONS = frozenset({".go"})

JAVA_EXTENSIONS = frozenset({".java"})

RUST_EXTENSIONS = frozenset({".rs"})

SUPPORTED_EXTENSIONS = (
    PYTHON_EXTENSIONS
    | JAVASCRIPT_EXTENSIONS
    | TYPESCRIPT_EXTENSIONS
    | GO_EXTENSIONS
    | JAVA_EXTENSIONS
    | RUST_EXTENSIONS
)

EXTENSION_TO_LANGUAGE: dict[str, Language] = {
    ".py": Language.PYTHON,
    ".pyi": Language.PYTHON,
    ".js": Language.JAVASCRIPT,
    ".jsx": Language.JAVASCRIPT,
    ".mjs": Language.JAVASCRIPT,
    ".cjs": Language.JAVASCRIPT,
    ".ts": Language.TYPESCRIPT,
    ".tsx": Language.TYPESCRIPT,
    ".mts": Language.TYPESCRIPT,
    ".cts": Language.TYPESCRIPT,
    ".go": Language.GO,
    ".java": Language.JAVA,
    ".rs": Language.RUST,
}

NON_PYTHON_EXTENSIONS = SUPPORTED_EXTENSIONS - PYTHON_EXTENSIONS

# Language colors for outlines/badges (distinct, non-conflicting with status)
# Avoiding red/green (reserved for added/removed/errors)
LANGUAGE_COLORS: dict[Language, str] = {
    Language.PYTHON: "#3572A5",  # Blue
    Language.JAVASCRIPT: "#F0DB4F",  # Yellow (brighter)
    Language.TYPESCRIPT: "#007ACC",  # Distinct blue (VS Code blue)
    Language.GO: "#00ADD8",  # Cyan
    Language.JAVA: "#ED8B00",  # Orange
    Language.RUST: "#CE422B",  # Rust red-orange (ok for outline, not fill)
}

# Status colors for node fill (semantic meaning)
STATUS_COLORS = {
    "default": "#64748b",  # Slate-500 - neutral
    "hot_critical": "#ef4444",  # Red
    "hot_warning": "#f59e0b",  # Amber
    "circular": "#f97316",  # Orange
    "high_coupling": "#eab308",  # Yellow
    "added": "#10b981",  # Green
    "removed": "#ef4444",  # Red (with transparency in frontend)
}

# Default node color (neutral - status shown via fill)
DEFAULT_NODE_COLOR = "#64748b"

# Default colors for services (will be assigned dynamically)
SERVICE_COLOR_PALETTE = [
    "#6366F1",  # Indigo
    "#8B5CF6",  # Violet
    "#EC4899",  # Pink
    "#F43F5E",  # Rose
    "#F97316",  # Orange
    "#EAB308",  # Yellow
    "#22C55E",  # Green
    "#14B8A6",  # Teal
    "#06B6D4",  # Cyan
    "#0EA5E9",  # Sky
    "#3B82F6",  # Blue
    "#A855F7",  # Purple
]

THIRD_PARTY_COLOR = "#6B7280"  # Gray for third-party dependencies
