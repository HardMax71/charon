<div align="center">
  <img src="frontend/public/icon.png" width="100" alt="Charon">
  <h1>Charon</h1>

  [![Type Check](https://github.com/HardMax71/charon/actions/workflows/type-check.yml/badge.svg?branch=main)](https://github.com/HardMax71/charon/actions/workflows/type-check.yml)
  [![Ruff](https://github.com/HardMax71/charon/actions/workflows/ruff.yml/badge.svg?branch=main)](https://github.com/HardMax71/charon/actions/workflows/ruff.yml)
  [![Backend Tests](https://github.com/HardMax71/charon/actions/workflows/backend-tests.yml/badge.svg?branch=main)](https://github.com/HardMax71/charon/actions/workflows/backend-tests.yml)
<br/>
  [![Docker Publish](https://github.com/HardMax71/charon/actions/workflows/docker-publish.yml/badge.svg?branch=main)](https://github.com/HardMax71/charon/actions/workflows/docker-publish.yml)
  [![Release](https://github.com/HardMax71/charon/actions/workflows/release.yml/badge.svg)](https://github.com/HardMax71/charon/actions/workflows/release.yml)
  [![Docs](https://github.com/HardMax71/charon/actions/workflows/docs.yml/badge.svg)](https://hardmax71.github.io/charon)
<br/>
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
</div>

3D visualization of Python code dependencies. Paste a GitHub URL, see your architecture as an interactive graph. Red nodes are circular dependencies, orange ones are highly coupled.

## Quick Start

```bash
docker compose up
```

Open http://localhost:5173, paste a repo URL, done.

Without Docker:

```bash
# Backend
cd backend && uv sync && uv run uvicorn app.main:app --reload

# Frontend
cd frontend && npm install && npm run dev
```

## Features

- **3D graph** — files as nodes, imports as edges, drag/zoom/click
- **Metrics** — coupling, cohesion, circular dependency detection
- **Layouts** — hierarchical, force-directed, circular
- **Analysis** — temporal evolution, impact analysis, refactoring suggestions
- **Export** — JSON, diagrams, docs

Full details in the [documentation](https://hardmax71.github.io/charon).

## License

[MIT](LICENSE)
