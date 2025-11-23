# Charon - Quick Start Guide

## Getting Started

### Option 1: Using Docker (Recommended)

The easiest way to get Charon up and running:

```bash
# From the project root
docker-compose up --build
```

Then open your browser to:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000

### Option 2: Manual Setup

#### Backend

```bash
cd backend

# Sync dependencies with uv
uv sync

# Run the server
uv run uvicorn app.main:app --reload
```

The API will be available at http://localhost:8000

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

The frontend will be available at http://localhost:5173

## Using Charon

### 1. Analyze a GitHub Repository

1. Open Charon in your browser
2. Select the "GitHub" tab
3. Paste a GitHub repo URL (e.g., `https://github.com/psf/requests`)
4. Click "Analyze Repository"
5. Wait for the analysis to complete (progress shown)

### 2. Analyze a Local Project

1. Select the "Local Folder" tab
2. Drag and drop your project folder into the zone
3. Only Python (.py) files will be analyzed
4. Max size: 10MB

### 3. Import Previously Saved Analysis

1. Select the "Import" tab
2. Upload a JSON or TOML file exported from Charon
3. The visualization will load immediately

## Interacting with the Visualization

### Controls
- **Click and drag**: Rotate the camera
- **Scroll**: Zoom in/out
- **Click a node**: Select it and view detailed metrics
- **Click an arrow**: See exact import details

### Understanding Colors
- **Red nodes**: Part of circular dependencies
- **Orange nodes**: High coupling (top 20%)
- **Other colors**: Different modules (submodules share color families)

### Metrics Panel
- **Global tab**: Overview of entire project
- **Entity tab**: Details for selected node

### Layouts
- **Hierarchical** (default): Tree-like structure, third-party libs at bottom
- **Force-Directed**: Organic clustering
- **Circular**: Nodes arranged in circle

## Exporting Results

To save your analysis:

```javascript
// In browser console
// This feature will be added to the UI
```

Or use the backend API directly:

```bash
curl -X POST http://localhost:8000/api/export \
  -H "Content-Type: application/json" \
  -d '{"graph": {...}, "global_metrics": {...}, "project_name": "myproject", "format": "json"}'
```

## Troubleshooting

### "Failed to fetch repository"
- Check that the GitHub URL is correct
- GitHub API has a rate limit of 60 requests/hour (unauthenticated)
- Make sure the repository is public

### "Total file size exceeds 10MB"
- The drag-and-drop upload is limited to 10MB
- For larger projects, use the GitHub URL option
- Or increase `MAX_UPLOAD_SIZE_MB` in backend config

### Empty visualization
- Make sure your project has Python files (.py)
- Check the browser console for errors
- Verify the backend is running

## Development

### Running Tests

Backend:
```bash
cd backend
pytest
```

Frontend:
```bash
cd frontend
npm test
```

### Code Structure

```
charon/
├── backend/          # FastAPI backend
│   ├── app/
│   │   ├── api/      # API routes
│   │   ├── core/     # Configuration & models
│   │   ├── services/ # Business logic
│   │   └── utils/    # Helper functions
│   └── tests/
├── frontend/         # React frontend
│   └── src/
│       ├── components/  # React components
│       ├── services/    # API & file handling
│       ├── stores/      # State management
│       └── types/       # TypeScript types
└── docker-compose.yml
```

## Next Steps

- Read [PROPOSALS.md](PROPOSALS.md) for upcoming features
- Check out the [README.md](README.md) for detailed documentation
- Contribute! Issues and PRs are welcome

## Tips

1. Start with small projects to get familiar with the interface
2. Use the diff mode to track architectural changes over time
3. Export your analysis regularly to track improvements
4. High coupling isn't always bad - use context to decide what to refactor
