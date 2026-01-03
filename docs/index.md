# Charon

**3D Python Code Dependency Visualizer**

You know that feeling when you're staring at a codebase trying to understand how everything connects? Charon turns that mental model into something you can actually see: a 3D graph where files are nodes, imports are edges, and architectural problems light up in red.

## Getting Started

Quickest way to try it:

```bash
docker compose up
```

Open [http://localhost:5173](http://localhost:5173), paste a GitHub repo URL, and watch it render. Red nodes mean circular dependencies, orange means high coupling, arrows show import direction.

No Docker? Run backend and frontend separately:

```bash
# Backend (FastAPI + uv)
cd backend
uv sync
uv run uvicorn app.main:app --reload

# Frontend (React)
cd frontend
npm install
npm run dev
```

Backend listens on port 8000, frontend on 5173. You need both running. We use [uv](https://docs.astral.sh/uv/) instead of pip because it's faster.

### Pre-built Docker Images

Every commit to main publishes images to [GitHub Container Registry](https://github.com/HardMax71/charon/pkgs/container/charon-backend):

```bash
docker pull ghcr.io/hardmax71/charon-backend:latest
docker pull ghcr.io/hardmax71/charon-frontend:latest

# Or pin to a specific commit
docker pull ghcr.io/hardmax71/charon-backend:main-abc1234
```

Release tags work too (e.g., `v0.0.8`).

## What You Get

Charon parses Python and JavaScript/TypeScript code and builds a dependency graph. You can feed it code three ways: GitHub URL, drag-and-drop a folder (10MB total size limit), or import a previous analysis.

The visualization is fully interactive. Drag to rotate, scroll to zoom, click nodes for metrics, click edges for import details. Three layout modes: hierarchical, force-directed, and circular. Files in the same module get similar colors.

Beyond the pretty graph:

- **Temporal analysis**: see how dependencies evolved across git history
- **Fitness functions**: enforce architectural rules in CI/CD
- **Health scoring**: one number summarizing codebase quality
- **Cluster detection**: find natural package boundaries
- **Refactoring hints**: spot god objects and code smells
- **Impact analysis**: understand blast radius before changing things
- **What-if mode**: test refactoring ideas by editing the graph directly
- **Export**: generate diagrams and documentation

## Under the Hood

The backend uses Python's [ast](https://docs.python.org/3/library/ast.html) module for Python-only analysis and tree-sitter parsers for multi-language analysis. It finds imports, resolves relative paths, classifies dependencies as internal or third-party, then builds a [NetworkX](https://networkx.org/) graph. From there: cycle detection, clustering, metrics.

3D positioning uses a spring layout with third-party libraries separated below the internal graph.

Frontend is [React](https://react.dev/) with [Three.js](https://threejs.org/) (via [React Three Fiber](https://r3f.docs.pmnd.rs/)) for rendering. State lives in [Zustand](https://zustand-demo.pmnd.rs/). Styling is [Tailwind](https://tailwindcss.com/). Backend communication is REST plus [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) for progress updates.

Analysis requests are stateless, but GitHub auth sessions are stored in memory and fitness results can be saved on demand. Export results if you want to keep them.

## Limitations

- **GitHub rate limit**: 60 requests/hour without auth. Clone locally or set up a token if you're hitting it.
- **Upload cap**: 10MB total source size limit.
- **Language support**: JavaScript/TypeScript supported; Go/Java/Rust are not yet supported.
- **No stdlib**: standard library imports are filtered out (they're not your architecture).
- **Syntax errors**: broken files get skipped with a warning.

## Contributing

Found a bug? [Open an issue](https://github.com/HardMax71/charon/issues). Want to add something? [Send a PR](https://github.com/HardMax71/charon/pulls). Backend is Python/FastAPI, frontend is TypeScript/React. Pick your poison.

## License

[MIT](https://github.com/HardMax71/charon/blob/main/LICENSE). Do what you want.
