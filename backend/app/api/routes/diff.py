from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse

from app.core.models import DiffRequest
from app.services.github_service import GitHubService
from app.services.analyzer_service import analyze_files
from app.services.graph_service import build_graph
from app.services.progress_service import ProgressTracker

router = APIRouter()


@router.post("/diff")
async def diff_versions(request: DiffRequest):
    """
    Compare dependencies between two versions of a repository.

    Args:
        request: Diff request with repo and two references

    Returns:
        SSE stream with diff results
    """

    async def generate():
        tracker = ProgressTracker()

        try:
            # Fetch first version
            yield await tracker.emit_step(0)
            github_service = GitHubService()
            url = f"https://github.com/{request.repo}"

            files1 = await github_service.fetch_repository(url, request.ref1)

            # Fetch second version
            yield await tracker.emit_step(1)
            files2 = await github_service.fetch_repository(url, request.ref2)

            # Analyze both versions
            yield await tracker.emit_step(2)
            data1 = analyze_files(files1, request.repo)
            graph1 = build_graph(data1)

            yield await tracker.emit_step(3)
            data2 = analyze_files(files2, request.repo)
            graph2 = build_graph(data2)

            # Compare graphs
            yield await tracker.emit_step(4)

            nodes1 = set(graph1.nodes)
            nodes2 = set(graph2.nodes)

            added_nodes = list(nodes2 - nodes1)
            removed_nodes = list(nodes1 - nodes2)

            edges1 = set(graph1.edges)
            edges2 = set(graph2.edges)

            added_edges = [
                {"source": e[0], "target": e[1]} for e in (edges2 - edges1)
            ]
            removed_edges = [
                {"source": e[0], "target": e[1]} for e in (edges1 - edges2)
            ]

            # Find changed edges (same connection but different imports)
            common_edges = edges1 & edges2
            changed_edges = []
            for edge in common_edges:
                imports1 = set(graph1.edges[edge].get("imports", []))
                imports2 = set(graph2.edges[edge].get("imports", []))

                if imports1 != imports2:
                    changed_edges.append({
                        "source": edge[0],
                        "target": edge[1],
                        "added_imports": list(imports2 - imports1),
                        "removed_imports": list(imports1 - imports2),
                    })

            result = {
                "added_nodes": added_nodes,
                "removed_nodes": removed_nodes,
                "added_edges": added_edges,
                "removed_edges": removed_edges,
                "changed_edges": changed_edges,
            }

            yield await tracker.emit_step(6)
            yield await tracker.emit_result(result)

        except Exception as e:
            yield await tracker.emit_error(str(e))

    return EventSourceResponse(generate())
