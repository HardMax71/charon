import json
from unittest.mock import patch

import pytest
import yaml

from app.cli.fitness_check import (
    Colors,
    load_rules,
    load_graph_data,
    print_violation,
    save_result_to_file,
    save_to_history,
    main,
)
from app.core.models import (
    FitnessRuleConfig,
    FitnessValidationResult,
    FitnessViolation,
    DependencyGraph,
    GlobalMetrics,
    Node,
    NodeMetrics,
    Position3D,
    AnalysisResult,
)


class TestColors:
    def test_colors_are_strings(self):
        assert isinstance(Colors.RED, str)
        assert isinstance(Colors.GREEN, str)
        assert isinstance(Colors.RESET, str)
        assert Colors.RED.startswith("\033[")


class TestLoadRules:
    def test_load_json_rules(self, tmp_path):
        rules_file = tmp_path / "rules.json"
        rules_data = {
            "version": "1.0",
            "rules": [
                {
                    "id": "test-rule",
                    "name": "Test Rule",
                    "description": "A test rule",
                    "rule_type": "no_circular",
                    "severity": "error",
                    "enabled": True,
                    "parameters": {},
                }
            ],
        }
        rules_file.write_text(json.dumps(rules_data))

        result = load_rules(str(rules_file))

        assert isinstance(result, FitnessRuleConfig)
        assert len(result.rules) == 1
        assert result.rules[0].id == "test-rule"

    def test_load_yaml_rules(self, tmp_path):
        rules_file = tmp_path / "rules.yaml"
        rules_data = {
            "version": "1.0",
            "rules": [
                {
                    "id": "yaml-rule",
                    "name": "YAML Rule",
                    "description": "A YAML rule",
                    "rule_type": "no_circular",
                    "severity": "warning",
                    "enabled": True,
                    "parameters": {},
                }
            ],
        }
        rules_file.write_text(yaml.dump(rules_data))

        result = load_rules(str(rules_file))

        assert result.rules[0].id == "yaml-rule"

    def test_load_yml_rules(self, tmp_path):
        rules_file = tmp_path / "rules.yml"
        rules_data = {"version": "1.0", "rules": []}
        rules_file.write_text(yaml.dump(rules_data))

        result = load_rules(str(rules_file))
        assert result.version == "1.0"

    def test_load_rules_file_not_found(self, tmp_path):
        with pytest.raises(SystemExit) as exc_info:
            load_rules(str(tmp_path / "nonexistent.json"))
        assert exc_info.value.code == 2


class TestLoadGraphData:
    @pytest.fixture
    def sample_node_metrics(self):
        return NodeMetrics(
            afferent_coupling=1,
            efferent_coupling=2,
            instability=0.5,
        )

    @pytest.fixture
    def sample_graph(self, sample_node_metrics):
        return DependencyGraph(
            nodes=[
                Node(
                    id="mod.a",
                    label="a.py",
                    type="internal",
                    module="mod",
                    position=Position3D(x=0, y=0, z=0),
                    color="#fff",
                    metrics=sample_node_metrics,
                )
            ],
            edges=[],
        )

    @pytest.fixture
    def sample_metrics(self):
        return GlobalMetrics(
            total_files=1,
            total_internal=1,
            total_third_party=0,
            avg_afferent_coupling=1.0,
            avg_efferent_coupling=2.0,
            avg_complexity=5.0,
            avg_maintainability=70.0,
            circular_dependencies=[],
            high_coupling_files=[],
            coupling_threshold=5.0,
            hot_zone_files=[],
        )

    def test_load_analysis_result_format(self, tmp_path, sample_graph, sample_metrics):
        graph_file = tmp_path / "graph.json"
        analysis = AnalysisResult(graph=sample_graph, global_metrics=sample_metrics)
        graph_file.write_text(json.dumps(analysis.model_dump()))

        graph, metrics = load_graph_data(str(graph_file))

        assert isinstance(graph, DependencyGraph)
        assert isinstance(metrics, GlobalMetrics)

    def test_load_raw_format(self, tmp_path, sample_graph, sample_metrics):
        graph_file = tmp_path / "graph.json"
        raw_data = {
            "graph": sample_graph.model_dump(),
            "global_metrics": sample_metrics.model_dump(),
        }
        graph_file.write_text(json.dumps(raw_data))

        graph, metrics = load_graph_data(str(graph_file))

        assert len(graph.nodes) == 1
        assert metrics.total_files == 1

    def test_load_graph_file_not_found(self, tmp_path):
        with pytest.raises(SystemExit) as exc_info:
            load_graph_data(str(tmp_path / "nonexistent.json"))
        assert exc_info.value.code == 2


