# Rule Types

Charon supports six rule types for validating your architecture. Each rule is implemented in [
`FitnessService`](https://github.com/HardMax71/charon/blob/main/backend/app/services/fitness_service.py#L16).

## 1. Import Restriction

**Rule type**: `import_restriction`
**Implementation**: [
`_evaluate_import_restriction`](https://github.com/HardMax71/charon/blob/main/backend/app/services/fitness_service.py#L93-L138)

Blocks specific modules from importing other specific modules.

| Good for                                                    | Not suitable for                             |
|-------------------------------------------------------------|----------------------------------------------|
| Enforcing layered architecture (API → Service → Repository) | Fine-grained function-level restrictions     |
| Preventing circular dependencies at module level            | Dynamic imports or runtime-only dependencies |
| Isolating third-party dependencies to specific layers       | Codebases without clear layer boundaries     |

**Parameters**:

| Parameter                  | Type     | Description                                    |
|----------------------------|----------|------------------------------------------------|
| `forbidden_source_pattern` | `regex`  | Pattern for modules that shouldn't import      |
| `forbidden_target_pattern` | `regex`  | Pattern for modules that shouldn't be imported |
| `message_template`         | `string` | Custom violation message (optional)            |

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

## 2. Maximum Coupling

**Rule type**: `max_coupling`
**Implementation**: [
`_evaluate_max_coupling`](https://github.com/HardMax71/charon/blob/main/backend/app/services/fitness_service.py#L140-L208)

Limits how many dependencies a module can have.

| Good for                                  | Not suitable for                                 |
|-------------------------------------------|--------------------------------------------------|
| Preventing god objects/modules            | Utility modules designed to be widely imported   |
| Enforcing Single Responsibility Principle | Framework entry points (routers, DI containers)  |
| Flagging modules that need refactoring    | Facade patterns that aggregate imports by design |

**Parameters**:

| Parameter        | Type    | Description                                     |
|------------------|---------|-------------------------------------------------|
| `max_efferent`   | `int`   | Max outgoing dependencies (optional)            |
| `max_afferent`   | `int`   | Max incoming dependencies (optional)            |
| `max_total`      | `int`   | Max total coupling (optional)                   |
| `module_pattern` | `regex` | Filter which modules this applies to (optional) |

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

## 3. No Circular Dependencies

**Rule type**: `no_circular`
**Implementation**: [
`_evaluate_no_circular`](https://github.com/HardMax71/charon/blob/main/backend/app/services/fitness_service.py#L210-L233)

Detects and prevents circular dependencies.

| Good for                                     | Not suitable for                               |
|----------------------------------------------|------------------------------------------------|
| Enforcing DAG architecture                   | Co-dependent modules designed as a unit        |
| Preventing circular import issues at runtime | Bidirectional relationships by design          |
| Improving testability and isolation          | Tightly coupled pairs that should stay coupled |

**Parameters**: None.

**Example**:

```yaml
- id: "no-circular-deps"
  name: "No Circular Dependencies"
  rule_type: "no_circular"
  severity: "error"
  parameters: { }
```

## 4. Maximum Third-Party Percentage

**Rule type**: `max_third_party_percent`
**Implementation**: [
`_evaluate_max_third_party_percent`](https://github.com/HardMax71/charon/blob/main/backend/app/services/fitness_service.py#L235-L275)

Limits how much of your dependency graph is external.

| Good for                       | Not suitable for                                |
|--------------------------------|-------------------------------------------------|
| Controlling dependency bloat   | Thin wrappers around external libraries         |
| Maintaining codebase ownership | Integration-heavy applications (ETL, glue code) |
| Reducing supply chain risk     | Projects intentionally leveraging ecosystem     |

**Parameters**:

| Parameter     | Type    | Description                        |
|---------------|---------|------------------------------------|
| `max_percent` | `float` | Maximum allowed percentage (0-100) |

**Example**:

```yaml
- id: "third-party-limit"
  name: "Third-Party Dependency Limit"
  rule_type: "max_third_party_percent"
  severity: "warning"
  parameters:
    max_percent: 20
```

## 5. Maximum Dependency Depth

**Rule type**: `max_depth`
**Implementation**: [
`_evaluate_max_depth`](https://github.com/HardMax71/charon/blob/main/backend/app/services/fitness_service.py#L277-L323)

Limits the length of dependency chains.

| Good for                               | Not suitable for                        |
|----------------------------------------|-----------------------------------------|
| Preventing deeply nested architectures | Recursive data structures (AST, trees)  |
| Improving code comprehension           | Pipeline architectures with many stages |
| Reducing change impact radius          | Compiler/parser chains by design        |

**Parameters**:

| Parameter   | Type  | Description          |
|-------------|-------|----------------------|
| `max_depth` | `int` | Maximum chain length |

**Example**:

```yaml
- id: "max-dependency-depth"
  name: "Maximum Dependency Depth"
  rule_type: "max_depth"
  severity: "info"
  parameters:
    max_depth: 5
```

## 6. Maximum Complexity

**Rule type**: `max_complexity`
**Implementation**: [
`_evaluate_max_complexity`](https://github.com/HardMax71/charon/blob/main/backend/app/services/fitness_service.py#L325-L389)

Enforces complexity limits on modules.

| Good for                                  | Not suitable for                             |
|-------------------------------------------|----------------------------------------------|
| Maintaining code quality                  | Inherently complex algorithms (crypto, math) |
| Preventing overly complex modules         | State machines with many transitions         |
| Forcing refactoring when complexity grows | Parsers and interpreters                     |

**Parameters**:

| Parameter             | Type    | Description                              |
|-----------------------|---------|------------------------------------------|
| `max_cyclomatic`      | `int`   | Max cyclomatic complexity (optional)     |
| `min_maintainability` | `float` | Min maintainability index (optional)     |
| `module_pattern`      | `regex` | Filter which modules to check (optional) |

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

Each rule has a severity that determines how violations are treated:

| Severity  | Meaning                          | CI/CD behavior             |
|-----------|----------------------------------|----------------------------|
| `error`   | Critical architectural violation | Should fail the build      |
| `warning` | Important issue to address soon  | May or may not fail builds |
| `info`    | Informational, awareness only    | Never fails builds         |
