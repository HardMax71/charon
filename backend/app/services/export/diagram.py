import networkx as nx
from xml.sax.saxutils import escape as xml_escape


class DiagramExporter:
    """Export dependency graph to various diagram formats."""

    def __init__(self, graph: nx.DiGraph):
        self.graph = graph

    def to_plantuml(self) -> str:
        """
        Export to PlantUML component diagram.

        Returns:
            PlantUML source code
        """
        lines = [
            "@startuml",
            "!define LIGHTORANGE",
            "skinparam componentStyle rectangle",
            "",
        ]

        # Group by module
        modules = {}
        for node_id in self.graph.nodes:
            node_data = self.graph.nodes[node_id]
            if node_data.get("type") == "internal":
                module = (
                    node_data.get("module", "").split(".")[0]
                    if "." in node_data.get("module", "")
                    else "root"
                )
                if module not in modules:
                    modules[module] = []
                modules[module].append(node_id)

        # Create packages
        for module, nodes in modules.items():
            if module and module != "root":
                lines.append(f'package "{module}" {{')
                for node_id in nodes:
                    label = self.graph.nodes[node_id].get("label", node_id)
                    # Escape quotes
                    safe_id = node_id.replace(".", "_").replace("-", "_")
                    lines.append(f"  component [{label}] as {safe_id}")
                lines.append("}")
                lines.append("")

        # Add third-party as external
        third_party_nodes = [
            n
            for n in self.graph.nodes
            if self.graph.nodes[n].get("type") == "third_party"
        ]
        if third_party_nodes:
            lines.append('package "Third Party" <<External>> {')
            for node_id in third_party_nodes:
                label = self.graph.nodes[node_id].get("label", node_id)
                safe_id = node_id.replace(".", "_").replace("-", "_")
                lines.append(f"  component [{label}] as {safe_id}")
            lines.append("}")
            lines.append("")

        # Add dependencies
        for source, target in self.graph.edges:
            safe_source = source.replace(".", "_").replace("-", "_")
            safe_target = target.replace(".", "_").replace("-", "_")
            lines.append(f"{safe_source} --> {safe_target}")

        lines.append("")
        lines.append("@enduml")

        return "\n".join(lines)

    def to_c4_container(self, system_name: str = "Software System") -> str:
        """
        Export to C4 Container diagram using PlantUML.

        Args:
            system_name: Name of the software system

        Returns:
            C4 PlantUML source code
        """
        lines = [
            "@startuml",
            "!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml",
            "",
            "LAYOUT_WITH_LEGEND()",
            "",
            f"title Container Diagram for {system_name}",
            "",
            'Person(user, "Developer", "Uses the system")',
            "",
            f'System_Boundary(system, "{system_name}") {{',
        ]

        # Group containers by module
        modules = {}
        for node_id in self.graph.nodes:
            node_data = self.graph.nodes[node_id]
            if node_data.get("type") == "internal":
                module = (
                    node_data.get("module", "").split(".")[0]
                    if "." in node_data.get("module", "")
                    else "core"
                )
                if module not in modules:
                    modules[module] = []
                modules[module].append(node_id)

        container_ids: list[str] = []
        # Create containers
        for module, nodes in modules.items():
            container_desc = f"{len(nodes)} modules"
            safe_module = module.replace(".", "_").replace("-", "_")
            lines.append(
                f'  Container({safe_module}, "{module}", "Python", "{container_desc}")'
            )
            container_ids.append(safe_module)

        lines.append("}")
        lines.append("")

        # Add external systems
        third_party_libs = set()
        for node_id in self.graph.nodes:
            if self.graph.nodes[node_id].get("type") == "third_party":
                lib_name = self.graph.nodes[node_id].get("label", node_id)
                third_party_libs.add(lib_name)

        for lib in third_party_libs:
            safe_lib = lib.replace(".", "_").replace("-", "_")
            lines.append(f'System_Ext({safe_lib}, "{lib}", "External library")')

        lines.append("")

        # Add relationships
        default_container = None
        if "core" in container_ids:
            default_container = "core"
        elif container_ids:
            default_container = container_ids[0]
        if default_container:
            lines.append(f'Rel(user, {default_container}, "Uses")')

        # Add inter-module dependencies
        module_deps = set()
        for source, target in self.graph.edges:
            source_module = (
                self.graph.nodes[source].get("module", "").split(".")[0]
                if "." in self.graph.nodes[source].get("module", "")
                else "core"
            )
            target_module = (
                self.graph.nodes[target].get("module", "").split(".")[0]
                if "." in self.graph.nodes[target].get("module", "")
                else "core"
            )

            source_type = self.graph.nodes[source].get("type")
            target_type = self.graph.nodes[target].get("type")

            if (
                source_type == "internal"
                and target_type == "internal"
                and source_module != target_module
            ):
                safe_source = source_module.replace(".", "_").replace("-", "_")
                safe_target = target_module.replace(".", "_").replace("-", "_")
                dep = (safe_source, safe_target)
                if dep not in module_deps:
                    module_deps.add(dep)
                    lines.append(f'Rel({safe_source}, {safe_target}, "Depends on")')

        lines.append("")
        lines.append("@enduml")

        return "\n".join(lines)

    def to_mermaid(self) -> str:
        """
        Export to Mermaid flowchart diagram.

        Returns:
            Mermaid source code
        """
        lines = ["graph TD", ""]

        # Add nodes
        for node_id in self.graph.nodes:
            node_data = self.graph.nodes[node_id]
            label = node_data.get("label", node_id)
            node_type = node_data.get("type", "internal")

            # Create safe ID for mermaid
            safe_id = node_id.replace(".", "_").replace("-", "_")

            # Different shapes for different types
            if node_type == "third_party":
                lines.append(f'  {safe_id}[("{label}")]')
            else:
                metrics = node_data.get("metrics", {})
                if metrics.get("is_circular"):
                    lines.append(f'  {safe_id}["{label}"]')
                    lines.append(f"  style {safe_id} fill:#fee")
                elif metrics.get("is_high_coupling"):
                    lines.append(f'  {safe_id}["{label}"]')
                    lines.append(f"  style {safe_id} fill:#ffa")
                else:
                    lines.append(f'  {safe_id}["{label}"]')

        lines.append("")

        # Add edges
        for source, target in self.graph.edges:
            safe_source = source.replace(".", "_").replace("-", "_")
            safe_target = target.replace(".", "_").replace("-", "_")
            lines.append(f"  {safe_source} --> {safe_target}")

        return "\n".join(lines)

    def to_uml_package(self) -> str:
        """
        Export to UML package diagram using PlantUML.

        Returns:
            PlantUML package diagram source
        """
        lines = ["@startuml", "skinparam packageStyle rectangle", ""]

        # Group by module
        modules = {}
        for node_id in self.graph.nodes:
            node_data = self.graph.nodes[node_id]
            if node_data.get("type") == "internal":
                parts = node_id.split(".")
                if len(parts) > 1:
                    package = parts[0]
                    module = ".".join(parts[1:])
                else:
                    package = "root"
                    module = node_id

                if package not in modules:
                    modules[package] = []
                modules[package].append((module, node_id))

        # Create packages with modules
        for package, items in modules.items():
            if package != "root":
                lines.append(f'package "{package}" {{')
                for module, node_id in items:
                    safe_id = node_id.replace(".", "_").replace("-", "_")
                    lines.append(f"  class {safe_id} <<module>> {{")
                    lines.append(f"    {module}")
                    lines.append("  }")
                lines.append("}")
                lines.append("")

        # Add dependencies
        for source, target in self.graph.edges:
            if (
                self.graph.nodes[source].get("type") == "internal"
                and self.graph.nodes[target].get("type") == "internal"
            ):
                safe_source = source.replace(".", "_").replace("-", "_")
                safe_target = target.replace(".", "_").replace("-", "_")
                lines.append(f"{safe_source} ..> {safe_target}")

        lines.append("")
        lines.append("@enduml")

        return "\n".join(lines)

    def to_drawio_xml(self) -> str:
        """
        Export to Draw.io XML format.

        Returns:
            Draw.io XML string
        """
        # Simple Draw.io format
        xml_lines = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<mxfile host="app.diagrams.net" modified="2024-01-01T00:00:00.000Z" agent="Charon" version="21.0.0">',
            '  <diagram name="Dependency Graph" id="dependency-graph">',
            '    <mxGraphModel dx="1434" dy="764" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169">',
            "      <root>",
            '        <mxCell id="0"/>',
            '        <mxCell id="1" parent="0"/>',
        ]

        # Calculate layout positions (simple grid)
        node_list = list(self.graph.nodes)
        cols = int(len(node_list) ** 0.5) + 1
        cell_width = 120
        cell_height = 80
        x_offset = 50
        y_offset = 50

        node_positions = {}
        for idx, node_id in enumerate(node_list):
            row = idx // cols
            col = idx % cols
            x = x_offset + col * (cell_width + 50)
            y = y_offset + row * (cell_height + 50)
            node_positions[node_id] = (x, y)

        # Add nodes
        for idx, node_id in enumerate(node_list):
            node_data = self.graph.nodes[node_id]
            label = node_data.get("label", node_id)
            safe_label = xml_escape(label, {'"': "&quot;"})
            node_type = node_data.get("type", "internal")
            x, y = node_positions[node_id]

            # Different colors for different types
            fill_color = "#dae8fc" if node_type == "internal" else "#f8cecc"
            stroke_color = "#6c8ebf" if node_type == "internal" else "#b85450"

            cell_id = f"node_{idx}"
            xml_lines.append(
                f'        <mxCell id="{cell_id}" value="{safe_label}" '
                f'style="rounded=1;whiteSpace=wrap;html=1;fillColor={fill_color};strokeColor={stroke_color};" '
                f'vertex="1" parent="1">'
            )
            xml_lines.append(
                f'          <mxGeometry x="{x}" y="{y}" width="{cell_width}" height="{cell_height}" as="geometry"/>'
            )
            xml_lines.append("        </mxCell>")

        # Add edges
        edge_id = 0
        node_id_map = {node_id: f"node_{idx}" for idx, node_id in enumerate(node_list)}

        for source, target in self.graph.edges:
            source_cell = node_id_map.get(source)
            target_cell = node_id_map.get(target)
            if source_cell and target_cell:
                xml_lines.append(
                    f'        <mxCell id="edge_{edge_id}" value="" '
                    f'style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;" '
                    f'edge="1" parent="1" source="{source_cell}" target="{target_cell}">'
                )
                xml_lines.append('          <mxGeometry relative="1" as="geometry"/>')
                xml_lines.append("        </mxCell>")
                edge_id += 1

        xml_lines.extend(
            [
                "      </root>",
                "    </mxGraphModel>",
                "  </diagram>",
                "</mxfile>",
            ]
        )

        return "\n".join(xml_lines)