class TestPrintViolation:
    @pytest.mark.parametrize(
        "severity,affected_modules,details",
        [
            ("error", [], {}),
            ("warning", ["mod.a", "mod.b"], {}),
            ("info", [], {"key": "value"}),
            (
                "error",
                ["a", "b", "c", "d", "e", "f", "g"],
                {"complex": list(range(200))},
            ),
        ],
        ids=[
            "error_no_modules",
            "warning_with_modules",
            "info_with_details",
            "complex",
        ],
    )
    def test_print_violation(self, severity, affected_modules, details, capsys):
        violation = FitnessViolation(
            rule_id="test-rule",
            rule_name="Test Rule",
            severity=severity,
            message="Test message",
            affected_modules=affected_modules,
            details=details,
        )

        print_violation(violation, 1, 5)

        captured = capsys.readouterr()
        assert "Test Rule" in captured.out
        assert severity.upper() in captured.out
        assert "Test message" in captured.out


class TestSaveResultToFile:
    def test_save_result(self, tmp_path):
        output_file = tmp_path / "output" / "result.json"
        result = FitnessValidationResult(
            passed=True,
            timestamp="2024-01-01T00:00:00Z",
            total_rules=1,
            violations=[],
            errors=0,
            warnings=0,
            infos=0,
            summary="All passed",
        )

        save_result_to_file(result, str(output_file))

        assert output_file.exists()
        saved = json.loads(output_file.read_text())
        assert saved["passed"] is True


class TestSaveToHistory:
    def test_save_history(self, tmp_path):
        result = FitnessValidationResult(
            passed=False,
            timestamp="2024-01-01T00:00:00Z",
            total_rules=2,
            violations=[],
            errors=1,
            warnings=0,
            infos=0,
            summary="1 error",
        )

        save_to_history(result, "test-project", str(tmp_path))

        history_file = tmp_path / "test-project" / "fitness_history.jsonl"
        assert history_file.exists()

        lines = history_file.read_text().strip().split("\n")
        assert len(lines) == 1
        saved = json.loads(lines[0])
        assert saved["passed"] is False


