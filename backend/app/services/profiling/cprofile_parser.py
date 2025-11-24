import pstats
from collections import defaultdict
from pathlib import Path

from app.core.parsing_models import (
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

        self.stats = pstats.Stats(str(self.profile_path))
        # Calculate total execution time by summing all function times
        # Each stat entry: (filename, lineno, func) -> (cc, nc, tt, ct, callers)
        # tt = total time in function (excluding subcalls)
        self.total_time = sum(stat[2] for stat in self.stats.stats.values())  # type: ignore[attr-defined]

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

    def _extract_function_profiles(self) -> list[FunctionProfile]:
        """Extract function-level profiles from pstats.

        Returns:
            List of FunctionProfile objects
        """
        profiles = []

        # Iterate through all function statistics
        # Format: (filename, lineno, function_name) -> (cc, nc, tt, ct, callers)
        # cc = primitive call count, nc = total call count
        # tt = total time, ct = cumulative time
        for func, (cc, nc, tt, ct, callers) in self.stats.stats.items():  # type: ignore[attr-defined]
            filename, lineno, function_name = func

            # Skip built-in functions and non-Python files
            if not filename.endswith(".py"):
                continue

            # Extract module path from filename
            module = self._extract_module_from_filename(filename)

            # Calculate time percentage
            time_percentage = (tt / self.total_time * 100) if self.total_time > 0 else 0

            # Calculate average time per call
            avg_time = tt / nc if nc > 0 else 0

            profile = FunctionProfile(
                function_name=function_name,
                module=module,
                filename=filename,
                lineno=lineno,
                total_time=tt,
                self_time=tt,  # pstats 'tt' is time in function (excluding subcalls)
                cumulative_time=ct,  # pstats 'ct' includes subcalls
                avg_time_per_call=avg_time,
                time_percentage=time_percentage,
                call_count=nc,
                primitive_calls=cc,
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
