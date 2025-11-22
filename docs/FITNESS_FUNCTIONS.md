# Architectural Fitness Functions

Charon now supports Architectural Fitness Functions - automated rules that validate your codebase architecture and can be integrated into CI/CD pipelines to enforce architectural standards.

## What are Fitness Functions?

Architectural fitness functions are executable specifications that validate architectural characteristics of your codebase. They act as automated tests for your architecture, ensuring that important design decisions and constraints are maintained over time.

Think of them as unit tests for your architecture.

## Why Use Fitness Functions?

- **Enforce architectural boundaries**: Prevent violations like API layer directly accessing database
- **Maintain code quality**: Set limits on coupling, complexity, and dependency depth
- **Prevent architectural decay**: Catch violations early, before they become technical debt
- **Document architectural decisions**: Rules serve as executable documentation
- **CI/CD integration**: Fail builds when architectural rules are violated
- **Track trends over time**: Monitor architectural health across commits

## Supported Rule Types

### 1. Import Restriction (`import_restriction`)

Prevents specific modules from importing from other specific modules.

**Use cases**:
- Enforce layered architecture (API → Service → Repository → Database)
- Prevent circular dependencies at module level
- Isolate third-party dependencies to specific layers

**Parameters**:
- `forbidden_source_pattern`: Regex pattern for source modules that shouldn't import
- `forbidden_target_pattern`: Regex pattern for target modules that shouldn't be imported
- `message_template`: Optional custom violation message

**Example**:
```yaml
- id: "no-api-to-db"
  name: "API Layer Isolation"
  rule_type: "import_restriction"
  severity: "error"
  parameters:
    forbidden_source_pattern: "/api/"
    forbidden_target_pattern: "/database/"
    message_template: "API modules must not import directly from database layer"
```

### 2. Maximum Coupling (`max_coupling`)

Limits the number of dependencies a module can have.

**Use cases**:
- Prevent god objects/modules
- Enforce Single Responsibility Principle
- Identify modules that need refactoring

**Parameters**:
- `max_efferent`: Maximum outgoing dependencies (optional)
- `max_afferent`: Maximum incoming dependencies (optional)
- `max_total`: Maximum total coupling (optional)
- `module_pattern`: Regex to filter which modules this applies to (optional)

**Example**:
```yaml
- id: "max-efferent-coupling"
  name: "Maximum Efferent Coupling"
  rule_type: "max_coupling"
  severity: "warning"
  parameters:
    max_efferent: 10
    module_pattern: ".*"
```

### 3. No Circular Dependencies (`no_circular`)

Detects and prevents circular dependencies.

**Use cases**:
- Enforce directed acyclic graph (DAG) architecture
- Prevent circular import issues
- Improve testability

**Parameters**: None required

**Example**:
```yaml
- id: "no-circular-deps"
  name: "No Circular Dependencies"
  rule_type: "no_circular"
  severity: "error"
  parameters: {}
```

### 4. Maximum Third-Party Percentage (`max_third_party_percent`)

Limits the percentage of third-party dependencies.

**Use cases**:
- Control dependency bloat
- Maintain codebase ownership
- Reduce supply chain risks

**Parameters**:
- `max_percent`: Maximum allowed percentage (0-100)

**Example**:
```yaml
- id: "third-party-limit"
  name: "Third-Party Dependency Limit"
  rule_type: "max_third_party_percent"
  severity: "warning"
  parameters:
    max_percent: 20
```

### 5. Maximum Dependency Depth (`max_depth`)

Limits the length of dependency chains.

**Use cases**:
- Prevent deeply nested architectures
- Improve code comprehension
- Reduce change impact radius

**Parameters**:
- `max_depth`: Maximum chain length

**Example**:
```yaml
- id: "max-dependency-depth"
  name: "Maximum Dependency Depth"
  rule_type: "max_depth"
  severity: "info"
  parameters:
    max_depth: 5
```

### 6. Maximum Complexity (`max_complexity`)