class TestMainCLI:
    @pytest.fixture
    def setup_files(self, tmp_path):
        rules_data = {
            "version": "1.0",
            "rules": [
                {
                    "id": "no-circular",
                    "name": "No Circular",
                    "description": "No circular deps",
                    "rule_type": "no_circular",
                    "severity": "error",
                    "enabled": True,
                    "parameters": {},
                }
            ],
        }
        rules_file = tmp_path / "rules.json"
        rules_file.write_text(json.dumps(rules_data))

        graph_data = {
            "graph": {
                "nodes": [
                    {
                        "id": "a",
                        "label": "a",
                        "type": "internal",
                        "module": "app",
                        "position": {"x": 0, "y": 0, "z": 0},
                        "color": "#fff",
                        "metrics": {
                            "afferent_coupling": 0,
                            "efferent_coupling": 0,
                            "instability": 0,
                        },
                    }
                ],
                "edges": [],
            },
            "global_metrics": {
                "total_files": 1,
                "total_internal": 1,
                "total_third_party": 0,
                "avg_afferent_coupling": 0,
                "avg_efferent_coupling": 0,
                "avg_complexity": 0,
                "avg_maintainability": 80,
                "circular_dependencies": [],
                "high_coupling_files": [],
                "coupling_threshold": 5,
                "hot_zone_files": [],
            },
        }
        graph_file = tmp_path / "graph.json"
        graph_file.write_text(json.dumps(graph_data))

        return rules_file, graph_file

    def test_main_passing(self, setup_files, tmp_path):
        rules_file, graph_file = setup_files
        args = [
            "prog",
            "--rules",
            str(rules_file),
            "--graph",
            str(graph_file),
        ]

        with patch("sys.argv", args):
            with pytest.raises(SystemExit) as exc_info:
                main()
            assert exc_info.value.code == 0

    def test_main_quiet_mode(self, setup_files):
        rules_file, graph_file = setup_files
        args = [
            "prog",
            "--rules",
            str(rules_file),
            "--graph",
            str(graph_file),
            "--quiet",
        ]

        with patch("sys.argv", args):
            with pytest.raises(SystemExit) as exc_info:
                main()
            assert exc_info.value.code == 0

    def test_main_json_output(self, setup_files, capsys):
        rules_file, graph_file = setup_files
        args = [
            "prog",
            "--rules",
            str(rules_file),
            "--graph",
            str(graph_file),
            "--json-output",
            "--quiet",
        ]

        with patch("sys.argv", args):
            with pytest.raises(SystemExit):
                main()

        captured = capsys.readouterr()
        output = json.loads(captured.out.strip())
        assert "passed" in output

    def test_main_save_output(self, setup_files, tmp_path):
        rules_file, graph_file = setup_files
        output_file = tmp_path / "result.json"
        args = [
            "prog",
            "--rules",
            str(rules_file),
            "--graph",
            str(graph_file),
            "--output",
            str(output_file),
        ]

        with patch("sys.argv", args):
            with pytest.raises(SystemExit):
                main()

        assert output_file.exists()

    def test_main_save_history(self, setup_files, tmp_path):
        rules_file, graph_file = setup_files
        args = [
            "prog",
            "--rules",
            str(rules_file),
            "--graph",
            str(graph_file),
            "--save-history",
            "--project-name",
            "myproject",
            "--storage-path",
            str(tmp_path / "storage"),
        ]

        with patch("sys.argv", args):
            with pytest.raises(SystemExit):
                main()

        history_file = tmp_path / "storage" / "myproject" / "fitness_history.jsonl"
        assert history_file.exists()

    def test_main_fail_on_error(self, tmp_path):
        rules_data = {
            "version": "1.0",
            "rules": [
                {
                    "id": "no-circular",
                    "name": "No Circular",
                    "description": "No circular deps",
                    "rule_type": "no_circular",
                    "severity": "error",
                    "enabled": True,
                    "parameters": {},
                }
            ],
        }
        rules_file = tmp_path / "rules.json"
        rules_file.write_text(json.dumps(rules_data))

        graph_data = {
            "graph": {
                "nodes": [
                    {
                        "id": "a",
                        "label": "a",
                        "type": "internal",
                        "module": "app",
                        "position": {"x": 0, "y": 0, "z": 0},
                        "color": "#fff",
                        "metrics": {
                            "afferent_coupling": 0,
                            "efferent_coupling": 1,
                            "instability": 1,
                            "is_circular": True,
                        },
                    },
                    {
                        "id": "b",
                        "label": "b",
                        "type": "internal",
                        "module": "app",
                        "position": {"x": 1, "y": 0, "z": 0},
                        "color": "#fff",
                        "metrics": {
                            "afferent_coupling": 1,
                            "efferent_coupling": 1,
                            "instability": 0.5,
                            "is_circular": True,
                        },
                    },
                ],
                "edges": [
                    {
                        "id": "e1",
                        "source": "a",
                        "target": "b",
                        "imports": [],
                        "weight": 1,
                        "thickness": 1,
                    },
                    {
                        "id": "e2",
                        "source": "b",
                        "target": "a",
                        "imports": [],
                        "weight": 1,
                        "thickness": 1,
                    },
                ],
            },
            "global_metrics": {
                "total_files": 2,
                "total_internal": 2,
                "total_third_party": 0,
                "avg_afferent_coupling": 1,
                "avg_efferent_coupling": 1,
                "avg_complexity": 0,
                "avg_maintainability": 80,
                "circular_dependencies": [{"cycle": ["a", "b", "a"]}],
                "high_coupling_files": [],
                "coupling_threshold": 5,
                "hot_zone_files": [],
            },
        }
        graph_file = tmp_path / "graph.json"
        graph_file.write_text(json.dumps(graph_data))

        args = [
            "prog",
            "--rules",
            str(rules_file),
            "--graph",
            str(graph_file),
            "--fail-on-error",
        ]

        with patch("sys.argv", args):
            with pytest.raises(SystemExit) as exc_info:
                main()
            assert exc_info.value.code == 1

    def test_main_exception_handling(self, tmp_path):
        rules_file = tmp_path / "rules.json"
        rules_file.write_text('{"invalid": "data"}')
        graph_file = tmp_path / "graph.json"
        graph_file.write_text("{}")

        args = [
            "prog",
            "--rules",
            str(rules_file),
            "--graph",
            str(graph_file),
        ]

        with patch("sys.argv", args):
            with pytest.raises(SystemExit) as exc_info:
                main()
            assert exc_info.value.code == 2
