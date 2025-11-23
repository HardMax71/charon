from typing import Literal

from pydantic import BaseModel, Field, ConfigDict


class ImportInfo(BaseModel):
    """Information about a single import statement.

    Replaces the NamedTuple version with Pydantic for validation.
    """

    module: str = Field(description="The module being imported from")
    names: list[str] = Field(description="The names being imported")
    level: int = Field(ge=0, description="Relative import level (0 for absolute)")
    lineno: int = Field(ge=1, description="Line number in source")

    model_config = ConfigDict(frozen=True)  # Immutable like NamedTuple


class ParseResult(BaseModel):
    """Result from parsing a Python file.

    Replaces tuple[list[ImportInfo], list[str]] with clearer semantics.
    """

    imports: list[ImportInfo] = Field(default_factory=list, description="Extracted imports")
    errors: list[str] = Field(default_factory=list, description="Parse errors")

    @property
    def is_valid(self) -> bool:
        """Check if parsing was successful (no errors)."""
        return len(self.errors) == 0

    @property
    def import_count(self) -> int:
        """Get number of imports found."""
        return len(self.imports)


class FunctionComplexity(BaseModel):
    """Complexity metrics for a single function or method."""

    name: str = Field(description="Function/method name")
    complexity: int = Field(ge=0, description="Cyclomatic complexity")
    rank: str = Field(description="Complexity rank (A-F)")
    lineno: int = Field(ge=1, description="Line number")
    col_offset: int = Field(ge=0, description="Column offset")


class ComplexityMetrics(BaseModel):
    """Code complexity metrics for a file.

    Replaces plain dict returns from ComplexityService.
    """

    cyclomatic_complexity: float = Field(ge=0, description="Average cyclomatic complexity")
    max_complexity: int = Field(ge=0, description="Highest complexity in file")
    maintainability_index: float = Field(ge=0, le=100, description="MI score (0-100)")
    lines_of_code: int = Field(ge=0, description="Total lines of code")
    logical_lines: int = Field(ge=0, description="Logical lines of code")
    source_lines: int = Field(ge=0, description="Source lines of code")
    comments: int = Field(ge=0, description="Comment lines")
    complexity_grade: str = Field(description="Overall complexity grade (A-F)")
    maintainability_grade: str = Field(description="Maintainability grade (A-F)")
    functions: list[FunctionComplexity] = Field(default_factory=list, description="Function-level metrics")
    function_count: int = Field(ge=0, description="Number of functions/methods")
    error: str | None = Field(default=None, description="Error message if analysis failed")


class DependencyAnalysis(BaseModel):
    """Complete dependency analysis result.

    Replaces DependencyData plain class with validated Pydantic model.
    """

    modules: dict[str, str] = Field(
        default_factory=dict,
        description="Module path -> file content"
    )
    imports: dict[str, list[ImportInfo]] = Field(
        default_factory=dict,
        description="Module path -> list of imports"
    )
    dependencies: dict[str, set[str]] = Field(
        default_factory=dict,
        description="From module -> set of to modules"
    )
    import_details: dict[tuple[str, str], list[str]] = Field(
        default_factory=dict,
        description="(from, to) -> list of imported names"
    )
    complexity: dict[str, ComplexityMetrics] = Field(
        default_factory=dict,
        description="Module path -> complexity metrics"
    )
    errors: list[str] = Field(
        default_factory=list,
        description="All errors encountered during analysis"
    )

    model_config = ConfigDict(
        arbitrary_types_allowed=True  # Allow set in dependencies field
    )

    @property
    def module_count(self) -> int:
        """Get number of modules analyzed."""
        return len(self.modules)

    @property
    def has_errors(self) -> bool:
        """Check if analysis encountered errors."""
        return len(self.errors) > 0

    @property
    def total_imports(self) -> int:
        """Get total number of imports across all modules."""
        return sum(len(imports) for imports in self.imports.values())


ImportType = Literal["internal", "third_party", "stdlib"]