Enforces complexity limits on modules.

**Use cases**:
- Maintain code quality
- Prevent overly complex modules
- Enforce refactoring when complexity grows

**Parameters**:
- `max_cyclomatic`: Maximum cyclomatic complexity (optional)
- `min_maintainability`: Minimum maintainability index (optional)
- `module_pattern`: Regex to filter modules (optional)

**Example**:
```yaml
- id: "max-complexity"
  name: "Maximum Complexity"
  rule_type: "max_complexity"
  severity: "warning"
  parameters:
    max_cyclomatic: 15
    min_maintainability: 20
```

## Severity Levels

Each rule has a severity level that determines how violations are treated:

- **`error`**: Critical violations that should fail CI/CD builds
- **`warning`**: Important issues that should be addressed but may not fail builds
- **`info`**: Informational messages for awareness

## Usage

### 1. API Endpoint

Validate rules programmatically via the REST API:

```bash
curl -X POST http://localhost:8000/api/fitness/validate \
  -H "Content-Type: application/json" \
  -d @request.json
```

Request format:
```json
{
  "graph": { /* DependencyGraph object */ },
  "global_metrics": { /* GlobalMetrics object */ },
  "rules": [ /* Array of FitnessRule objects */ ],
  "fail_on_error": true,
  "fail_on_warning": false
}
```

### 2. CLI Tool (Recommended for CI/CD)

Use the command-line tool for easy integration into CI/CD pipelines:

```bash
# Basic validation
python -m app.cli.fitness_check \
  --rules fitness_rules.yaml \
  --graph analysis_result.json

# Fail on errors only
python -m app.cli.fitness_check \
  --rules fitness_rules.yaml \
  --graph analysis_result.json \
  --fail-on-error

# Fail on warnings too (strict mode)
python -m app.cli.fitness_check \
  --rules fitness_rules.yaml \
  --graph analysis_result.json \
  --fail-on-error \
  --fail-on-warning

# Save results and track history
python -m app.cli.fitness_check \
  --rules fitness_rules.yaml \
  --graph analysis_result.json \
  --fail-on-error \
  --save-history \
  --project-name my-project \
  --output validation_result.json
```

**CLI Options**:
- `--rules, -r`: Path to rules config file (JSON or YAML) [required]
- `--graph, -g`: Path to graph data file (JSON) [required]
- `--fail-on-error`: Exit with code 1 if errors found
- `--fail-on-warning`: Exit with code 1 if warnings found
- `--output, -o`: Save result to file
- `--save-history`: Save to historical tracking
- `--project-name, -p`: Project name for history
- `--storage-path`: Storage path (default: .charon_fitness)
- `--quiet, -q`: Suppress detailed output
- `--json-output`: Output as JSON

**Exit Codes**:
- `0`: All rules passed
- `1`: Rule violations found
- `2`: Execution error

## CI/CD Integration Examples

### GitHub Actions

```yaml
name: Architecture Validation

on: [push, pull_request]

jobs:
  fitness-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install Charon
        run: |
          cd backend
          pip install -r requirements.txt

      - name: Analyze codebase
        run: |
          # Run Charon analysis and save result
          curl -X POST http://localhost:8000/api/analyze \
            -H "Content-Type: application/json" \
            -d '{"source": "local", "files": [...]}' \
            > analysis_result.json

      - name: Validate fitness functions
        run: |
          cd backend
          python -m app.cli.fitness_check \
            --rules ../.charon/fitness_rules.yaml \
            --graph ../analysis_result.json \
            --fail-on-error \
            --save-history \
            --project-name ${{ github.repository }}
```

### GitLab CI

```yaml
fitness-check:
  stage: test
  image: python:3.11
  script:
    - cd backend
    - pip install -r requirements.txt
    - python -m app.cli.fitness_check
        --rules ../.charon/fitness_rules.yaml
        --graph ../analysis_result.json
        --fail-on-error
        --save-history
        --project-name $CI_PROJECT_NAME
  artifacts:
    when: always
    paths:
      - validation_result.json
```

