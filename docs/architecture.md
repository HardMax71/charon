# Charon Architecture

## High-Level Architecture

```kroki-plantuml
@startuml
!include <C4/C4_Container>
!include <C4/C4_Component>

LAYOUT_LEFT_RIGHT()
HIDE_STEREOTYPE()

Person(user, "User", "Developer analyzing codebase")

System_Boundary(charon, "Charon") {
    Container(frontend, "Frontend", "React, TypeScript", "3D visualization with React Three Fiber, state via Zustand, styled with Tailwind")

    Container_Boundary(backend, "Backend - FastAPI, Python") {
        Component(api_analyze, "/analyze", "SSE endpoint", "Main analysis endpoint")
        Component(api_export, "/export", "REST", "Export to JSON/TOML")
        Component(api_diff, "/diff", "REST", "Compare versions")

        Component(parser, "AST Parser", "Python ast", "Extract imports")
        Component(resolver, "Import Resolver", "", "Classify dependencies")
        Component(graph, "Graph Builder", "NetworkX", "Build dependency graph")
        Component(metrics, "Metrics Calculator", "", "Coupling, cohesion")
        Component(layout, "Layout Engine", "", "3D positioning")
        Component(github, "GitHub Service", "", "Fetch repositories")
    }
}

Rel(user, frontend, "Uses")
Rel(frontend, api_analyze, "HTTP + SSE")
Rel(frontend, api_export, "HTTP")
Rel(frontend, api_diff, "HTTP")
Rel(api_analyze, parser, "")
Rel(api_analyze, resolver, "")
Rel(api_analyze, graph, "")
Rel(api_analyze, metrics, "")
Rel(api_analyze, layout, "")
Rel(api_analyze, github, "")
Rel(api_export, graph, "")
Rel(api_diff, parser, "")
Rel(api_diff, graph, "")
@enduml
```

The system is a standard client-server setup. The React frontend handles 3D rendering and user interaction, communicating with the FastAPI backend over HTTP. For long-running analysis jobs, the backend streams progress updates via Server-Sent Events (SSE).

The backend is split into two layers: the API layer exposes three endpoints (`/analyze`, `/export`, `/diff`), while the services layer does the actual work: parsing Python files with the `ast` module, building dependency graphs with NetworkX, calculating coupling metrics, and computing 3D layouts.

## Backend Architecture

### Core Components

