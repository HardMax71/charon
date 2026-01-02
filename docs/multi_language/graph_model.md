# Unified Graph Model

## Language Enum

The [`Language`](https://github.com/HardMax71/charon/blob/main/backend/app/core/models.py#L17-L24) enum defines supported programming languages:

```python title="backend/app/core/models.py" linenums="17"
--8<-- "backend/app/core/models.py:17:24"
```

This enum enables language-aware parsing and visualization. Each language has its own parser implementation that understands language-specific import patterns and module resolution rules.

---

## Extended Node Types

The [`NodeType`](https://github.com/HardMax71/charon/blob/main/backend/app/core/models.py#L26-L42) enum defines language-agnostic node types:

```python title="backend/app/core/models.py" linenums="26"
--8<-- "backend/app/core/models.py:26:42"
```

Node types are designed to be language-agnostic where possible, with language-specific types mapped to universal concepts. For example, a Go struct and Rust struct both use `STRUCT`, while React hooks get the specialized `HOOK` type for framework-aware visualization.

---

## Extended Edge Types

The [`EdgeType`](https://github.com/HardMax71/charon/blob/main/backend/app/core/models.py#L44-L56) enum defines relationship types between nodes:

```python title="backend/app/core/models.py" linenums="44"
--8<-- "backend/app/core/models.py:44:56"
```

Edge types cover both code-level dependencies (imports, inheritance, calls) and cross-service communication patterns (HTTP, gRPC, GraphQL). This unified model allows visualizing both in-process and network-level dependencies in the same graph.

---

## Node Metrics

The [`NodeMetrics`](https://github.com/HardMax71/charon/blob/main/backend/app/core/models.py#L66-L99) class captures per-node quality metrics:

```python title="backend/app/core/models.py" linenums="66"
--8<-- "backend/app/core/models.py:66:99"
```

These metrics power the hot zone detection and refactoring suggestions. Coupling metrics identify architectural bottlenecks, while complexity metrics highlight code that may be difficult to maintain or test.

---

## Extended Node Model

The [`Node`](https://github.com/HardMax71/charon/blob/main/backend/app/core/models.py#L102-L122) class represents a single entity in the dependency graph:

```python title="backend/app/core/models.py" linenums="102"
--8<-- "backend/app/core/models.py:102:122"
```

Each node tracks its language, type, file path, and optional service name for monorepo support. The `node_kind` field uses the `NodeType` enum to enable type-specific rendering and filtering in the visualization.

---

## Extended Edge Model

The [`Edge`](https://github.com/HardMax71/charon/blob/main/backend/app/core/models.py#L124-L132) class represents a dependency between two nodes:

```python title="backend/app/core/models.py" linenums="124"
--8<-- "backend/app/core/models.py:124:132"
```

Edges store the specific names imported and a weight for visualization thickness. The current implementation focuses on import relationships; future versions will add fields for cross-language edges (HTTP method, endpoint, etc.).

---

## Cross-Language Dependency Detection

!!! note "Planned Feature"
    The following classes are planned for future implementation. They document the intended architecture for detecting dependencies between services written in different languages.

Detecting dependencies between services written in different languages requires analyzing API contracts and code patterns.

### Approach 1: API Contract Parsing

Parse OpenAPI/Swagger, gRPC protobuf, and GraphQL schemas to understand service interfaces.

```python
class CrossLanguageDetector:
    """Detect dependencies between services in different languages."""

    def __init__(self, project_root: Path):
        self.root = project_root
        self.services: list[ServiceDefinition] = []
        self.endpoints: dict[str, ServiceEndpoint] = {}

    def discover_services(self):
        """Scan project for service definitions."""
        # OpenAPI/Swagger
        for spec_path in self.root.rglob("openapi.yaml"):
            self._parse_openapi(spec_path)
        for spec_path in self.root.rglob("swagger.json"):
            self._parse_openapi(spec_path)

        # gRPC
        for proto_path in self.root.rglob("*.proto"):
            self._parse_protobuf(proto_path)

        # GraphQL
        for schema_path in self.root.rglob("*.graphql"):
            self._parse_graphql(schema_path)
```

This detector will scan the project for API specifications and build a registry of available endpoints. It enables automatic discovery of service boundaries without manual configuration.

### Approach 2: Code Pattern Detection

Detect HTTP client library usage and extract endpoint URLs.

```python
class HTTPClientDetector:
    """Detect HTTP client calls in source code."""

    # Language-specific patterns for HTTP clients
    PATTERNS = {
        Language.PYTHON: {
            "libraries": ["requests", "httpx", "aiohttp", "urllib"],
            "query": """
            (call
              function: (attribute
                object: (identifier) @lib (#match? @lib "requests|httpx")
                attribute: (identifier) @method (#match? @method "get|post|put|delete|patch"))
              arguments: (argument_list (string) @url))
            """,
        },
        Language.JAVASCRIPT: {
            "libraries": ["axios", "fetch", "node-fetch", "got"],
            "query": """
            (call_expression
              function: (identifier) @func (#eq? @func "fetch")
              arguments: (arguments (string) @url))
            """,
        },
        Language.GO: {
            "libraries": ["net/http", "resty"],
            "query": """
            (call_expression
              function: (selector_expression
                operand: (identifier) @pkg (#eq? @pkg "http")
                field: (field_identifier) @method (#match? @method "Get|Post|Put|Delete"))
              arguments: (argument_list (interpreted_string_literal) @url))
            """,
        },
    }
```

Tree-sitter queries extract HTTP client calls from source code. By matching URLs against the endpoint registry built by `CrossLanguageDetector`, the system can infer cross-service dependencies even without explicit API contracts.

### Approach 3: Configuration-Based

Users can explicitly define service dependencies:

```yaml
# charon.yaml
cross_language:
  services:
    - name: user-service
      language: python
      root: ./services/user
      port: 8000
      endpoints:
        - path: /api/users
          methods: [ GET, POST ]
        - path: /api/users/{id}
          methods: [ GET, PUT, DELETE ]

    - name: payment-service
      language: go
      root: ./services/payment
      port: 3000
      endpoints:
        - path: /api/payments
          methods: [ POST ]

  # Explicit dependency declarations
  dependencies:
    - from: frontend/**/*.ts
      to: user-service
      pattern: "fetch.*api/users"

    - from: user-service
      to: payment-service
      type: grpc
```

Manual configuration provides precise control when automatic detection is insufficient. This is especially useful for message queues, event-driven architectures, or legacy systems where API contracts may not be machine-readable.