### Jenkins

```groovy
pipeline {
    agent any
    stages {
        stage('Fitness Check') {
            steps {
                sh '''
                    cd backend
                    pip install -r requirements.txt
                    python -m app.cli.fitness_check \
                        --rules ../.charon/fitness_rules.yaml \
                        --graph ../analysis_result.json \
                        --fail-on-error \
                        --save-history \
                        --project-name ${JOB_NAME}
                '''
            }
        }
    }
}
```

## Configuration File Format

Fitness rules can be defined in YAML or JSON format.

### YAML Format (Recommended)

```yaml
version: "1.0"
rules:
  - id: "unique-rule-id"
    name: "Human Readable Name"
    description: "Detailed description of what this rule enforces"
    rule_type: "import_restriction"  # See rule types above
    severity: "error"  # error | warning | info
    enabled: true
    parameters:
      # Rule-specific parameters
      forbidden_source_pattern: "/api/"
      forbidden_target_pattern: "/database/"
```

### JSON Format

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

## Historical Trend Tracking

Track how your architecture evolves over time:

```bash
# Get historical trend data
curl http://localhost:8000/api/fitness/trend/my-project

# Filter by specific rule
curl http://localhost:8000/api/fitness/trend/my-project?rule_id=no-circular-deps

# Limit results
curl http://localhost:8000/api/fitness/trend/my-project?limit=50
```

Response includes:
- Time series of validation results
- Pass/fail rates
- Average violations over time
- Trend summary statistics

## Example Configurations

See the `backend/examples/` directory for:

- `fitness_rules_example.yaml`: Comprehensive example with all rule types
- `fitness_rules_simple.json`: Simple starter configuration

## Best Practices

1. **Start Simple**: Begin with a few critical rules (no circular deps, max coupling)
2. **Gradual Adoption**: Add rules incrementally to avoid overwhelming the team
3. **Use Warnings First**: Start with `warning` severity, promote to `error` later
4. **Document Context**: Add detailed descriptions explaining why each rule exists
5. **Version Control Rules**: Keep rules in version control alongside code
6. **Regular Reviews**: Review and update rules as architecture evolves
7. **Team Agreement**: Ensure the team agrees on and understands the rules
8. **Monitor Trends**: Use historical tracking to identify architectural drift

## Troubleshooting

### Rule Not Triggering

- Check that `enabled: true` is set
- Verify regex patterns match your module structure
- Test patterns with a regex tool
- Check rule parameters are correct for the rule type

### CLI Tool Not Found

```bash
# Make sure you're in the backend directory
cd backend

# And Python can find the app module
export PYTHONPATH="${PYTHONPATH}:."
```

### Graph Data Format

The graph data must be in the format produced by Charon's analysis endpoint. Either:
1. Use the analysis result directly from `/api/analyze`
2. Or use exported data from `/api/export`

## FAQ

**Q: Can I use custom rule types?**
A: Not yet, but you can combine existing rules creatively. Custom rule types may be added in future versions.

**Q: How do I disable a rule temporarily?**
A: Set `enabled: false` in the rule configuration.

**Q: Can rules be project-specific?**
A: Yes! Use the `module_pattern` parameter to target specific parts of your codebase.

**Q: What's the performance impact?**
A: Minimal - fitness checks run in seconds even for large codebases since they analyze the already-computed dependency graph.

**Q: Can I export rules from the web UI?**
A: Currently rules are managed via configuration files. UI support may be added later.

## Contributing

Have ideas for new rule types or improvements? Open an issue or PR!

## References

- [Building Evolutionary Architectures](https://www.thoughtworks.com/books/building-evolutionary-architectures)
- [Fitness Function-Driven Development](https://www.thoughtworks.com/insights/articles/fitness-function-driven-development)
- [ArchUnit](https://www.archunit.org/) (Java architecture testing library - inspiration)
