#!/usr/bin/env python3
"""
Test script to generate profiling examples.

This script simulates typical backend workload for profiling demonstration.
No external dependencies required.
"""

import ast
import json
import time


def parse_python_files():
    """Simulate parsing Python files (like analyzer_service does)."""
    sample_code = """
import os
import sys
from typing import Dict, List

class DependencyAnalyzer:
    def __init__(self, root_path: str):
        self.root_path = root_path
        self.modules = {}
        self.dependencies = {}

    def analyze_file(self, filepath: str) -> Dict:
        with open(filepath, 'r') as f:
            content = f.read()
        tree = ast.parse(content)
        imports = []
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append(alias.name)
            elif isinstance(node, ast.ImportFrom):
                imports.append(node.module or '')
        return {'file': filepath, 'imports': imports}

    def calculate_coupling(self):
        coupling_scores = {}
        for module in self.modules:
            afferent = sum(1 for m in self.modules if module in self.dependencies.get(m, []))
            efferent = len(self.dependencies.get(module, []))
            coupling_scores[module] = {'afferent': afferent, 'efferent': efferent}
        return coupling_scores
"""

    # Parse the sample code multiple times (CPU intensive)
    for i in range(20):
        tree = ast.parse(sample_code)

        # Walk the AST (typical operation)
        node_count = 0
        for node in ast.walk(tree):
            node_count += 1

        # Simulate extracting imports
        imports = []
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append(alias.name)


def calculate_graph_metrics():
    """Simulate graph metrics calculation (like metrics_service does)."""
    # Build a sample dependency graph
    num_nodes = 150
    graph = {f"module_{i}": set() for i in range(num_nodes)}

    # Add edges (dependencies)
    for i in range(num_nodes):
        # Each module depends on 3-7 other modules
        for j in range(3, min(8, num_nodes - i)):
            graph[f"module_{i}"].add(f"module_{i+j}")

    # Calculate coupling metrics (O(n²) operation - slow!)
    coupling_metrics = {}
    for node in graph:
        afferent = 0
        efferent = len(graph[node])

        # Count afferent coupling (who depends on me)
        for other_node in graph:
            if node in graph[other_node]:
                afferent += 1

        coupling_metrics[node] = {
            'afferent': afferent,
            'efferent': efferent,
            'instability': efferent / (afferent + efferent) if (afferent + efferent) > 0 else 0
        }

    # Calculate centrality (expensive nested loops)
    centrality_scores = {}
    for node in graph:
        score = 0
        for other in graph:
            if other != node:
                # Simulate distance calculation
                score += 1 if node in graph[other] else 0
        centrality_scores[node] = score


def detect_circular_dependencies():
    """Simulate circular dependency detection (graph algorithm)."""
    # Build graph
    num_nodes = 100
    graph = {f"module_{i}": [] for i in range(num_nodes)}

    for i in range(num_nodes):
        # Add forward edges
        if i + 1 < num_nodes:
            graph[f"module_{i}"].append(f"module_{i+1}")
        # Add some backward edges (create cycles)
        if i % 10 == 0 and i > 0:
            graph[f"module_{i}"].append(f"module_{i-5}")

    # DFS-based cycle detection (recursive, stack-intensive)
    visited = set()
    rec_stack = set()
    cycles = []

    def dfs(node, path):
        visited.add(node)
        rec_stack.add(node)

        for neighbor in graph.get(node, []):
            if neighbor not in visited:
                if dfs(neighbor, path + [neighbor]):
                    return True
            elif neighbor in rec_stack:
                # Found cycle
                cycle_start = path.index(neighbor)
                cycles.append(path[cycle_start:])
                return True

        rec_stack.remove(node)
        return False

    for node in graph:
        if node not in visited:
            dfs(node, [node])


def analyze_complexity():
    """Simulate complexity analysis (like complexity_service does)."""
    sample_functions = []

    # Generate sample code with varying complexity
    for i in range(30):
        code = f"""
def function_{i}(data, threshold=10):
    result = []
    count = 0

    for item in data:
        if item > threshold:
            for sub in item.split(','):
                if sub.strip():
                    count += 1
                    if count % 2 == 0:
                        result.append(sub.upper())
                    else:
                        result.append(sub.lower())

    while count > 0:
        count -= 1
        if count % 5 == 0:
            result.reverse()

    return result
"""
        sample_functions.append(code)

    # Parse and analyze each function
    complexity_scores = []
    for code in sample_functions:
        try:
            tree = ast.parse(code)
            # Count complexity indicators
            complexity = 0
            for node in ast.walk(tree):
                if isinstance(node, (ast.If, ast.For, ast.While, ast.ExceptHandler)):
                    complexity += 1
            complexity_scores.append(complexity)
        except SyntaxError:
            complexity_scores.append(0)


def generate_export_data():
    """Simulate data export (JSON serialization)."""
    # Build large nested data structure
    data = {
        'nodes': [],
        'edges': [],
        'metrics': {}
    }

    for i in range(200):
        data['nodes'].append({
            'id': f'node_{i}',
            'label': f'Module {i}',
            'type': 'internal' if i % 3 == 0 else 'third_party',
            'metrics': {
                'coupling': i % 20,
                'complexity': i % 15,
                'loc': i * 100
            }
        })

    for i in range(500):
        data['edges'].append({
            'id': f'edge_{i}',
            'source': f'node_{i % 200}',
            'target': f'node_{(i + 5) % 200}',
            'weight': i % 10
        })

    # Serialize to JSON (CPU and memory intensive)
    json_str = json.dumps(data, indent=2)
    # Parse back
    json.loads(json_str)


def simulate_file_io():
    """Simulate file I/O operations."""
    # Create temporary data
    temp_data = "x" * 10000  # 10KB of data

    # Simulate writing
    for i in range(10):
        [f"line_{j}: {temp_data[:100]}\n" for j in range(100)]


def main():
    """Run all simulations to generate realistic profiling data."""
    print("Starting profiling workload simulation...")
    print("=" * 50)

    start = time.time()
    iteration = 0

    # Run workload for at least 3 seconds to allow profilers to collect samples
    while time.time() - start < 3.0:
        iteration += 1
        print(f"\n--- Iteration {iteration} ---")

        print("1. Parsing Python files (AST operations)...")
        parse_python_files()

        print("2. Calculating graph metrics (O(n²) algorithms)...")
        calculate_graph_metrics()

        print("3. Detecting circular dependencies (DFS traversal)...")
        detect_circular_dependencies()

        print("4. Analyzing code complexity...")
        analyze_complexity()

        print("5. Generating export data (JSON serialization)...")
        generate_export_data()

        print("6. Simulating file I/O...")
        simulate_file_io()

        # Run some operations again to create deeper call stacks
        print("7. Running intensive workload (nested operations)...")
        for _ in range(2):
            calculate_graph_metrics()
            detect_circular_dependencies()

    elapsed = time.time() - start
    print("\n" + "=" * 50)
    print(f"Workload complete! Elapsed time: {elapsed:.2f}s ({iteration} iterations)")
    print("\nThis execution generated realistic profiling data including:")
    print("  - AST parsing and traversal")
    print("  - Graph algorithm execution (O(n²) complexity)")
    print("  - Recursive function calls (DFS)")
    print("  - JSON serialization/deserialization")
    print("  - Nested loops and conditionals")


if __name__ == "__main__":
    main()
