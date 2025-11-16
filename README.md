# Charon

A 3D dependency visualizer for Python projects that helps you understand code coupling, cohesion, and refactoring opportunities.

## What is this?

Charon analyzes Python codebases and creates interactive 3D visualizations of how your modules, files, and packages depend on each other. Think of it as a map for navigating through the underworld of tangled dependencies.

It shows you:
- Who imports what from where
- Which files are highly coupled (and might need refactoring)
- Circular dependencies that could cause problems
- How third-party libraries fit into your architecture

## Features

### Core Analysis
- File and module-level dependency tracking
- Import resolution (including relative imports)
- Separation of internal code vs third-party libraries
- Automatic detection of circular dependencies
- Coupling and cohesion metrics calculation

### Visualization
- Interactive 3D graph with hierarchical layout
- Color-coded modules (same module = same color family)
- Red highlighting for circular dependencies
- Orange highlighting for highly coupled files (top 20%)
- Arrow thickness shows number of imports
- Click arrows to see exact dependencies
- Switchable layouts (hierarchical, force-directed, circular)

### Input Methods
- GitHub repository URL (uses GitHub API)
- Local folder drag & drop (up to 10MB)
- Import from previously exported JSON/TOML files

### Metrics & Analysis
- Afferent coupling (how many modules depend on this one)
- Efferent coupling (how many modules this one depends on)
- Instability metric
- Global project statistics
- Per-file detailed metrics

### Advanced Features
- Diff mode: compare dependencies between commits or branches
- Filter panel: hide/show specific modules
- Hotspot detection: identify architectural pain points
- Export to JSON/TOML for later analysis
- Multiple layout algorithms

## Tech Stack

### Backend
- FastAPI for the REST API
- Python's `ast` module for static analysis
- NetworkX for graph algorithms and cycle detection
- Server-Sent Events (SSE) for progress updates
- aiohttp for async GitHub API calls

### Frontend
- React 18 + TypeScript
- Vite for build tooling
- React Three Fiber (Three.js for React)
- Zustand for state management
- Tailwind CSS + shadcn/ui components

## Architecture

```
┌─────────────┐
│   Browser   │
│  (Frontend) │
└──────┬──────┘
       │ HTTP/SSE
       ▼
┌─────────────┐
│   FastAPI   │
│  (Backend)  │
└──────┬──────┘
       │
       ├─► AST Parser ──► Import Resolver
       │
       ├─► NetworkX ──► Cycle Detector
       │
       ├─► Metrics Calculator
       │
       └─► Layout Engine ──► 3D Positions
```

The backend is stateless - every analysis is done on-demand. GitHub repos are fetched via API (no cloning), and drag-dropped files are processed in-memory.

## How It Works

1. **Input**: You provide a GitHub URL, drag a local folder, or load a saved analysis file
2. **Parsing**: Backend parses all `.py` files using Python's AST
3. **Resolution**: Resolves all imports (relative and absolute) and classifies them as internal or third-party
4. **Graph Building**: Creates a directed graph where nodes are files and edges are dependencies
5. **Metrics**: Calculates coupling metrics and detects circular dependencies
6. **Layout**: Positions nodes in 3D space using hierarchical layout
7. **Coloring**: Assigns colors based on module structure, with overrides for problems
8. **Visualization**: Renders interactive 3D scene in your browser

## Installation

### Using Docker (recommended)

```bash
docker-compose up
```

Then open http://localhost:5173

### Manual Setup

Backend:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

## Usage

1. Open the web interface
2. Choose your input method:
   - Paste a GitHub URL (e.g., `https://github.com/user/repo`)
   - Drag and drop a local project folder
   - Upload a previously exported JSON/TOML file
3. Wait for analysis (progress shown with steps)
4. Interact with the 3D graph:
   - Click and drag to rotate
   - Scroll to zoom
   - Click nodes to see detailed metrics
   - Click arrows to see exact import details
5. Use the bottom panel to view metrics (Global/Entity tabs)
6. Export results for later review

## Export Format

Exports include the full dependency graph plus metrics:

```json
{
  "graph": {
    "nodes": [
      {
        "id": "package.module.file",
        "label": "file.py",
        "type": "internal",
        "position": {"x": 0, "y": 0, "z": 0},
        "color": "#hex",
        "metrics": {
          "afferent_coupling": 5,
          "efferent_coupling": 3,
          "instability": 0.375
        }
      }
    ],
    "edges": [
      {
        "source": "module_a",
        "target": "module_b",
        "imports": ["ClassX", "func_y"],
        "weight": 2
      }
    ]
  },
  "global_metrics": { ... }
}
```

## Limitations

- GitHub API rate limit: 60 requests/hour (unauthenticated)
- File upload size: 10MB maximum
- Only analyzes Python files (`.py`)
- Standard library imports are ignored
- Syntax errors in source files are skipped with warnings

## Future Ideas

See [PROPOSALS.md](PROPOSALS.md) for planned features like:
- Community detection and clustering algorithms
- Automated refactoring suggestions
- Live filesystem monitoring
- And more...

## Contributing

This is an early-stage project. Issues and PRs welcome.

## License

MIT
