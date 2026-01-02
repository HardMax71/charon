# Architectural Fitness Functions

Charon supports Architectural Fitness Functions: automated rules that validate your codebase architecture. Hook them
into CI/CD to enforce architectural standards and catch violations before they become tech debt.

## What Are Fitness Functions?

Think of them as unit tests for your architecture. They're executable specs that check whether your codebase follows the
design rules you've set. When someone adds an import that violates a layer boundary, the build fails.

## Why Bother?

- **Enforce boundaries**: Stop the API layer from poking the database directly
- **Keep quality in check**: Set limits on coupling, complexity, dependency depth
- **Prevent decay**: Catch violations early, not six months later during an incident
- **Document decisions**: Rules double as executable documentation
- **CI/CD integration**: Fail builds on violations
- **Track trends**: Monitor architectural health across commits

## How It Works

Fitness functions rely on the dependency graph and metrics computed during analysis.

**Import Classification** determines whether an import is internal, third-party, or stdlib:

```python
if is_standard_library(module):
    return "stdlib"  # Ignored
elif module in project_modules:
    return "internal"
else:
    return "third_party"
```

**Coupling Calculation** computes afferent (incoming) and efferent (outgoing) coupling for each node, plus instability:

```python
for node in graph:
    Ca = in_degree(node)   # Afferent
    Ce = out_degree(node)  # Efferent
    I = Ce / (Ca + Ce)     # Instability
```

**Circular Dependency Detection** uses NetworkX cycle detection:

```python
cycles = networkx.simple_cycles(graph)
```

## Next Steps

- [Rule Types](rule_types.md) - Available rule types and their parameters
- [Usage & Configuration](usage.md) - API, CLI, and config file formats
- [CI/CD Integration](cicd.md) - GitHub Actions, GitLab CI, Jenkins examples
- [Best Practices](best_practices.md) - Tips, troubleshooting, and FAQ
