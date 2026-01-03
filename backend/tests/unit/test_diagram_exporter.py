import xml.etree.ElementTree as ET

import networkx as nx
import pytest

from app.services.export.diagram import DiagramExporter


@pytest.fixture
def exporter(sample_nx_graph):
    """Create exporter with sample graph."""
    return DiagramExporter(sample_nx_graph)


@pytest.fixture
def empty_exporter(empty_nx_graph):
    """Create exporter with empty graph."""
    return DiagramExporter(empty_nx_graph)


# =============================================================================
# PlantUML Export Tests
# =============================================================================


class TestPlantUMLExport:
    """Tests for PlantUML export."""

    def test_basic_structure(self, exporter):
        """Test basic PlantUML structure."""
        result = exporter.to_plantuml()

        assert "@startuml" in result
        assert "@enduml" in result

    def test_contains_nodes(self, exporter):
        """Test that nodes are included."""
        result = exporter.to_plantuml()

        assert "user.py" in result
        assert "auth.py" in result

    def test_contains_third_party_package(self, exporter):
        """Test that third-party package is included."""
        result = exporter.to_plantuml()

        assert "Third Party" in result
        assert "requests" in result

    def test_contains_dependencies(self, exporter):
        """Test that dependencies are included."""
        result = exporter.to_plantuml()

        assert "-->" in result

    def test_empty_graph(self, empty_exporter):
        """Test PlantUML with empty graph."""
        result = empty_exporter.to_plantuml()

        assert "@startuml" in result
        assert "@enduml" in result


# =============================================================================
# C4 Export Tests
# =============================================================================


class TestC4Export:
    """Tests for C4 container diagram export."""

    def test_basic_structure(self, exporter):
        """Test basic C4 diagram structure."""
        result = exporter.to_c4_container("Test System")

        assert "@startuml" in result
        assert "@enduml" in result
        assert "C4_Container.puml" in result

    def test_system_name(self, exporter):
        """Test that system name is included."""
        result = exporter.to_c4_container("My Software")

        assert "My Software" in result

    def test_contains_containers(self, exporter):
        """Test that containers are created."""
        result = exporter.to_c4_container("Test")

        assert "Container(" in result

    def test_external_systems(self, exporter):
        """Test that external systems are included."""
        result = exporter.to_c4_container("Test")

        assert "System_Ext(" in result
        assert "requests" in result


# =============================================================================
# Mermaid Export Tests
# =============================================================================


class TestMermaidExport:
    """Tests for Mermaid diagram export."""

    def test_basic_structure(self, exporter):
        """Test basic Mermaid structure."""
        result = exporter.to_mermaid()

        assert result.startswith("graph TD")

    def test_contains_nodes(self, exporter):
        """Test that nodes are present."""
        result = exporter.to_mermaid()

        assert "user" in result.lower()
        assert "auth" in result.lower()

    def test_contains_edges(self, exporter):
        """Test that edges are present."""
        result = exporter.to_mermaid()

        assert "-->" in result

    def test_third_party_shape(self, exporter):
        """Test that third-party nodes have different shape."""
        result = exporter.to_mermaid()

        assert '[("' in result or '("' in result

    def test_empty_graph(self, empty_exporter):
        """Test Mermaid with empty graph."""
        result = empty_exporter.to_mermaid()

        assert "graph TD" in result


class TestMermaidNodeStyles:
    """Tests for special Mermaid node styling."""

    @pytest.mark.parametrize(
        "metric_key,style_color",
        [
            ("is_high_coupling", "#ffa"),  # Yellow
            ("is_circular", "#fee"),  # Red
        ],
        ids=["high_coupling", "circular"],
    )
    def test_special_node_style(self, metric_key, style_color):
        """Test that special nodes get appropriate styling."""
        graph = nx.DiGraph()
        graph.add_node(
            "special",
            type="internal",
            module="app",
            label="special.py",
            metrics={metric_key: True},
        )

        result = DiagramExporter(graph).to_mermaid()

        assert "style" in result
        assert style_color in result


# =============================================================================
# UML Package Export Tests
# =============================================================================


class TestUMLPackageExport:
    """Tests for UML package diagram export."""

    def test_basic_structure(self, exporter):
        """Test basic UML structure."""
        result = exporter.to_uml_package()

        assert "@startuml" in result
        assert "@enduml" in result
        assert "skinparam packageStyle rectangle" in result

    def test_packages_created(self, exporter):
        """Test that packages are created from module paths."""
        result = exporter.to_uml_package()

        assert 'package "' in result

    def test_dependency_arrows(self, exporter):
        """Test that dependencies use dashed arrows."""
        result = exporter.to_uml_package()

        assert "..>" in result


# =============================================================================
# Draw.io Export Tests
# =============================================================================


class TestDrawioExport:
    """Tests for Draw.io XML export."""

    def test_xml_structure(self, exporter):
        """Test valid XML structure."""
        result = exporter.to_drawio_xml()

        assert '<?xml version="1.0"' in result
        assert "<mxfile" in result
        assert "</mxfile>" in result

    def test_contains_cells(self, exporter):
        """Test that mxCell elements are present."""
        result = exporter.to_drawio_xml()

        assert "<mxCell" in result
        assert "</mxCell>" in result

    def test_contains_geometry(self, exporter):
        """Test that geometry is defined for nodes."""
        result = exporter.to_drawio_xml()

        assert "<mxGeometry" in result

    def test_contains_edges(self, exporter):
        """Test that edges are defined."""
        result = exporter.to_drawio_xml()

        assert 'edge="1"' in result

    def test_different_colors_for_types(self, exporter):
        """Test that internal and third-party have different colors."""
        result = exporter.to_drawio_xml()

        assert "#dae8fc" in result  # Internal nodes (blue)
        assert "#f8cecc" in result  # Third-party nodes (red)

    def test_empty_graph(self, empty_exporter):
        """Test Draw.io with empty graph."""
        result = empty_exporter.to_drawio_xml()

        assert '<?xml version="1.0"' in result
        assert "</mxfile>" in result


# =============================================================================
# Special Characters Tests
# =============================================================================


class TestSpecialCharacters:
    """Test handling of special characters in node names."""

    def test_dots_in_names_plantuml(self):
        """Test that dots in names are handled in PlantUML."""
        graph = nx.DiGraph()
        graph.add_node(
            "com.example.app", type="internal", module="com.example", label="app"
        )

        result = DiagramExporter(graph).to_plantuml()

        assert "com_example_app" in result

    def test_dashes_in_names(self):
        """Test that dashes in names are handled."""
        graph = nx.DiGraph()
        graph.add_node(
            "my-package", type="third_party", module="my-package", label="my-package"
        )

        result = DiagramExporter(graph).to_plantuml()

        assert "my_package" in result

    def test_xml_escaping_drawio(self):
        """Test that XML special chars are escaped in Draw.io."""
        graph = nx.DiGraph()
        graph.add_node(
            "test", type="internal", module="test", label='<test & "quoted">'
        )

        result = DiagramExporter(graph).to_drawio_xml()

        # Verify XML is well-formed (would raise if special chars not escaped)
        ET.fromstring(result)

        # Verify unescaped dangerous chars are NOT present in raw string
        assert "<test" not in result
        assert '& "' not in result
