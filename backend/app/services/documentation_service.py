from datetime import datetime
from typing import Dict, Any
import networkx as nx
from collections import defaultdict


class DocumentationService:
    """Service for generating architectural documentation."""

    def __init__(
        self,
        graph: nx.DiGraph,
        global_metrics: Dict[str, Any],
        project_name: str = "Project",
    ):
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
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            max-width: 1200px;
            margin: 0 auto;
            padding: 40px 20px;
            color: #1a1a1a;
            background-color: #ffffff;
            font-size: 14px;
        }}
        h1 {{
            color: #000000;
            font-size: 28px;
            font-weight: 700;
            border-bottom: 3px solid #000000;
            padding-bottom: 12px;
            margin-bottom: 24px;
            letter-spacing: -0.5px;
        }}
        h2 {{
            color: #1a1a1a;
            font-size: 20px;
            font-weight: 700;
            border-bottom: 2px solid #e5e5e5;
            padding-bottom: 8px;
            margin-top: 40px;
            margin-bottom: 20px;
            letter-spacing: -0.3px;
        }}
        h3 {{
            color: #333333;
            font-size: 16px;
            font-weight: 600;
            margin-top: 24px;
            margin-bottom: 12px;
        }}
        p {{
            margin-bottom: 12px;
            color: #1a1a1a;
        }}
        table {{
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            font-size: 13px;
            background-color: #ffffff;
            table-layout: auto;
        }}
        th, td {{
            border: 1px solid #e5e5e5;
            padding: 10px 12px;
            text-align: left;
            vertical-align: top;
            word-wrap: break-word;
            overflow-wrap: break-word;
            max-width: 300px;
        }}
        th {{
            background-color: #1a1a1a;
            color: #ffffff;
            font-weight: 600;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        tr:nth-child(even) {{
            background-color: #f9f9f9;
        }}
        tr:hover {{
            background-color: #f5f5f5;
        }}
        td {{
            color: #333333;
        }}
        .metric {{
            display: inline-block;
            padding: 6px 12px;
            margin: 4px;
            background-color: #f5f5f5;
            border: 1px solid #e5e5e5;
            border-radius: 4px;
            font-weight: 600;
            font-size: 13px;
            color: #1a1a1a;
        }}
        .error {{
            color: #dc2626;
            font-weight: 600;
        }}
        .warning {{
            color: #ea580c;
            font-weight: 600;
        }}
        .success {{
            color: #16a34a;
            font-weight: 600;
        }}
        .badge {{
            display: inline-block;
            padding: 4px 8px;
            border-radius: 3px;
            font-weight: 600;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        .badge-ok {{
            background-color: #d1fae5;
            color: #065f46;
            border: 1px solid #10b981;
        }}
        .badge-warning {{
            background-color: #fed7aa;
            color: #9a3412;
            border: 1px solid #ea580c;
        }}
        .badge-critical {{
            background-color: #fecaca;
            color: #7f1d1d;
            border: 1px solid #dc2626;
        }}
        .badge-info {{
            background-color: #dbeafe;
            color: #1e40af;
            border: 1px solid #3b82f6;
        }}
        code {{
            background-color: #f5f5f5;
            border: 1px solid #e5e5e5;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
            font-size: 12px;
            color: #1a1a1a;
        }}
        ul, ol {{
            margin-left: 24px;
            margin-bottom: 16px;
        }}
        li {{
            margin-bottom: 8px;
            color: #333333;
        }}
        strong {{
            font-weight: 600;
            color: #000000;
        }}
        hr {{
            border: none;
            border-top: 1px solid #e5e5e5;
            margin: 24px 0;
        }}
        .footer {{
            margin-top: 60px;
            padding-top: 24px;
            border-top: 2px solid #e5e5e5;
            color: #666666;
            font-size: 12px;
            text-align: center;
        }}
        @media print {{
            body {{
                padding: 20px;
                font-size: 12px;
            }}
            h1 {{
                font-size: 24px;
                page-break-after: avoid;
            }}
            h2 {{
                font-size: 18px;
                page-break-after: avoid;
            }}
            h3 {{
                font-size: 14px;
                page-break-after: avoid;
            }}
            table {{
                page-break-inside: avoid;
            }}
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

Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}

---"""

    def _generate_overview(self) -> str:
        """Generate project overview section."""
        node_count = len(self.graph.nodes)
        edge_count = len(self.graph.edges)
        circular_deps = self.global_metrics.get("circular_dependencies_count", 0)
        avg_coupling = self.global_metrics.get("average_coupling", 0)

        return f"""## Project Overview

- Total Modules: {node_count}
- Total Dependencies: {edge_count}
- Circular Dependencies: {circular_deps}
- Average Coupling: {avg_coupling:.2f}
- Max Coupling: {self.global_metrics.get("max_coupling", 0)}
- Total Complexity: {self.global_metrics.get("total_complexity", 0)}"""

    def _generate_module_dependency_table(self) -> str:
        """Generate module dependency table."""
        lines = [
            "## Module Dependencies",
            "",
            "| Module | Imports | Imported By | Coupling |",
        ]
        lines.append("|--------|---------|-------------|----------|")

        for node_id in sorted(self.graph.nodes):
            node_data = self.graph.nodes[node_id]
            metrics = node_data.get("metrics", {})

            imports = list(self.graph.successors(node_id))
            imported_by = list(self.graph.predecessors(node_id))
            coupling = metrics.get("afferent_coupling", 0) + metrics.get(
                "efferent_coupling", 0
            )

            lines.append(
                f"| `{node_id}` | {len(imports)} | {len(imported_by)} | {coupling} |"
            )

        return "\n".join(lines)

    def _generate_coupling_report(self) -> str:
        """Generate detailed coupling report."""
        lines = ["## Coupling Report", ""]

        # High coupling modules
        high_coupling_modules = []
        for node_id in self.graph.nodes:
            node_data = self.graph.nodes[node_id]
            metrics = node_data.get("metrics", {})
            if metrics.get("is_high_coupling", False):
                high_coupling_modules.append(
                    (
                        node_id,
                        metrics.get("afferent_coupling", 0),
                        metrics.get("efferent_coupling", 0),
                        metrics.get("instability", 0),
                    )
                )

        if high_coupling_modules:
            lines.append("### High Coupling Modules")
            lines.append("")
            lines.append("| Module | Afferent | Efferent | Instability |")
            lines.append("|--------|----------|----------|-------------|")

            for module, afferent, efferent, instability in sorted(
                high_coupling_modules, key=lambda x: x[1] + x[2], reverse=True
            ):
                lines.append(
                    f"| `{module}` | {afferent} | {efferent} | {instability:.2f} |"
                )
        else:
            lines.append("[OK] No high coupling modules detected.")

        lines.append("")
        lines.append("### Coupling Distribution")
        lines.append("")

        # Calculate coupling distribution
        coupling_counts = defaultdict(int)
        for node_id in self.graph.nodes:
            node_data = self.graph.nodes[node_id]
            metrics = node_data.get("metrics", {})
            coupling = metrics.get("afferent_coupling", 0) + metrics.get(
                "efferent_coupling", 0
            )

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
        lines = ["## Circular Dependencies", ""]

        circular_nodes = []
        for node_id in self.graph.nodes:
            node_data = self.graph.nodes[node_id]
            metrics = node_data.get("metrics", {})
            if metrics.get("is_circular", False):
                circular_nodes.append(node_id)

        if circular_nodes:
            lines.append(
                f"[WARNING] Found {len(circular_nodes)} modules involved in circular dependencies:"
            )
            lines.append("")

            for node_id in sorted(circular_nodes):
                lines.append(f"- `{node_id}`")
                # Show immediate circular dependencies
                successors = list(self.graph.successors(node_id))
                for successor in successors:
                    if self.graph.has_edge(successor, node_id):
                        lines.append(f"  - `{successor}` (mutual dependency)")
        else:
            lines.append("[OK] No circular dependencies detected.")

        return "\n".join(lines)

    def _generate_third_party_audit(self) -> str:
        """Generate third-party library usage audit."""
        lines = ["## Third-Party Library Usage", ""]

        third_party_nodes = [
            node_id
            for node_id in self.graph.nodes
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

            lines.append(f"Total Third-Party Libraries: {len(third_party_nodes)}")
            lines.append("")
            lines.append("| Library | Used By | Usage Count |")
            lines.append("|---------|---------|-------------|")

            for lib in sorted(
                library_usage.keys(), key=lambda x: len(library_usage[x]), reverse=True
            ):
                usage_count = len(library_usage[lib])
                using_modules = ", ".join(
                    [f"`{m}`" for m in sorted(library_usage[lib])[:3]]
                )
                if len(library_usage[lib]) > 3:
                    using_modules += f", ... ({usage_count - 3} more)"
                lines.append(f"| `{lib}` | {using_modules} | {usage_count} |")
        else:
            lines.append("[INFO] No third-party libraries detected in analysis.")

        return "\n".join(lines)

    def _generate_hot_zones(self) -> str:
        """Generate hot zones section."""
        lines = ["## Hot Zones", ""]

        hot_zone_files = self.global_metrics.get("hot_zone_files", [])

        if hot_zone_files:
            lines.append(
                f"[WARNING] Found {len(hot_zone_files)} hot zones requiring attention:"
            )
            lines.append("")
            lines.append("| File | Severity | Score | Reason |")
            lines.append("|------|----------|-------|--------|")

            for hot_zone in sorted(
                hot_zone_files, key=lambda x: x.get("score", 0), reverse=True
            ):
                file_path = hot_zone.get("file", "")
                severity = hot_zone.get("severity", "info")
                score = hot_zone.get("score", 0)
                reason = hot_zone.get("reason", "")

                severity_label = severity.upper()

                lines.append(
                    f"| `{file_path}` | {severity_label} | {score:.1f} | {reason} |"
                )
        else:
            lines.append("[OK] No hot zones detected.")

        return "\n".join(lines)

    def _generate_footer(self) -> str:
        """Generate documentation footer."""
        return f"""---

*Generated by Charon - Dependency Analysis Tool*
*{datetime.now().strftime("%Y-%m-%d %H:%M:%S")}*"""

    def _markdown_to_html(self, markdown: str) -> str:
        """Convert markdown to HTML (improved implementation)."""

        lines = markdown.split("\n")
        result_lines = []
        in_table = False
        in_list = False

        i = 0
        while i < len(lines):
            line = lines[i]

            # Skip if we're in a table and this is the separator line
            if in_table and "---" in line and "|" in line:
                i += 1
                continue

            # Tables
            if "|" in line and not in_table:
                in_table = True
                result_lines.append("<table>")
                # Check if next line is separator (markdown table format)
                if i + 1 < len(lines) and "---" in lines[i + 1]:
                    result_lines.append("<thead>")
                    result_lines.append("<tr>")
                    cells = [cell.strip() for cell in line.split("|")[1:-1]]
                    for cell in cells:
                        # Process inline markdown in cells
                        cell = self._process_inline_markdown(cell)
                        result_lines.append(f"<th>{cell}</th>")
                    result_lines.append("</tr>")
                    result_lines.append("</thead>")
                    result_lines.append("<tbody>")
                i += 1
                continue

            elif "|" in line and in_table:
                result_lines.append("<tr>")
                cells = [cell.strip() for cell in line.split("|")[1:-1]]
                for cell in cells:
                    # Process inline markdown in cells
                    cell = self._process_inline_markdown(cell)
                    result_lines.append(f"<td>{cell}</td>")
                result_lines.append("</tr>")
                i += 1
                continue

            elif in_table and "|" not in line:
                result_lines.append("</tbody>")
                result_lines.append("</table>")
                in_table = False

            # Headers
            if line.startswith("### "):
                content = self._process_inline_markdown(line[4:])
                result_lines.append(f"<h3>{content}</h3>")
            elif line.startswith("## "):
                content = self._process_inline_markdown(line[3:])
                result_lines.append(f"<h2>{content}</h2>")
            elif line.startswith("# "):
                content = self._process_inline_markdown(line[2:])
                result_lines.append(f"<h1>{content}</h1>")
            # Horizontal rule
            elif line.strip() == "---":
                result_lines.append("<hr>")
            # Lists
            elif line.strip().startswith("- ") or line.strip().startswith("* "):
                if not in_list:
                    result_lines.append("<ul>")
                    in_list = True
                content = self._process_inline_markdown(line.strip()[2:])
                result_lines.append(f"<li>{content}</li>")
            elif in_list and not (
                line.strip().startswith("- ") or line.strip().startswith("* ")
            ):
                result_lines.append("</ul>")
                in_list = False
                if line.strip():
                    content = self._process_inline_markdown(line)
                    result_lines.append(f"<p>{content}</p>")
            # Regular paragraphs
            elif line.strip():
                content = self._process_inline_markdown(line)
                result_lines.append(f"<p>{content}</p>")
            else:
                result_lines.append("")

            i += 1

        # Close any open lists
        if in_list:
            result_lines.append("</ul>")
        if in_table:
            result_lines.append("</tbody>")
            result_lines.append("</table>")

        return "\n".join(result_lines)

    def _process_inline_markdown(self, text: str) -> str:
        """Process inline markdown (bold, code, etc.)."""
        import re

        # Status badges
        text = re.sub(r"\[OK\]", r'<span class="badge badge-ok">OK</span>', text)
        text = re.sub(
            r"\[WARNING\]", r'<span class="badge badge-warning">WARNING</span>', text
        )
        text = re.sub(
            r"\[CRITICAL\]", r'<span class="badge badge-critical">CRITICAL</span>', text
        )
        text = re.sub(r"\[INFO\]", r'<span class="badge badge-info">INFO</span>', text)

        # Code (backticks)
        text = re.sub(r"`([^`]+)`", r"<code>\1</code>", text)

        # Bold - handle all cases including at start of line
        text = re.sub(r"\*\*([^\*]+)\*\*", r"<strong>\1</strong>", text)

        return text
