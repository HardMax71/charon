# Charon Architecture

## System Overview

Charon is a full-stack web application for analyzing and visualizing Python code dependencies in 3D.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │  React Frontend (TypeScript)                       │     │
│  │  - 3D Visualization (React Three Fiber)            │     │
│  │  - State Management (Zustand)                      │     │
│  │  - UI Components (Tailwind CSS)                    │     │
│  └────────────────┬───────────────────────────────────┘     │
└────────────────────┼──────────────────────────────────────────┘
                     │ HTTP + SSE
                     │
┌────────────────────▼──────────────────────────────────────────┐
│                  FastAPI Backend (Python)                     │
│  ┌────────────────────────────────────────────────────┐      │
│  │  API Layer                                         │      │
│  │  - /analyze (SSE endpoint)                         │      │
│  │  - /export (JSON/TOML)                             │      │
│  │  - /diff (version comparison)                      │      │
│  └────────────────┬───────────────────────────────────┘      │
│                   │                                           │
│  ┌────────────────▼───────────────────────────────────┐      │
│  │  Services Layer                                    │      │
│  │  - AST Parser (extract imports)                    │      │
│  │  - Import Resolver (classify dependencies)         │      │
│  │  - Graph Builder (NetworkX)                        │      │
│  │  - Metrics Calculator (coupling/cohesion)          │      │
│  │  - Layout Engine (3D positioning)                  │      │
│  │  - GitHub Service (fetch repos)                    │      │
│  └────────────────────────────────────────────────────┘      │
└───────────────────────────────────────────────────────────────┘
```

## Backend Architecture

### Core Components

1. **AST Parser** (`app/utils/ast_parser.py`)
   - Parses Python files using the `ast` module
   - Extracts import statements (both absolute and relative)
   - Handles syntax errors gracefully

2. **Import Resolver** (`app/utils/import_resolver.py`)
   - Classifies imports as: internal, third-party, or stdlib
   - Resolves relative imports to absolute paths
   - Detects third-party dependencies

3. **Graph Builder** (`app/services/graph_service.py`)
   - Constructs a NetworkX DiGraph
   - Nodes: Python modules/files
   - Edges: Dependencies with import details

4. **Metrics Calculator** (`app/services/metrics_service.py`)
   - Afferent coupling (Ca): incoming dependencies
   - Efferent coupling (Ce): outgoing dependencies
   - Instability: Ce / (Ca + Ce)
   - Detects circular dependencies using cycle detection
   - Identifies high coupling (top 20%)

5. **Layout Engine** (`app/services/layout_service.py`)
   - Hierarchical: third-party libs separate, internal clustered
   - Force-directed: organic spring layout
   - Circular: nodes in a circle

6. **GitHub Service** (`app/services/github_service.py`)
   - Fetches repository tree via GitHub API
   - Downloads raw file content
   - Handles rate limits

### API Endpoints

- `POST /api/analyze`: Main analysis endpoint with SSE progress updates
- `POST /api/export`: Export graph to JSON/TOML
- `POST /api/diff`: Compare two versions of a repository

### Data Flow

1. User submits GitHub URL / uploads files / imports JSON
2. Backend fetches/receives Python files
3. AST parser extracts imports from each file
4. Import resolver classifies dependencies
5. Graph builder creates dependency graph
6. Metrics calculator computes coupling metrics
7. Layout engine assigns 3D positions
8. Color generator assigns colors
9. Response sent to frontend

## Frontend Architecture

### State Management (Zustand)

- **graphStore**: Graph data, selected nodes/edges
- **uiStore**: UI state (loading, modals, active tab)

### Component Hierarchy

```
App
├── Header
├── InputForm (if no graph loaded)
│   ├── GitHubInput
│   ├── DragDropZone
│   └── ImportData
├── Graph3D (if graph loaded)
│   ├── Scene
│   │   ├── Node (multiple)
│   │   ├── Edge (multiple)
│   │   └── Controls
│   └── LayoutSelector
├── MetricsPanel
│   ├── GlobalMetrics
│   └── EntityMetrics
├── ProgressIndicator (modal)
└── DependencyModal (modal)
```

### Key Libraries

- **React Three Fiber**: 3D rendering with Three.js
- **@react-three/drei**: Helpers (OrbitControls, Html, etc.)
- **Zustand**: Lightweight state management
- **Axios**: HTTP client
- **Tailwind CSS**: Styling

### Visualization Details

- **Nodes**: Spheres with color-coding
  - Red: circular dependencies
  - Orange: high coupling
  - Other: module-based colors
- **Edges**: Curved arrows (QuadraticBezierLine)
  - Thickness proportional to import count
  - Clickable for details
- **Camera**: Orbit controls for rotation/zoom

## Key Algorithms

### Import Classification

```python
if is_standard_library(module):
    return "stdlib"  # Ignored
elif module in project_modules:
    return "internal"
else:
    return "third_party"
```

### Coupling Calculation

```python
for node in graph:
    Ca = in_degree(node)   # Afferent
    Ce = out_degree(node)  # Efferent
    I = Ce / (Ca + Ce)     # Instability
```

### Circular Dependency Detection

```python
cycles = networkx.simple_cycles(graph)
```

### Color Assignment

```python
hue = hash(module_name) % 360
lightness = 50 + (depth * 8) % 40
color = hsl_to_hex(hue, 70, lightness)

# Overrides:
if is_circular: color = RED
if is_high_coupling: color = ORANGE
```

## Deployment

### Docker Compose

```yaml
services:
  backend:
    - FastAPI + Uvicorn
    - Port 8000
  
  frontend:
    - Nginx serving built React app
    - Port 5173
    - Proxies /api to backend
```

### Environment Variables

- `MAX_UPLOAD_SIZE_MB`: File upload limit (default: 10)
- `HIGH_COUPLING_PERCENTILE`: Threshold for high coupling (default: 80)

## Security Considerations

1. **File Upload**: Limited to 10MB, Python files only
2. **GitHub API**: No authentication required (rate limited)
3. **No persistence**: Stateless backend, no database
4. **CORS**: Configured for localhost development

## Performance

- **Medium projects** (100-1000 files): ~10-30 seconds
- **Large projects**: May hit upload limit or timeout
- **SSE streaming**: Real-time progress updates
- **No caching**: Each analysis is fresh

## Extensibility

See [PROPOSALS.md](../PROPOSALS.md) for future enhancements:
- Multi-language support
- Live filesystem monitoring
- Refactoring suggestions
- And more...
