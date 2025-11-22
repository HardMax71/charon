# Future Feature Proposals

This document tracks ideas for future enhancements to Charon. These aren't currently prioritized but could be valuable additions.

## 1. Community Detection & Clustering - DONE

Automatically identify groups of tightly coupled modules using graph clustering algorithms (Louvain, Girvan-Newman, etc.). This would help visualize natural boundaries in the codebase and suggest potential package reorganization.

**Use case**: In a monolithic application, automatically discover which files should be grouped together as microservices.

**Implementation**:
- Use NetworkX community detection algorithms
- Visualize clusters with bounding boxes or convex hulls in 3D
- Show cluster cohesion metrics
- Suggest package boundaries based on clusters

## 2. Automated Refactoring Suggestions - DONE

Analyze the dependency graph and code metrics to suggest concrete refactoring opportunities based on SOLID principles and common patterns.

**Examples**:
- "Module X has high efferent coupling (15 dependencies). Consider applying the Facade pattern."
- "Circular dependency detected between A and B. Suggest extracting common interface to C."
- "God object detected: Class X has 50+ methods. Consider splitting into separate responsibilities."
- "Feature envy detected: Module A heavily uses Module B's internals. Consider moving functionality."

**Implementation**:
- Pattern matching on graph structure
- Detect anti-patterns (god objects, feature envy, inappropriate intimacy)
- Calculate LCOM (Lack of Cohesion in Methods) for classes
- Generate actionable suggestions with code examples

## 3. Live Filesystem Monitoring

Watch the local project directory for changes and update the dependency graph in real-time as you refactor code.

**Use case**: Open Charon in a second monitor while refactoring. See dependencies update live as you move code around.

**Implementation**:
- Use filesystem watchers (watchdog in Python, chokidar in Node)
- Incremental re-analysis (only re-parse changed files)
- WebSocket connection for live updates to frontend
- Diff highlighting (show what changed since last analysis)
- Time-series view of dependency evolution

**Challenges**:
- Performance: Full re-analysis on every save would be slow
- Need efficient incremental parsing and graph updates
- Handling temporary invalid states during editing

## 4. Multi-Language Support

Extend beyond Python to support JavaScript/TypeScript, Java, Go, Rust, etc.

**Implementation**:
- Pluggable parser system (AST parsers for each language)
- Language-specific import resolution rules
- Unified graph representation
- Cross-language dependency tracking (e.g., Python calling Node.js microservice)

## 5. Architectural Fitness Functions - DONE

Define and track architectural rules over time. Fail CI builds if rules are violated.

**Examples**:
- "No modules in /api may import from /database directly"
- "Maximum efferent coupling: 10"
- "No circular dependencies allowed"
- "Third-party dependencies must be < 20% of total imports"

**Implementation**:
- DSL for defining rules (YAML/JSON configuration)
- CLI mode for CI/CD integration
- Rule violation reports
- Historical trend tracking

**Features**:
- 6 rule types: import_restriction, max_coupling, no_circular, max_third_party_percent, max_depth, max_complexity
- Severity levels: error, warning, info
- REST API endpoints for validation
- CLI tool with exit codes for CI/CD
- Historical tracking with trend analysis
- Pattern-based module filtering
- Comprehensive documentation and examples

## 6. Dependency Impact Analysis - DONE

When selecting a node, highlight all transitive dependencies (what depends on this, recursively) to understand blast radius of changes.

**Use case**: "If I change this module, what else might break?"

**Visualization**:
- Fade out unaffected nodes
- Color-code impact levels (direct, 1-hop, 2-hop, etc.)
- Show impact metrics (% of codebase affected)

## 7. Code Complexity Integration - DONE

Integrate with complexity analysis tools (radon, mccabe) to show cyclomatic complexity alongside coupling metrics.

**Visualization**:
- Node size proportional to complexity
- Hot zones: high coupling + high complexity = red alerts
- Prioritize refactoring by combining metrics

## 8. Export to Architecture Diagrams - DONE

Generate C4 model diagrams, UML package diagrams, or PlantUML from the dependency graph.

**Formats**:
- C4 Context/Container/Component diagrams
- UML package diagrams
- PlantUML source
- Mermaid diagrams
- Draw.io XML

## 9. Dependency Health Score - DONE

Calculate a single health score for the project based on:
- Circular dependency count
- Average coupling levels
- Instability distribution
- Depth of inheritance trees
- Number of god objects

Track score over time to measure architectural improvements.

## 10. Interactive Refactoring Scenarios

"What if" mode: temporarily remove/add dependencies and see how metrics change.

**Use case**: "What if I extract this shared module? How would coupling change?"

**Implementation**:
- Fork the graph
- Allow manual edge/node manipulation
- Recalculate metrics on the fly
- Compare before/after side-by-side

## 11. Team Ownership Mapping

Integrate with git blame/CODEOWNERS to show which teams own which modules. Visualize cross-team dependencies.

**Use case**: Identify organizational coupling ("Team A depends heavily on Team B's code").

## 12. Performance Profiling Integration

Overlay runtime performance data (from cProfile, py-spy, etc.) onto the dependency graph.

**Use case**: "This module is a performance bottleneck AND highly coupled. Priority 1 for optimization."

## 13. Documentation Generation - DONE

Auto-generate architectural documentation from the graph, including:
- Module dependency tables
- Coupling reports
- Circular dependency lists
- Third-party library usage audit

Export to Markdown, PDF, or HTML.

## 14. Temporal Analysis - DONE

Analyze how dependencies evolved over git history. Show time-lapse of architectural changes.

**Visualizations**:
- Slider to scrub through commit history
- Heatmap of dependency churn
- Identify when circular dependencies were introduced
