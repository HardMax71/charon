# Usage & Configuration

## API Endpoints

<swagger-ui src="../openapi.json" filter="fitness"/>

---

## CLI Tool

The CLI tool is implemented in [`fitness_check.py`](https://github.com/HardMax71/charon/blob/main/backend/app/cli/fitness_check.py) and is recommended for CI/CD integration.

### Basic Validation

```bash
python -m app.cli.fitness_check \
  --rules fitness_rules.yaml \
  --graph analysis_result.json
```

**Example output:**

```
Loading fitness rules from: fitness_rules.yaml
Loading dependency graph from: analysis_result.json
Found 3 enabled rules

======================================================================
VALIDATION SUMMARY
======================================================================
Status: All architectural fitness rules passed successfully.
Total Rules Evaluated: 3
Violations Found: 0

======================================================================

Validation PASSED - All rules satisfied
```

### Fail on Errors Only

```bash
python -m app.cli.fitness_check \
  --rules fitness_rules.yaml \
  --graph analysis_result.json \
  --fail-on-error
```

**Example output (with violations):**

```
Loading fitness rules from: fitness_rules.yaml
Loading dependency graph from: analysis_result.json
Found 3 enabled rules

======================================================================
VALIDATION SUMMARY
======================================================================
Status: Validation FAILED: Found 2 error(s), 1 warning(s)
Total Rules Evaluated: 3
Violations Found: 3
  Errors: 2
  Warnings: 1

======================================================================
VIOLATIONS
======================================================================

[1/3] ERROR: No Circular Dependencies
Circular dependency detected: app/services/a.py -> app/services/b.py -> app/services/a.py
  Affected modules: app/services/a.py, app/services/b.py
  Details:
    cycle: ['app/services/a.py', 'app/services/b.py']
    cycle_length: 2

[2/3] ERROR: API Layer Isolation
API modules must not import directly from database layer
  Affected modules: app/api/users.py, app/database/models.py
  Details:
    source: app/api/users.py
    target: app/database/models.py
    imports: ['UserModel']

[3/3] WARNING: Maximum Efferent Coupling
Module 'app/services/orchestrator.py' violates coupling constraint: Efferent coupling (15) exceeds maximum (10)
  Affected modules: app/services/orchestrator.py
  Details:
    module: app/services/orchestrator.py
    afferent_coupling: 3
    efferent_coupling: 15
    total_coupling: 18

======================================================================

Validation FAILED - Exiting with code 1
```

### Strict Mode (Fail on Warnings Too)

```bash
python -m app.cli.fitness_check \
  --rules fitness_rules.yaml \
  --graph analysis_result.json \
  --fail-on-error \
  --fail-on-warning
```

### Save Results and Track History

```bash
python -m app.cli.fitness_check \
  --rules fitness_rules.yaml \
  --graph analysis_result.json \
  --fail-on-error \
  --save-history \
  --project-name my-project \
  --output validation_result.json
```

**Example output:**

```
Loading fitness rules from: fitness_rules.yaml
Loading dependency graph from: analysis_result.json
Found 3 enabled rules

======================================================================
VALIDATION SUMMARY
======================================================================
Status: All architectural fitness rules passed successfully.
Total Rules Evaluated: 3
Violations Found: 0

======================================================================

Result saved to: validation_result.json
Result saved to history: .charon_fitness/my-project/fitness_history.jsonl

Validation PASSED - All rules satisfied
```

### JSON Output (for Scripts)

```bash
python -m app.cli.fitness_check \
  --rules fitness_rules.yaml \
  --graph analysis_result.json \
  --json-output
```

**Example output:**

```json
{
  "passed": true,
  "total_rules": 3,
  "violations": [],
  "errors": 0,
  "warnings": 0,
  "infos": 0,
  "timestamp": "2024-01-15T10:30:00.123456+00:00",
  "summary": "All architectural fitness rules passed successfully."
}
```

### Quiet Mode

```bash
python -m app.cli.fitness_check \
  --rules fitness_rules.yaml \
  --graph analysis_result.json \
  --fail-on-error \
  --quiet
```

**Example output:**

```
======================================================================
VALIDATION SUMMARY
======================================================================
Status: All architectural fitness rules passed successfully.
Total Rules Evaluated: 3
Violations Found: 0

======================================================================
```

### CLI Options Reference

Options are defined in [`main()`](https://github.com/HardMax71/charon/blob/main/backend/app/cli/fitness_check.py#L146-L227).

| Option | Description |
|--------|-------------|
| `--rules, -r` | Path to rules config (JSON or YAML) [required] |
| `--graph, -g` | Path to graph data (JSON) [required] |
| `--fail-on-error` | Exit code 1 if errors found |
| `--fail-on-warning` | Exit code 1 if warnings found |
| `--output, -o` | Save result to file |
| `--save-history` | Save to historical tracking |
| `--project-name, -p` | Project name for history (default: `default`) |
| `--storage-path` | Storage path (default: `.charon_fitness`) |
| `--quiet, -q` | Suppress detailed output |
| `--json-output` | Output as JSON |

### Exit Codes

Defined in [`main()`](https://github.com/HardMax71/charon/blob/main/backend/app/cli/fitness_check.py#L297-L309).

| Code | Meaning |
|------|---------|
| 0 | All rules passed |
| 1 | Rule violations found |
| 2 | Execution error |

---

## Configuration File Format

Rules are loaded by [`load_rules()`](https://github.com/HardMax71/charon/blob/main/backend/app/cli/fitness_check.py#L55-L68) and validated against [`FitnessRuleConfig`](https://github.com/HardMax71/charon/blob/main/backend/app/core/models.py#L608).

### YAML (Recommended)

```yaml
version: "1.0"
rules:
  - id: "unique-rule-id"
    name: "Human Readable Name"
    description: "Detailed description of what this rule enforces"
    rule_type: "import_restriction"
    severity: "error"
    enabled: true
    parameters:
      forbidden_source_pattern: "/api/"
      forbidden_target_pattern: "/database/"
```

### JSON

```json
{
  "version": "1.0",
  "rules": [
    {
      "id": "unique-rule-id",
      "name": "Human Readable Name",
      "description": "Detailed description",
      "rule_type": "import_restriction",
      "severity": "error",
      "enabled": true,
      "parameters": {
        "forbidden_source_pattern": "/api/",
        "forbidden_target_pattern": "/database/"
      }
    }
  ]
}
```

### Example Configurations

Check `backend/examples/` for:

- `fitness_rules_example.yaml`: Comprehensive example with all rule types
- `fitness_rules_simple.json`: Simple starter config
