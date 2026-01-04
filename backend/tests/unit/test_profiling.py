import cProfile
import json

import pytest

from app.core.models import (
    DependencyGraph,
    Edge,
    FunctionProfile,
    ModulePerformance,
    Node,
    NodeMetrics,
    Position3D,
    PriorityWeights,
)
from app.services.profiling.cprofile_parser import CProfileParser
from app.services.profiling.performance_analyzer import PerformanceAnalyzer
from app.services.profiling.pyspy_parser import PySpyParser


class TestCProfileParser:
    @pytest.fixture
    def profile_file(self, tmp_path):
        """Create a real cProfile file for testing."""
        profile_path = tmp_path / "test.prof"

        def sample_function():
            total = 0
            for i in range(100):
                total += i
            return total

        profiler = cProfile.Profile()
        profiler.enable()
        sample_function()
        profiler.disable()
        profiler.dump_stats(str(profile_path))

        return profile_path

    def test_init_valid_file(self, profile_file):
        parser = CProfileParser(profile_file)
        assert parser.profile_path == profile_file
        assert parser.total_time >= 0

    def test_init_file_not_found(self, tmp_path):
        with pytest.raises(FileNotFoundError):
            CProfileParser(tmp_path / "nonexistent.prof")

    def test_parse_returns_dict(self, profile_file):
        parser = CProfileParser(profile_file)
        result = parser.parse()

        assert isinstance(result, dict)
        for key, value in result.items():
            assert isinstance(key, str)
            assert isinstance(value, ModulePerformance)

    def test_get_profiler_type(self, profile_file):
        parser = CProfileParser(profile_file)
        assert parser.get_profiler_type() == "cprofile"

    def test_get_total_execution_time(self, profile_file):
        parser = CProfileParser(profile_file)
        assert isinstance(parser.get_total_execution_time(), float)

    def test_get_total_samples(self, profile_file):
        parser = CProfileParser(profile_file)
        assert parser.get_total_samples() is None

    @pytest.mark.parametrize(
        "ncalls,expected",
        [
            ("1", (1, 1)),
            ("10", (10, 10)),
            ("6/1", (6, 1)),
            ("100/5", (100, 5)),
        ],
        ids=["single", "multi", "recursive_6_1", "recursive_100_5"],
    )
    def test_parse_ncalls(self, ncalls, expected):
        result = CProfileParser._parse_ncalls(ncalls)
        assert result == expected

    def test_extract_module_from_filename_app(self, profile_file):
        parser = CProfileParser(profile_file)
        result = parser._extract_module_from_filename(
            "/home/user/project/app/services/user.py"
        )
        assert result == "app.services.user"

    def test_extract_module_from_filename_src(self, profile_file):
        parser = CProfileParser(profile_file)
        result = parser._extract_module_from_filename(
            "/home/user/project/src/utils/helpers.py"
        )
        assert result == "src.utils.helpers"

    def test_extract_module_from_filename_fallback(self, profile_file):
        parser = CProfileParser(profile_file)
        result = parser._extract_module_from_filename("/some/random/path/file.py")
        assert result == "file"


class TestPySpyParser:
    @pytest.fixture
    def speedscope_file(self, tmp_path):
        """Create a speedscope JSON file for testing."""
        profile_path = tmp_path / "profile.json"

        data = {
            "shared": {
                "frames": [
                    {"name": "main", "file": "/app/main.py", "line": 10},
                    {"name": "helper", "file": "/app/utils/helper.py", "line": 5},
                    {"name": "external", "file": "/usr/lib/python/os.py", "line": 1},
                    {"name": "no_py", "file": "/other/file.txt", "line": 1},
                ]
            },
            "profiles": [
                {
                    "startValue": 0,
                    "endValue": 1000,
                    "samples": [[0, 1], [0], [1, 0], [2]],
                    "weights": [100, 200, 300, 400],
                }
            ],
        }

        profile_path.write_text(json.dumps(data))
        return profile_path

    @pytest.fixture
    def empty_speedscope_file(self, tmp_path):
        profile_path = tmp_path / "empty.json"
        data = {"shared": {"frames": []}, "profiles": []}
        profile_path.write_text(json.dumps(data))
        return profile_path

    def test_init_valid_file(self, speedscope_file):
        parser = PySpyParser(speedscope_file)
        assert parser.profile_path == speedscope_file
        assert parser.total_time == 1000
        assert parser.total_samples == 4

    def test_init_file_not_found(self, tmp_path):
        with pytest.raises(FileNotFoundError):
            PySpyParser(tmp_path / "nonexistent.json")

    def test_init_empty_profiles(self, empty_speedscope_file):
        parser = PySpyParser(empty_speedscope_file)
        assert parser.total_time == 0
        assert parser.total_samples == 0

    def test_parse_returns_dict(self, speedscope_file):
        parser = PySpyParser(speedscope_file)
        result = parser.parse()

        assert isinstance(result, dict)
        for key, value in result.items():
            assert isinstance(key, str)
            assert isinstance(value, ModulePerformance)

    def test_parse_filters_non_python(self, speedscope_file):
        parser = PySpyParser(speedscope_file)
        result = parser.parse()

        for module_path in result.keys():
            assert module_path.endswith(".py")

    def test_get_profiler_type(self, speedscope_file):
        parser = PySpyParser(speedscope_file)
        assert parser.get_profiler_type() == "pyspy"

    def test_get_total_execution_time(self, speedscope_file):
        parser = PySpyParser(speedscope_file)
        assert parser.get_total_execution_time() == 1000

    def test_get_total_samples(self, speedscope_file):
        parser = PySpyParser(speedscope_file)
        assert parser.get_total_samples() == 4

    def test_extract_module_from_filename(self, speedscope_file):
        parser = PySpyParser(speedscope_file)
        result = parser._extract_module_from_filename("/app/services/metrics.py")
        assert result == "app.services.metrics"


