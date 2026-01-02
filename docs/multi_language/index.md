# Multi-Language Support

Technical spec for extending Charon beyond Python to support JavaScript/TypeScript, Java, Go, Rust, and other
languages.

## Goals

- Parse source code in multiple languages using a unified approach
- Resolve imports according to each language's module system
- Produce a language-agnostic dependency graph
- Detect cross-language dependencies (e.g., Python calling a Node.js microservice)
- Keep the existing 3D visualization and metrics working

## Key Design Decisions

| Decision        | Choice                                        | Rationale                                            |
|-----------------|-----------------------------------------------|------------------------------------------------------|
| Parsing library | [tree-sitter](https://tree-sitter.github.io/) | Unified API for 100+ languages, fast, error-tolerant |
| Plugin system   | Registry pattern                              | Easy to add new languages without touching core code |
| Graph model     | Generalized with language field               | Single visualization handles all languages           |
| Cross-language  | API contract parsing                          | Most reliable detection method                       |

## Documentation

- [Architecture](architecture.md) - Parser architecture and tree-sitter integration
- [Languages](languages.md) - Language-specific import resolution
- [Graph Model](graph_model.md) - Unified graph model and cross-language detection

## References

### Tree-sitter

- [tree-sitter-languages on PyPI](https://pypi.org/project/tree-sitter-languages/)
- [py-tree-sitter on GitHub](https://github.com/tree-sitter/py-tree-sitter)
- [Query Syntax Documentation](https://tree-sitter.github.io/tree-sitter/using-parsers/queries/1-syntax.html)

### Language-Specific

- [Node.js ESM Resolution](https://nodejs.org/api/esm.html)
- [TypeScript Module Resolution](https://www.typescriptlang.org/tsconfig/moduleResolution.html)
- [Go Modules Reference](https://go.dev/ref/mod)
- [Cargo Dependencies](https://doc.rust-lang.org/cargo/reference/specifying-dependencies.html)
- [Gradle Dependency Management](https://docs.gradle.org/current/userguide/declaring_dependencies.html)

### Cross-Language

- [OpenAPI Specification](https://spec.openapis.org/oas/latest.html)
- [gRPC Documentation](https://grpc.io/docs/)
- [Contract Testing with Specmatic](https://specmatic.io/)
