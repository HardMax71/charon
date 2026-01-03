import json
from collections import defaultdict
from pathlib import Path

from app.core.models import (
    FunctionProfile,
    ModulePerformance,
    ProfilerType,
)


class PySpyParser:
    """Parser for py-spy profiling data (speedscope JSON format).

    Parses sampling-based profiling data from py-spy and reconstructs
    function-level timing information.
    """

    def __init__(self, profile_path: str | Path):
        """Initialize parser with path to speedscope JSON file.

        Args:
            profile_path: Path to py-spy speedscope JSON file
        """
        self.profile_path = Path(profile_path)
        if not self.profile_path.exists():
            raise FileNotFoundError(f"Profile file not found: {profile_path}")

        with open(self.profile_path, "r") as f:
            self.data = json.load(f)

        # Extract frames and samples
        self.frames = self.data.get("shared", {}).get("frames", [])
        self.profiles = self.data.get("profiles", [])

        # Calculate total time from first profile
        if self.profiles:
            profile = self.profiles[0]
            self.total_time = profile.get("endValue", 0) - profile.get("startValue", 0)
            self.samples = profile.get("samples", [])
            self.weights = profile.get("weights", [])
            self.total_samples = len(self.samples)
        else:
            self.total_time = 0
            self.samples = []
            self.weights = []
            self.total_samples = 0

    def parse(self) -> dict[str, ModulePerformance]:
        """Parse py-spy data and return module-level performance metrics.

        Returns:
            Dictionary mapping module paths to ModulePerformance objects
        """
        # Extract function-level data
        function_profiles = self._extract_function_profiles()

        # Aggregate by module
        module_performance = self._aggregate_by_module(function_profiles)

        return module_performance

    def _extract_function_profiles(self) -> list[FunctionProfile]:
        """Extract function-level profiles from speedscope samples.

        Returns:
            List of FunctionProfile objects
        """
        # Count appearances of each frame in samples (weighted by time)
        frame_time = defaultdict(float)
        frame_self_time = defaultdict(float)
        frame_count = defaultdict(int)

        # Process each sample
        for sample_idx, sample in enumerate(self.samples):
            weight = self.weights[sample_idx] if sample_idx < len(self.weights) else 0

            # Process stack from bottom to top
            for depth, frame_idx in enumerate(sample):
                if frame_idx >= len(self.frames):
                    continue

                # Add time for this frame appearing in the stack
                frame_time[frame_idx] += weight
                frame_count[frame_idx] += 1

                # Self time: only the leaf (top of stack)
                if depth == len(sample) - 1:
                    frame_self_time[frame_idx] += weight

        # Create FunctionProfile for each frame
        profiles = []
        for frame_idx, total_time in frame_time.items():
            if frame_idx >= len(self.frames):
                continue

            frame = self.frames[frame_idx]
            filename = frame.get("file", "")

            # Skip non-Python files
            if not filename.endswith(".py"):
                continue

            function_name = frame.get("name", "<unknown>")
            lineno = frame.get("line", 0) or 1
            self_time = frame_self_time.get(frame_idx, 0)
            count = frame_count.get(frame_idx, 0)

            # Extract module from filename
            module = self._extract_module_from_filename(filename)

            # Calculate percentages
            time_percentage = (
                (total_time / self.total_time * 100) if self.total_time > 0 else 0
            )
            avg_time = total_time / count if count > 0 else 0

            profile = FunctionProfile(
                function_name=function_name,
                module=module,
                filename=filename,
                lineno=lineno,
                total_time=total_time,
                self_time=self_time,
                cumulative_time=total_time,  # For sampling, total ≈ cumulative
                avg_time_per_call=avg_time,
                time_percentage=time_percentage,
                call_count=count,
                primitive_calls=count,  # Can't distinguish in sampling
                memory_usage_mb=None,  # Not in standard py-spy output
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
        # Group functions by module (using filename as key)
        modules: dict[str, list[FunctionProfile]] = defaultdict(list)
        for profile in function_profiles:
            modules[profile.filename].append(profile)

        # Create ModulePerformance objects
        module_performance = {}
        for module_path, functions in modules.items():
            # Calculate aggregated metrics
            # For sampling profilers: use max total_time (most expensive function)
            # since total_time includes callees and would be double-counted if summed
            total_time = max((f.total_time for f in functions), default=0)
            self_time = sum(f.self_time for f in functions)
            total_calls = sum(f.call_count for f in functions)

            # Calculate time percentage
            time_percentage = (
                (total_time / self.total_time * 100) if self.total_time > 0 else 0
            )

            # Classify bottleneck type (CPU-focused for py-spy)
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
                total_memory_mb=None,  # Not available in standard py-spy
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
        # Same logic as cProfile parser
        path = Path(filename)

        try:
            for parent in ["app", "src", "lib"]:
                if parent in path.parts:
                    idx = path.parts.index(parent)
                    module_parts = path.parts[idx:]
                    module_parts = list(module_parts[:-1]) + [path.stem]
                    return ".".join(module_parts)
        except (ValueError, IndexError):
            pass

        return path.stem

    def get_profiler_type(self) -> ProfilerType:
        """Get the profiler type.

        Returns:
            ProfilerType literal
        """
        return "pyspy"

    def get_total_execution_time(self) -> float:
        """Get total execution time from profile.

        Returns:
            Total time in seconds
        """
        return self.total_time

    def get_total_samples(self) -> int | None:
        """Get total number of samples.

        Returns:
            Number of samples collected
        """
        return self.total_samples
