# Profiling Examples

This directory contains example profiling data generated from `profile_test.py`, a self-contained script that simulates typical Charon backend workload.

## Generated Files

### 1. `profile_test.py`
Self-contained Python script that simulates realistic backend operations:
- AST parsing and traversal (typical in code analysis)
- Graph metrics calculation with O(n²) complexity
- Recursive DFS for circular dependency detection
- Code complexity analysis
- JSON serialization/deserialization
- File I/O simulation

The script runs continuously for ~3 seconds to allow profilers to collect meaningful samples.

### 2. `cprofile_example.prof`
**Format**: Python cProfile binary format (pstats)
**Size**: ~44 KB
**Profiler**: cProfile (built-in Python profiler)
**Characteristics**:
- Deterministic tracing (every function call is recorded)
- Function-level granularity
- 2-5x performance overhead
- Includes call counts, total time, cumulative time

**How to view**:
```bash
# View in terminal
python3 -m pstats cprofile_example.prof
# Then use commands like:
# - stats 10 (show top 10 functions by time)
# - sort cumulative (sort by cumulative time)
# - stats <function_name> (show stats for specific function)

# Or use snakeviz for visualization
pip install snakeviz
snakeviz cprofile_example.prof
```

**How to generate**:
```bash
# Profile any Python script
python3 -m cProfile -o output.prof your_script.py

# Profile Charon backend
cd backend
python3 -m cProfile -o charon_profile.prof -m uvicorn app.main:app
```

### 3. `pyspy_example.json`
**Format**: Speedscope JSON
**Size**: ~16 KB
**Profiler**: py-spy
**Samples**: 313 samples @ 100 Hz
**Characteristics**:
- Sampling-based profiling (<1% overhead)
- Production-safe (can attach to running processes)
- Line-level granularity
- Written in Rust for low overhead

**How to view**:
```bash
# Upload to https://www.speedscope.app/
# Or use speedscope CLI
npm install -g speedscope
speedscope pyspy_example.json
```

**How to generate**:
```bash
# Record a script execution
py-spy record -o output.json --format speedscope -- python3 your_script.py

# Attach to running process (requires sudo)
py-spy record -o output.json --format speedscope --pid <PID>

# Profile Charon backend server
# Terminal 1: Start server
uvicorn app.main:app --host 0.0.0.0 --port 8001

# Terminal 2: Profile it
py-spy record -o charon_profile.json --format speedscope --pid $(pgrep -f "uvicorn app.main:app")
# Let it run for a few seconds, then Ctrl+C
```

### 4. `pyspy_flamegraph.svg`
**Format**: Flamegraph SVG
**Size**: ~60 KB
**Profiler**: py-spy
**Samples**: 282 samples @ 100 Hz
**Characteristics**:
- Interactive SVG visualization
- Width represents time spent in function
- Height represents call stack depth
- Click to zoom into specific call paths

**How to view**:
```bash
# Open in any web browser
firefox pyspy_flamegraph.svg
# Or
open pyspy_flamegraph.svg  # macOS
xdg-open pyspy_flamegraph.svg  # Linux
```

**How to generate**:
```bash
# Generate flamegraph
py-spy record -o output.svg --format flamegraph -- python3 your_script.py

# For running processes
py-spy record -o output.svg --format flamegraph --pid <PID>
```

## Installation

### cProfile
Built into Python - no installation needed.

### py-spy
```bash
# Using pip
pip install py-spy

# Using uv (in backend venv)
cd backend
source .venv/bin/activate
uv pip install py-spy

# Using cargo
cargo install py-spy

# Using package managers
# Arch Linux
sudo pacman -S py-spy

# macOS
brew install py-spy
```

## Profiling Charon Backend

### Quick Profile (cProfile)
```bash
cd backend
source .venv/bin/activate

# Profile startup and first request
python3 -m cProfile -o charon_startup.prof -m uvicorn app.main:app --host 0.0.0.0 --port 8001

# In another terminal, make some requests
curl http://localhost:8001/api/health
curl -X POST http://localhost:8001/api/analyze -H "Content-Type: application/json" -d '{"path": "/some/path"}'

# Stop server with Ctrl+C
# View results
python3 -m pstats charon_startup.prof
```

### Production Profile (py-spy)
```bash
cd backend
source .venv/bin/activate

# Terminal 1: Start server normally
uvicorn app.main:app --host 0.0.0.0 --port 8001

# Terminal 2: Profile for 30 seconds
py-spy record -o charon_production.svg --format flamegraph --duration 30 --pid $(pgrep -f "uvicorn app.main:app")

# Or with speedscope format
py-spy record -o charon_production.json --format speedscope --duration 30 --pid $(pgrep -f "uvicorn app.main:app")
```

### Load Testing + Profiling
```bash
# Terminal 1: Start server
uvicorn app.main:app --host 0.0.0.0 --port 8001

# Terminal 2: Start profiling
py-spy record -o charon_load.svg --format flamegraph --pid $(pgrep -f "uvicorn app.main:app")

# Terminal 3: Generate load
# Install wrk or ab (Apache Bench)
wrk -t4 -c100 -d30s http://localhost:8001/api/health

# Stop profiling in Terminal 2 with Ctrl+C
```

## Interpreting Results

### cProfile
- **tottime**: Total time spent in function (excluding subcalls)
- **cumtime**: Cumulative time (including subcalls)
- **ncalls**: Number of calls
- **percall**: Average time per call

**Look for**:
- Functions with high tottime (CPU bottlenecks)
- Functions with high cumtime but low tottime (call overhead)
- Unexpected high ncalls (inefficient algorithms)

### py-spy (Flamegraph)
- **Width**: Proportion of total execution time
- **Height**: Call stack depth
- **Color**: Random (for differentiation only)

**Look for**:
- Wide plateaus (functions consuming most time)
- Tall stacks (deep recursion or call chains)
- Repeated patterns (potential for caching)

### py-spy (Speedscope)
Three views:
1. **Time Order**: Shows execution timeline
2. **Left Heavy**: Focuses on hot paths
3. **Sandwich**: Shows callers and callees

**Look for**:
- Functions that appear frequently in Left Heavy view
- Long-running sections in Time Order view
- Unexpected callers in Sandwich view

## Integration with Charon

These profiling examples demonstrate the data formats that the **Performance Profiling Integration** feature (Feature #12) will parse and visualize.

See `/home/user/Desktop/charon/docs/PERFORMANCE_PROFILING_INTEGRATION_IMPLEMENTATION.md` for the complete implementation guide.

### Priority Scoring

The implementation will combine profiling data with dependency graph metrics:

```
priority_score = (
    0.40 × execution_time_normalized +
    0.30 × coupling_normalized +
    0.15 × complexity_normalized +
    0.10 × memory_normalized +
    0.05 × call_frequency_normalized
) × boosters
```

**Example**: A module that is both a performance bottleneck AND highly coupled will be flagged as Priority 1 for optimization.

## References

- [cProfile Documentation](https://docs.python.org/3/library/profile.html)
- [py-spy GitHub](https://github.com/benfred/py-spy)
- [Speedscope](https://www.speedscope.app/)
- [Brendan Gregg's Flamegraphs](https://www.brendangregg.com/flamegraphs.html)
