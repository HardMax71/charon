import json

import pytest
import toml

from app.core.models import (
    DependencyGraph,
    GlobalMetrics,
    Node,
    NodeMetrics,
    Position3D,
)
from app.services.export.service import (
    export_to_json,
    export_to_toml,
    generate_filename,
)


@pytest.fixture
def sample_graph():
    """Create a sample dependency graph."""
    metrics = NodeMetrics(afferent_coupling=1, efferent_coupling=2, instability=0.67)
    return DependencyGraph(
        nodes=[
            Node(
                id="app.main",
                label="main.py",
                type="internal",
                module="app",
                position=Position3D(x=0, y=0, z=0),
                color="#fff",
                metrics=metrics,
            ),
        ],
        edges=[],
    )


@pytest.fixture
def sample_metrics():
    """Create sample global metrics."""
    return GlobalMetrics(
        total_files=1,
        total_internal=1,
        total_third_party=0,
        avg_afferent_coupling=1.0,
        avg_efferent_coupling=2.0,
        circular_dependencies=[],
        high_coupling_files=[],
        coupling_threshold=5.0,
    )


class TestExportToJson:
    """Tests for JSON export."""

    def test_export_produces_valid_json(self, sample_graph, sample_metrics):
        """Export produces parseable JSON."""
        result = export_to_json(sample_graph, sample_metrics, "TestProject")

        parsed = json.loads(result)
        assert parsed["project_name"] == "TestProject"

    def test_export_contains_graph(self, sample_graph, sample_metrics):
        """Export contains graph data."""
        result = export_to_json(sample_graph, sample_metrics, "TestProject")

        parsed = json.loads(result)
        assert "graph" in parsed
        assert "nodes" in parsed["graph"]
        assert len(parsed["graph"]["nodes"]) == 1

    def test_export_contains_metrics(self, sample_graph, sample_metrics):
        """Export contains global metrics."""
        result = export_to_json(sample_graph, sample_metrics, "TestProject")

        parsed = json.loads(result)
        assert "global_metrics" in parsed
        assert parsed["global_metrics"]["total_files"] == 1

    def test_export_is_indented(self, sample_graph, sample_metrics):
        """Export JSON is pretty-printed."""
        result = export_to_json(sample_graph, sample_metrics, "Test")

        # Indented JSON has newlines
        assert "\n" in result


class TestExportToToml:
    """Tests for TOML export."""

    def test_export_produces_valid_toml(self, sample_graph, sample_metrics):
        """Export produces parseable TOML."""
        result = export_to_toml(sample_graph, sample_metrics, "TestProject")

        parsed = toml.loads(result)
        assert parsed["project_name"] == "TestProject"

    def test_export_contains_graph(self, sample_graph, sample_metrics):
        """Export contains graph data."""
        result = export_to_toml(sample_graph, sample_metrics, "TestProject")

        parsed = toml.loads(result)
        assert "graph" in parsed

    def test_export_contains_metrics(self, sample_graph, sample_metrics):
        """Export contains global metrics."""
        result = export_to_toml(sample_graph, sample_metrics, "TestProject")

        parsed = toml.loads(result)
        assert "global_metrics" in parsed


class TestGenerateFilename:
    """Tests for filename generation."""

    @pytest.mark.parametrize(
        "project_name,format,expected",
        [
            ("MyProject", "json", "charon_export_MyProject.json"),
            ("MyProject", "toml", "charon_export_MyProject.toml"),
            ("test", "json", "charon_export_test.json"),
        ],
    )
    def test_filename_format(self, project_name, format, expected):
        """Generate correct filename format."""
        result = generate_filename(project_name, format)
        assert result == expected
