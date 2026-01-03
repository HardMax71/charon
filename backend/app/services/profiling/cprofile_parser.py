import pstats
from collections import defaultdict
from pathlib import Path

from app.core.models import (
    FunctionProfile,
    ModulePerformance,
    ProfilerType,
)


class CProfileParser:
    """Parser for cProfile profiling data (.prof files).

    Uses Python's pstats module to extract function-level timing and call data.
    """

    def __init__(self, profile_path: str | Path):
        """Initialize parser with path to .prof file.

        Args:
            profile_path: Path to cProfile .prof file
        """
        self.profile_path = Path(profile_path)
        if not self.profile_path.exists():
            raise FileNotFoundError(f"Profile file not found: {profile_path}")

        stats = pstats.Stats(str(self.profile_path))
        # Use typed get_stats_profile() API (Python 3.9+) instead of untyped .stats dict
        self.stats_profile = stats.get_stats_profile()
        self.total_time = self.stats_profile.total_tt

    def parse(self) -> dict[str, ModulePerformance]:
        """Parse cProfile data and return module-level performance metrics.

        Returns:
            Dictionary mapping module paths to ModulePerformance objects
        """
        # Extract function-level data
        function_profiles = self._extract_function_profiles()

        # Aggregate by module
        module_performance = self._aggregate_by_module(function_profiles)

        return module_performance

    @staticmethod
    def _parse_ncalls(ncalls: str) -> tuple[int, int]:
        """Parse pstats ncalls string to (total_calls, primitive_calls).

        Args:
            ncalls: String like "6/1" (total/primitive) or "1" (both equal)

        Returns:
            Tuple of (total_calls, primitive_calls)
        """
        if "/" in ncalls:
            total, primitive = ncalls.split("/")
            return int(total), int(primitive)
        count = int(ncalls)
        return count, count

    def _extract_function_profiles(self) -> list[FunctionProfile]:
        """Extract function-level profiles from pstats.

        Returns:
            List of FunctionProfile objects
        """
        profiles = []

        # Iterate through typed func_profiles from get_stats_profile()
        for function_name, fp in self.stats_profile.func_profiles.items():
            filename = fp.file_name
            lineno = fp.line_number

            # Skip built-in functions and non-Python files
            if not filename.endswith(".py"):
                continue

            # Extract module path from filename
            module = self._extract_module_from_filename(filename)

            # Parse ncalls string (e.g., "6/1" -> total=6, primitive=1)
            total_calls, primitive_calls = self._parse_ncalls(fp.ncalls)

            # Calculate time percentage
            time_percentage = (
                (fp.tottime / self.total_time * 100) if self.total_time > 0 else 0
            )

            # Calculate average time per call
            avg_time = fp.tottime / total_calls if total_calls > 0 else 0

            profile = FunctionProfile(
                function_name=function_name,
                module=module,
                filename=filename,
                lineno=lineno,
                total_time=fp.tottime,
                self_time=fp.tottime,  # pstats tottime is time in function (excluding subcalls)
                cumulative_time=fp.cumtime,  # cumtime includes subcalls
                avg_time_per_call=avg_time,
                time_percentage=time_percentage,
                call_count=total_calls,
                primitive_calls=primitive_calls,
                memory_usage_mb=None,  # cProfile doesn't track memory
                memory_peak_mb=None,
            )

            profiles.append(profile)

        return profiles

    def _aggregate_by_module(
        self, function_profiles: list[FunctionProfile]
    ) -> dict[str, ModulePerformance]:
        """Aggregate function profiles by module.

        Args:
            function_profiles: List of FunctionProfile objects

        Returns:
            Dictionary mapping module paths to ModulePerformance objects
        """
        # Group functions by module
        modules: dict[str, list[FunctionProfile]] = defaultdict(list)
        for profile in function_profiles:
            # Use the filename as the module key for matching with dependency graph
            modules[profile.filename].append(profile)

        # Create ModulePerformance objects
        module_performance = {}
        for module_path, functions in modules.items():
            # Calculate aggregated metrics
            total_time = sum(f.total_time for f in functions)
            self_time = sum(f.self_time for f in functions)
            total_calls = sum(f.call_count for f in functions)

            # Calculate time percentage
            time_percentage = (
                (total_time / self.total_time * 100) if self.total_time > 0 else 0
            )

            # Classify bottleneck type (CPU-focused for cProfile)
            # Use heuristics: top 10% time consumers are potential bottlenecks
            is_cpu_bottleneck = time_percentage >= 10.0

            # Determine severity based on time percentage
            if time_percentage >= 20.0:
                severity = "critical"
            elif time_percentage >= 10.0:
                severity = "high"
            elif time_percentage >= 5.0:
                severity = "medium"
            elif time_percentage >= 1.0:
                severity = "low"
            else:
                severity = "normal"

            module_perf = ModulePerformance(
                module_path=module_path,
                total_execution_time=total_time,
                self_execution_time=self_time,
                time_percentage=time_percentage,
                total_calls=total_calls,
                unique_functions=len(functions),
                total_memory_mb=None,  # Not available in cProfile
                functions=functions,
                is_cpu_bottleneck=is_cpu_bottleneck,
                is_memory_bottleneck=False,
                is_io_bottleneck=False,
                performance_severity=severity,
            )

            module_performance[module_path] = module_perf

        return module_performance

    def _extract_module_from_filename(self, filename: str) -> str:
        """Extract module path from filename.

        Args:
            filename: Full file path

        Returns:
            Module path (e.g., 'app.services.metrics_service')
        """
        # Try to extract module path from filename
        # Example: /home/user/project/app/services/metrics_service.py
        # -> app.services.metrics_service

        path = Path(filename)

        # If it's in the current working directory structure, extract module path
        try:
            # Try to get relative path from common Python package roots
            for parent in ["app", "src", "lib"]:
                if parent in path.parts:
                    idx = path.parts.index(parent)
                    module_parts = path.parts[idx:]
                    # Remove .py extension
                    module_parts = list(module_parts[:-1]) + [
                        path.stem
                    ]  # stem removes extension
                    return ".".join(module_parts)
        except (ValueError, IndexError):
            pass

        # Fallback: use the file stem (filename without extension)
        return path.stem

    def get_profiler_type(self) -> ProfilerType:
        """Get the profiler type.

        Returns:
            ProfilerType literal
        """
        return "cprofile"

    def get_total_execution_time(self) -> float:
        """Get total execution time from profile.

        Returns:
            Total time in seconds
        """
        return self.total_time

    def get_total_samples(self) -> int | None:
        """Get total samples (N/A for deterministic profilers).

        Returns:
            None (cProfile is deterministic, not sampling-based)
        """
        return None