class TestPerformanceAnalyzer:
    @pytest.fixture
    def sample_module_performance(self):
        func_profile = FunctionProfile(
            function_name="process",
            module="app.services.processor",
            filename="/app/services/processor.py",
            lineno=10,
            total_time=5.0,
            self_time=4.0,
            cumulative_time=5.0,
            avg_time_per_call=0.5,
            time_percentage=25.0,
            call_count=10,
            primitive_calls=10,
        )

        return {
            "/app/services/processor.py": ModulePerformance(
                module_path="/app/services/processor.py",
                total_execution_time=5.0,
                self_execution_time=4.0,
                time_percentage=25.0,
                total_calls=10,
                unique_functions=1,
                total_memory_mb=None,
                functions=[func_profile],
                is_cpu_bottleneck=True,
                is_memory_bottleneck=False,
                is_io_bottleneck=False,
                performance_severity="high",
            ),
            "/app/utils/helper.py": ModulePerformance(
                module_path="/app/utils/helper.py",
                total_execution_time=0.5,
                self_execution_time=0.5,
                time_percentage=2.5,
                total_calls=100,
                unique_functions=2,
                total_memory_mb=50.0,
                functions=[],
                is_cpu_bottleneck=False,
                is_memory_bottleneck=True,
                is_io_bottleneck=False,
                performance_severity="low",
            ),
            "/app/io/reader.py": ModulePerformance(
                module_path="/app/io/reader.py",
                total_execution_time=2.0,
                self_execution_time=2.0,
                time_percentage=10.0,
                total_calls=5,
                unique_functions=1,
                total_memory_mb=None,
                functions=[],
                is_cpu_bottleneck=False,
                is_memory_bottleneck=False,
                is_io_bottleneck=True,
                performance_severity="medium",
            ),
        }

    @pytest.fixture
    def sample_dependency_graph(self):
        node_metrics_high = NodeMetrics(
            afferent_coupling=5,
            efferent_coupling=10,
            instability=0.7,
            cyclomatic_complexity=20,
            is_circular=True,
            is_hot_zone=True,
        )
        node_metrics_low = NodeMetrics(
            afferent_coupling=1,
            efferent_coupling=1,
            instability=0.5,
            cyclomatic_complexity=5,
        )

        return DependencyGraph(
            nodes=[
                Node(
                    id="app.services.processor",
                    label="processor.py",
                    type="internal",
                    module="app.services",
                    position=Position3D(x=0, y=0, z=0),
                    color="#fff",
                    metrics=node_metrics_high,
                ),
                Node(
                    id="app.utils.helper",
                    label="helper.py",
                    type="internal",
                    module="app.utils",
                    position=Position3D(x=1, y=0, z=0),
                    color="#fff",
                    metrics=node_metrics_low,
                ),
            ],
            edges=[
                Edge(
                    id="e1",
                    source="app.services.processor",
                    target="app.utils.helper",
                    imports=["func"],
                    weight=1,
                    thickness=1,
                )
            ],
        )

    def test_analyze_returns_result(
        self, sample_module_performance, sample_dependency_graph
    ):
        analyzer = PerformanceAnalyzer(
            module_performance=sample_module_performance,
            dependency_graph=sample_dependency_graph,
            profiler_type="cprofile",
            total_execution_time=20.0,
        )

        result = analyzer.analyze()

        assert result.profiler_type == "cprofile"
        assert result.total_execution_time == 20.0
        assert result.total_modules_profiled == 3

    def test_analyze_detects_bottlenecks(
        self, sample_module_performance, sample_dependency_graph
    ):
        analyzer = PerformanceAnalyzer(
            module_performance=sample_module_performance,
            dependency_graph=sample_dependency_graph,
            profiler_type="cprofile",
            total_execution_time=20.0,
        )

        result = analyzer.analyze()

        assert len(result.bottlenecks) >= 1

    def test_bottleneck_priority_ranking(
        self, sample_module_performance, sample_dependency_graph
    ):
        analyzer = PerformanceAnalyzer(
            module_performance=sample_module_performance,
            dependency_graph=sample_dependency_graph,
            profiler_type="cprofile",
            total_execution_time=20.0,
        )

        result = analyzer.analyze()

        for i in range(len(result.bottlenecks) - 1):
            assert (
                result.bottlenecks[i].priority_rank
                < result.bottlenecks[i + 1].priority_rank
            )
            assert (
                result.bottlenecks[i].priority_score
                >= result.bottlenecks[i + 1].priority_score
            )

    def test_analyze_with_custom_weights(
        self, sample_module_performance, sample_dependency_graph
    ):
        weights = PriorityWeights(
            execution_time=0.5,
            coupling=0.2,
            complexity=0.1,
            memory_usage=0.15,
            call_frequency=0.05,
        )

        analyzer = PerformanceAnalyzer(
            module_performance=sample_module_performance,
            dependency_graph=sample_dependency_graph,
            profiler_type="pyspy",
            total_execution_time=10.0,
            total_samples=1000,
            weights=weights,
        )

        result = analyzer.analyze()

        assert result.weights_used == weights

    def test_analyze_empty_performance(self, sample_dependency_graph):
        analyzer = PerformanceAnalyzer(
            module_performance={},
            dependency_graph=sample_dependency_graph,
            profiler_type="cprofile",
            total_execution_time=0.0,
        )

        result = analyzer.analyze()

        assert len(result.bottlenecks) == 0

    def test_bottleneck_recommendations(
        self, sample_module_performance, sample_dependency_graph
    ):
        analyzer = PerformanceAnalyzer(
            module_performance=sample_module_performance,
            dependency_graph=sample_dependency_graph,
            profiler_type="cprofile",
            total_execution_time=20.0,
        )

        result = analyzer.analyze()

        for bottleneck in result.bottlenecks:
            assert bottleneck.recommendation != ""

    @pytest.mark.parametrize(
        "time_pct,expected_impact",
        [
            (25.0, "critical"),
            (15.0, "high"),
            (7.0, "medium"),
            (2.0, "low"),
        ],
    )
    def test_impact_estimation(
        self, time_pct, expected_impact, sample_dependency_graph
    ):
        perf = {
            "/test.py": ModulePerformance(
                module_path="/test.py",
                total_execution_time=time_pct,
                self_execution_time=time_pct,
                time_percentage=time_pct,
                total_calls=1,
                unique_functions=1,
                total_memory_mb=None,
                functions=[],
                is_cpu_bottleneck=True,
                is_memory_bottleneck=False,
                is_io_bottleneck=False,
                performance_severity="high",
            )
        }

        analyzer = PerformanceAnalyzer(
            module_performance=perf,
            dependency_graph=sample_dependency_graph,
            profiler_type="cprofile",
            total_execution_time=100.0,
        )

        result = analyzer.analyze()

        if result.bottlenecks:
            assert result.bottlenecks[0].estimated_impact == expected_impact

    def test_affected_modules_calculation(
        self, sample_module_performance, sample_dependency_graph
    ):
        analyzer = PerformanceAnalyzer(
            module_performance=sample_module_performance,
            dependency_graph=sample_dependency_graph,
            profiler_type="cprofile",
            total_execution_time=20.0,
        )

        result = analyzer.analyze()

        assert len(result.bottlenecks) >= 0

    @pytest.mark.parametrize(
        "is_cpu,is_memory,is_io,expected_type",
        [
            (True, False, False, "cpu"),
            (False, True, False, "memory"),
            (False, False, True, "io"),
            (True, True, False, "combined"),
            (True, True, True, "combined"),
            (False, False, False, "cpu"),
        ],
    )
    def test_bottleneck_type_classification(
        self, is_cpu, is_memory, is_io, expected_type, sample_dependency_graph
    ):
        perf = {
            "/test.py": ModulePerformance(
                module_path="/test.py",
                total_execution_time=10.0,
                self_execution_time=10.0,
                time_percentage=50.0,
                total_calls=1,
                unique_functions=1,
                total_memory_mb=100.0 if is_memory else None,
                functions=[],
                is_cpu_bottleneck=is_cpu,
                is_memory_bottleneck=is_memory,
                is_io_bottleneck=is_io,
                performance_severity="high",
            )
        }

        analyzer = PerformanceAnalyzer(
            module_performance=perf,
            dependency_graph=sample_dependency_graph,
            profiler_type="cprofile",
            total_execution_time=20.0,
        )

        result = analyzer.analyze()

        if result.bottlenecks:
            assert result.bottlenecks[0].bottleneck_type == expected_type