The [**AST Parser**](https://github.com/HardMax71/charon/blob/main/backend/app/utils/ast_parser.py) reads Python source files and extracts import statements using Python's built-in [`ast`](https://docs.python.org/3/library/ast.html) module. It handles both absolute and relative imports, and gracefully skips files with syntax errors.

The [**Import Resolver**](https://github.com/HardMax71/charon/blob/main/backend/app/utils/import_resolver.py) takes raw import strings and classifies them. It figures out whether an import is part of the project (internal), comes from pip packages (third-party), or belongs to Python's standard library (ignored). Relative imports like `from ..utils import foo` get resolved to their absolute paths.

The [**Graph Builder**](https://github.com/HardMax71/charon/blob/main/backend/app/services/graph_service.py) assembles everything into a [NetworkX](https://networkx.org/) directed graph. Each Python file becomes a node, each import becomes an edge. The edge carries metadata about what names were imported.

The [**Metrics Calculator**](https://github.com/HardMax71/charon/blob/main/backend/app/services/metrics_service.py) walks the graph and computes coupling metrics. Afferent coupling (Ca) counts incoming dependencies, efferent coupling (Ce) counts outgoing ones. Instability is the ratio Ce/(Ca+Ce). It also detects circular dependencies using cycle detection algorithms and flags nodes in the top 20% of coupling as "high coupling".

The [**Layout Engine**](https://github.com/HardMax71/charon/blob/main/backend/app/services/layout_service.py) assigns 3D coordinates to each node. Three algorithms are available: hierarchical (layers based on dependency depth), force-directed (spring physics simulation), and circular (nodes arranged in a ring).

The [**GitHub Service**](https://github.com/HardMax71/charon/blob/main/backend/app/services/github_service.py) fetches repositories from GitHub. It uses the [GitHub API](https://docs.github.com/en/rest) to get the file tree, then downloads raw file content. Rate limiting is handled automatically.

### API Endpoints

See the full [API Reference](api_reference.md) for request/response schemas and examples.

### Data Flow

```kroki-plantuml
@startuml
skinparam backgroundColor #FFFFFF
skinparam shadowing false

skinparam participant {
    BackgroundColor #438DD5
    BorderColor #3C7FC0
    FontColor #FFFFFF
    FontStyle bold
}

skinparam actor {
    BackgroundColor #08427B
    BorderColor #073B6F
    FontColor #000000
}

skinparam sequence {
    ArrowColor #666666
    LifeLineBorderColor #999999
    LifeLineBackgroundColor #E8E8E8
}

actor User
participant Frontend
participant API
participant Parser
participant Resolver
participant GraphBuilder
participant Metrics
participant Layout

User -> Frontend: Submit repo URL / files
Frontend -> API: POST /analyze

API -> Parser: Parse Python files
Parser --> API: Import statements

API -> Resolver: Classify imports
Resolver --> API: Internal / external / stdlib

API -> GraphBuilder: Build graph
GraphBuilder --> API: NetworkX DiGraph

API -> Metrics: Calculate coupling
Metrics --> API: Ca, Ce, cycles

API -> Layout: Compute 3D positions
Layout --> API: Node coordinates

API --> Frontend: SSE stream (progress + result)
Frontend --> User: Render 3D graph
@enduml
```

The flow starts when a user submits a GitHub URL, uploads local files, or imports a previous analysis. The frontend sends this to the `/analyze` endpoint, which coordinates the pipeline. First, the parser extracts imports from each Python file. The resolver then classifies each import as internal, third-party, or stdlib. The graph builder assembles these into a NetworkX directed graph. The metrics calculator computes coupling scores and detects cycles. Finally, the layout engine assigns 3D coordinates to each node. Results stream back to the frontend via SSE, with progress updates along the way.

## Frontend Architecture

### Component Hierarchy

```kroki-plantuml
@startuml
!include <C4/C4_Component>

LAYOUT_TOP_DOWN()
HIDE_STEREOTYPE()

Container_Boundary(app, "App") {
    Component(header, "Header", "", "Navigation", $link="https://github.com/HardMax71/charon/blob/main/frontend/src/components/Layout/Header.tsx")

    Container_Boundary(input, "InputForm", $link="https://github.com/HardMax71/charon/blob/main/frontend/src/components/InputForm/InputForm.tsx") {
        Component(github_input, "GitHubInput", "", "URL input", $link="https://github.com/HardMax71/charon/blob/main/frontend/src/components/InputForm/GitHubInput.tsx")
        Component(dragdrop, "DragDropZone", "", "File upload", $link="https://github.com/HardMax71/charon/blob/main/frontend/src/components/InputForm/DragDropZone.tsx")
    }

    Container_Boundary(graph3d, "Graph3D", $link="https://github.com/HardMax71/charon/blob/main/frontend/src/components/Graph3D/Graph3D.tsx") {
        Component(scene, "GraphCanvas", "", "Three.js canvas", $link="https://github.com/HardMax71/charon/blob/main/frontend/src/components/Graph3D/canvas/GraphCanvas.tsx")
        Component(nodes, "NodeMesh", "", "Sphere meshes", $link="https://github.com/HardMax71/charon/blob/main/frontend/src/components/Graph3D/canvas/NodeMesh.tsx")
        Component(edges, "EdgeMesh", "", "Curved arrows", $link="https://github.com/HardMax71/charon/blob/main/frontend/src/components/Graph3D/canvas/EdgeMesh.tsx")
        Component(layout_sel, "LayoutSelector", "", "Layout picker", $link="https://github.com/HardMax71/charon/blob/main/frontend/src/components/Graph3D/LayoutSelector.tsx")
    }

    Container_Boundary(metrics_panel, "MetricsPanel", $link="https://github.com/HardMax71/charon/blob/main/frontend/src/components/MetricsPanel/MetricsPanel.tsx") {
        Component(global_metrics, "GlobalMetrics", "", "Summary stats", $link="https://github.com/HardMax71/charon/blob/main/frontend/src/components/MetricsPanel/GlobalMetrics.tsx")
    }

    Component(progress, "ProgressIndicator", "", "Loading modal", $link="https://github.com/HardMax71/charon/blob/main/frontend/src/components/ProgressIndicator/ProgressIndicator.tsx")
    Component(dep_modal, "DependencyModal", "", "Edge details", $link="https://github.com/HardMax71/charon/blob/main/frontend/src/components/DependencyModal/DependencyModal.tsx")
}
@enduml
```

The app renders either [InputForm](https://github.com/HardMax71/charon/blob/main/frontend/src/components/InputForm/InputForm.tsx) (when no graph is loaded) or [Graph3D](https://github.com/HardMax71/charon/blob/main/frontend/src/components/Graph3D/Graph3D.tsx) (after analysis). The 3D scene contains node spheres, edge arrows, and orbit controls. The [MetricsPanel](https://github.com/HardMax71/charon/blob/main/frontend/src/components/MetricsPanel/MetricsPanel.tsx) shows global stats or details for the selected node.

### Key Libraries

[React Three Fiber](https://r3f.docs.pmnd.rs/) wraps Three.js in React components, making 3D rendering declarative. [@react-three/drei](https://github.com/pmndrs/drei) adds helpers like `OrbitControls` for camera movement and `Html` for overlaying DOM elements on 3D objects. [Zustand](https://zustand-demo.pmnd.rs/) handles state management with minimal boilerplate. [Axios](https://axios-http.com/) makes HTTP requests to the backend. [Tailwind CSS](https://tailwindcss.com/) provides utility classes for styling.

### State Management

The app uses [Zustand](https://zustand-demo.pmnd.rs/) stores. The **graphStore** holds the dependency graph data, selected nodes/edges, and impact analysis results:

```typescript title="frontend/src/stores/graphStore.ts" linenums="6"
--8<-- "frontend/src/stores/graphStore.ts:6:27"
```

The **uiStore** tracks loading states, modal visibility, layout selection, and graph filters:

```typescript title="frontend/src/stores/uiStore.ts" linenums="14"
--8<-- "frontend/src/stores/uiStore.ts:14:34"
```

### Visualization Details

Nodes are rendered as spheres using Three.js meshes. The fill color indicates status: red for circular dependencies, orange for high coupling, amber for hot zones. The outline color reflects the node's language. Node size scales with cyclomatic complexity. See the [status color definitions](https://github.com/HardMax71/charon/blob/main/frontend/src/utils/constants.ts#L39-L48) and the [node color logic](https://github.com/HardMax71/charon/blob/main/frontend/src/components/Graph3D/canvas/NodeMesh.tsx#L105-L152):

```typescript title="frontend/src/utils/constants.ts" linenums="39"
--8<-- "frontend/src/utils/constants.ts:39:48"
```

Edges are curved arrows drawn with `QuadraticBezierCurve3`. Line width and opacity vary based on selection state and filter matches. Clicking an edge opens the dependency modal. See the [edge styling logic](https://github.com/HardMax71/charon/blob/main/frontend/src/components/Graph3D/canvas/EdgeMesh.tsx#L185-L224):

```typescript title="frontend/src/components/Graph3D/canvas/EdgeMesh.tsx" linenums="185"
--8<-- "frontend/src/components/Graph3D/canvas/EdgeMesh.tsx:185:224"
```

The camera uses `OrbitControls` from drei for rotation, panning, and zoom.
