<div align="center">
  <img src="frontend/public/icon.png" width="120" alt="Charon">
  <h1>Charon</h1>

  [![Type Check](https://github.com/HardMax71/charon/actions/workflows/type-check.yml/badge.svg)](https://github.com/HardMax71/charon/actions/workflows/type-check.yml)
  [![Ruff](https://github.com/HardMax71/charon/actions/workflows/ruff.yml/badge.svg)](https://github.com/HardMax71/charon/actions/workflows/ruff.yml)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
</div>

Ever wondered what your codebase actually looks like? Not the syntax, but the structure. The dependencies. The tangled mess of imports that somehow became your architecture. Charon shows you exactly that, in 3D, so you can finally see where things went wrong (or right).

## Getting Started

The fastest way to see what Charon does is to just run it with Docker:

```bash
docker compose up
```

Then open http://localhost:5173 and paste in a GitHub repo URL. Within seconds you'll see your (or someone else's) codebase rendered as a 3D graph. Red nodes are circular dependencies, orange ones are highly coupled, and the arrows show who imports what.

If you don't want Docker, you can run the backend and frontend separately:

```bash
# Backend (FastAPI with uv)
cd backend
uv sync
uv run uvicorn app.main:app --reload

# Frontend (React)
cd frontend
npm install
npm run dev
```

Backend runs on port 8000, frontend on 5173. Both need to be running at the same time. The backend uses [uv](https://docs.astral.sh/uv/) for faster dependency management instead of pip.

## What It Does

Charon takes Python code and turns it into a graph. Each file becomes a node, each import becomes an edge. Then it calculates coupling metrics, detects circular dependencies, and positions everything in 3D space. You can analyze code three ways: paste a GitHub URL, drag and drop a local folder (10MB max), or import a saved analysis file.

The visualization is interactive. Drag to rotate, scroll to zoom, click nodes for metrics, click arrows for import details. Three layout modes available: hierarchical, force-directed, and circular. Colors show module boundaries (files in same module get similar colors), with red for circular dependencies and orange for high coupling.

Beyond basic visualization, there's temporal analysis (watch dependencies evolve over git history), fitness functions (enforce architectural rules in CI/CD), health scoring (single number for codebase health), cluster detection (find natural groupings for package boundaries), refactoring suggestions (spot god objects and code smells), impact analysis (see blast radius of changes), what-if mode (test refactoring ideas by editing the graph), export tools (generate diagrams and docs), and complexity integration (hot zones where high complexity meets high coupling).
More data about actual architecture is in [ARCHITECTURE.md](docs/ARCHITECTURE.md).

See [PROPOSALS.md](PROPOSALS.md) for the full feature list and what's planned next.

## How It Works Under The Hood

The backend uses Python's AST module to parse source files without executing them. It walks the AST looking for import statements, resolves them (including relative imports), and classifies them as internal or third-party. Then it builds a directed graph with NetworkX and runs algorithms for cycle detection, clustering, and metrics calculation.

Positions in 3D space are computed using a hierarchical layout algorithm that places files in layers based on their position in the dependency tree. Third-party libraries go at the bottom, application code goes on top, and everything in between gets arranged to minimize edge crossings.

The frontend is React with Three.js (via React Three Fiber) for 3D rendering. State management uses Zustand. The UI is Tailwind CSS with some custom components. Communication with the backend uses REST for most things and Server-Sent Events for progress updates during long-running analyses.

Everything is stateless. The backend doesn't store anything. Each analysis is done from scratch, which keeps things simple but means you should export results if you want to save them.

## Limitations Worth Knowing

GitHub API rate limit is 60 requests per hour without authentication. If you're analyzing lots of repos, you'll hit it. The solution is to clone locally or set up a GitHub token.

File uploads are capped at 10MB to avoid memory issues. Larger projects should be analyzed via GitHub URL instead.

Only Python files are analyzed. If your project is multi-language, only the Python parts will show up.

Standard library imports are ignored because they're not part of your architecture. Third-party libraries are included but separated visually.

Syntax errors in source files get skipped with a warning. If you have broken Python files, they won't appear in the graph.

## Contributing

This is an open source project. If you find bugs, open an issue. If you want to add features, open a PR. The code is split between backend (FastAPI, Python) and frontend (React, TypeScript), so pick whichever you're comfortable with.

## License

[MIT](LICENSE). Do whatever you want with it.
