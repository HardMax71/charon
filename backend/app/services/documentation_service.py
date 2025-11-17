from datetime import datetime
from typing import Dict, List, Any
import networkx as nx
from collections import defaultdict


class DocumentationService:
    """Service for generating architectural documentation."""

    def __init__(self, graph: nx.DiGraph, global_metrics: Dict[str, Any], project_name: str = "Project"):
        self.graph = graph
        self.global_metrics = global_metrics
        self.project_name = project_name

    def generate_markdown(self) -> str:
        """Generate complete documentation in Markdown format."""
        sections = [
            self._generate_header(),
            self._generate_overview(),
            self._generate_module_dependency_table(),
            self._generate_coupling_report(),
            self._generate_circular_dependencies(),
            self._generate_third_party_audit(),
            self._generate_hot_zones(),
            self._generate_footer(),
        ]
        return "\n\n".join(sections)

    def generate_html(self) -> str:
        """Generate complete documentation in HTML format."""
        markdown_content = self.generate_markdown()

        # Convert markdown to HTML (basic conversion)
        html_content = self._markdown_to_html(markdown_content)

        # Wrap in HTML template
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{self.project_name} - Architectural Documentation</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }}
        h1 {{
            color: #d97706;
            border-bottom: 3px solid #d97706;
            padding-bottom: 10px;
        }}
        h2 {{
            color: #d97706;
            border-bottom: 2px solid #f59e0b;
            padding-bottom: 8px;
            margin-top: 30px;
        }}
        h3 {{
            color: #92400e;
            margin-top: 20px;
        }}
        table {{
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        th, td {{
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }}
        th {{
            background-color: #d97706;
            color: white;
            font-weight: bold;
        }}
        tr:nth-child(even) {{
            background-color: #fef3c7;
        }}
        tr:hover {{
            background-color: #fde68a;
        }}
        .metric {{
            display: inline-block;
            padding: 5px 10px;
            margin: 5px;
            background-color: #fef3c7;
            border-radius: 5px;
            font-weight: bold;
        }}
        .error {{
            color: #dc2626;
            font-weight: bold;
        }}
        .warning {{
            color: #f59e0b;
            font-weight: bold;
        }}
        .success {{
            color: #10b981;
            font-weight: bold;
        }}
        code {{
            background-color: #f3f4f6;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }}
        .footer {{
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #ddd;
            color: #666;
            font-size: 0.9em;
        }}
    </style>
</head>
<body>
{html_content}
</body>
</html>"""

    def _generate_header(self) -> str:
        """Generate documentation header."""
        return f"""# {self.project_name} - Architectural Documentation

**Generated:** {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}

---"""

    def _generate_overview(self) -> str:
        """Generate project overview section."""
        node_count = len(self.graph.nodes)
        edge_count = len(self.graph.edges)
        circular_deps = self.global_metrics.get("circular_dependencies_count", 0)
        avg_coupling = self.global_metrics.get("average_coupling", 0)

        return f"""## 📊 Project Overview

- **Total Modules:** {node_count}
- **Total Dependencies:** {edge_count}
- **Circular Dependencies:** {circular_deps}
- **Average Coupling:** {avg_coupling:.2f}
- **Max Coupling:** {self.global_metrics.get("max_coupling", 0)}
- **Total Complexity:** {self.global_metrics.get("total_complexity", 0)}"""

    def _generate_module_dependency_table(self) -> str:
        """Generate module dependency table."""
        lines = ["## 📦 Module Dependencies", "", "| Module | Imports | Imported By | Coupling |"]
        lines.append("|--------|---------|-------------|----------|")

        for node_id in sorted(self.graph.nodes):
            node_data = self.graph.nodes[node_id]
            metrics = node_data.get("metrics", {})

            imports = list(self.graph.successors(node_id))
            imported_by = list(self.graph.predecessors(node_id))
            coupling = metrics.get("afferent_coupling", 0) + metrics.get("efferent_coupling", 0)

            lines.append(
                f"| `{node_id}` | {len(imports)} | {len(imported_by)} | {coupling} |"
            )

        return "\n".join(lines)

    def _generate_coupling_report(self) -> str:
        """Generate detailed coupling report."""
        lines = ["## 🔗 Coupling Report", ""]

        # High coupling modules
        high_coupling_modules = []
        for node_id in self.graph.nodes:
            node_data = self.graph.nodes[node_id]
            metrics = node_data.get("metrics", {})
            if metrics.get("is_high_coupling", False):
                high_coupling_modules.append((
                    node_id,
                    metrics.get("afferent_coupling", 0),
                    metrics.get("efferent_coupling", 0),
                    metrics.get("instability", 0)
                ))

        if high_coupling_modules:
            lines.append("### ⚠️ High Coupling Modules")
            lines.append("")
            lines.append("| Module | Afferent | Efferent | Instability |")
            lines.append("|--------|----------|----------|-------------|")

            for module, afferent, efferent, instability in sorted(
                high_coupling_modules, key=lambda x: x[1] + x[2], reverse=True
            ):
                lines.append(f"| `{module}` | {afferent} | {efferent} | {instability:.2f} |")
        else:
            lines.append("✅ **No high coupling modules detected.**")

        lines.append("")
        lines.append("### 📈 Coupling Distribution")
        lines.append("")

        # Calculate coupling distribution
        coupling_counts = defaultdict(int)
        for node_id in self.graph.nodes:
            node_data = self.graph.nodes[node_id]
            metrics = node_data.get("metrics", {})
            coupling = metrics.get("afferent_coupling", 0) + metrics.get("efferent_coupling", 0)

            if coupling == 0:
                coupling_counts["0"] += 1
            elif coupling <= 2:
                coupling_counts["1-2"] += 1
            elif coupling <= 5:
                coupling_counts["3-5"] += 1
            elif coupling <= 10:
                coupling_counts["6-10"] += 1
            else:
                coupling_counts["10+"] += 1

        lines.append("| Coupling Range | Module Count |")
        lines.append("|----------------|--------------|")
        for range_label in ["0", "1-2", "3-5", "6-10", "10+"]:
            lines.append(f"| {range_label} | {coupling_counts[range_label]} |")

        return "\n".join(lines)

    def _generate_circular_dependencies(self) -> str:
        """Generate circular dependencies section."""
        lines = ["## 🔄 Circular Dependencies", ""]

        circular_nodes = []
        for node_id in self.graph.nodes:
            node_data = self.graph.nodes[node_id]
            metrics = node_data.get("metrics", {})
            if metrics.get("is_circular", False):
                circular_nodes.append(node_id)

        if circular_nodes:
            lines.append(f"⚠️ **Found {len(circular_nodes)} modules involved in circular dependencies:**")
            lines.append("")

            for node_id in sorted(circular_nodes):
                lines.append(f"- `{node_id}`")
                # Show immediate circular dependencies
                successors = list(self.graph.successors(node_id))
                for successor in successors:
                    if self.graph.has_edge(successor, node_id):
                        lines.append(f"  - ↔️ `{successor}` (mutual dependency)")
        else:
            lines.append("✅ **No circular dependencies detected.**")

        return "\n".join(lines)

    def _generate_third_party_audit(self) -> str:
        """Generate third-party library usage audit."""
        lines = ["## 📚 Third-Party Library Usage", ""]

        third_party_nodes = [
            node_id for node_id in self.graph.nodes
            if self.graph.nodes[node_id].get("type") == "third_party"
        ]

        if third_party_nodes:
            # Count usage of each library
            library_usage = defaultdict(list)
            for node_id in self.graph.nodes:
                if self.graph.nodes[node_id].get("type") == "internal":
                    for successor in self.graph.successors(node_id):
                        if successor in third_party_nodes:
                            library_usage[successor].append(node_id)

            lines.append(f"**Total Third-Party Libraries:** {len(third_party_nodes)}")
            lines.append("")
            lines.append("| Library | Used By | Usage Count |")
            lines.append("|---------|---------|-------------|")

            for lib in sorted(library_usage.keys(), key=lambda x: len(library_usage[x]), reverse=True):
                usage_count = len(library_usage[lib])
                using_modules = ", ".join([f"`{m}`" for m in sorted(library_usage[lib])[:3]])
                if len(library_usage[lib]) > 3:
                    using_modules += f", ... ({usage_count - 3} more)"
                lines.append(f"| `{lib}` | {using_modules} | {usage_count} |")
        else:
            lines.append("ℹ️ **No third-party libraries detected in analysis.**")

        return "\n".join(lines)

    def _generate_hot_zones(self) -> str:
        """Generate hot zones section."""
        lines = ["## 🔥 Hot Zones", ""]

        hot_zone_files = self.global_metrics.get("hot_zone_files", [])

        if hot_zone_files:
            lines.append(f"⚠️ **Found {len(hot_zone_files)} hot zones requiring attention:**")
            lines.append("")
            lines.append("| File | Severity | Score | Reason |")
            lines.append("|------|----------|-------|--------|")

            for hot_zone in sorted(hot_zone_files, key=lambda x: x.get("score", 0), reverse=True):
                file_path = hot_zone.get("file", "")
                severity = hot_zone.get("severity", "info")
                score = hot_zone.get("score", 0)
                reason = hot_zone.get("reason", "")

                severity_icon = {
                    "critical": "🔴",
                    "warning": "🟡",
                    "info": "🔵"
                }.get(severity, "⚪")

                lines.append(f"| `{file_path}` | {severity_icon} {severity} | {score:.1f} | {reason} |")
        else:
            lines.append("✅ **No hot zones detected.**")

        return "\n".join(lines)

    def _generate_footer(self) -> str:
        """Generate documentation footer."""
        return f"""---

*Generated by Charon - Dependency Analysis Tool*
*{datetime.now().strftime("%Y-%m-%d %H:%M:%S")}*"""

    def _markdown_to_html(self, markdown: str) -> str:
        """Convert markdown to HTML (basic implementation)."""
        html = markdown

        # Headers
        html = html.replace("### ", "<h3>").replace("\n", "</h3>\n", 1)
        html = html.replace("## ", "<h2>").replace("\n", "</h2>\n", 1)
        html = html.replace("# ", "<h1>").replace("\n", "</h1>\n", 1)

        # Tables
        lines = html.split("\n")
        in_table = False
        result_lines = []

        for i, line in enumerate(lines):
            if "|" in line and not in_table:
                in_table = True
                result_lines.append("<table>")
                # Check if next line is separator
                if i + 1 < len(lines) and "---" in lines[i + 1]:
                    result_lines.append("<thead>")
                    result_lines.append("<tr>")
                    for cell in line.split("|")[1:-1]:
                        result_lines.append(f"<th>{cell.strip()}</th>")
                    result_lines.append("</tr>")
                    result_lines.append("</thead>")
                    result_lines.append("<tbody>")
            elif "|" in line and in_table:
                if "---" not in line:
                    result_lines.append("<tr>")
                    for cell in line.split("|")[1:-1]:
                        result_lines.append(f"<td>{cell.strip()}</td>")
                    result_lines.append("</tr>")
            elif in_table and "|" not in line:
                result_lines.append("</tbody>")
                result_lines.append("</table>")
                result_lines.append(line)
                in_table = False
            else:
                result_lines.append(line)

        if in_table:
            result_lines.append("</tbody>")
            result_lines.append("</table>")

        html = "\n".join(result_lines)

        # Code blocks
        html = html.replace("`", "<code>").replace("<code>", "</code>", 2)

        # Bold
        html = html.replace("**", "<strong>").replace("<strong>", "</strong>", 2)

        # Line breaks
        html = html.replace("\n\n", "<br><br>")

        return html
