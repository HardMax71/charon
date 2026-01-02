# Multi-Language Support Architecture

This document provides a comprehensive technical specification for extending Charon beyond Python to support JavaScript/TypeScript, Java, Go, Rust, and other languages.

## Table of Contents

1. [Overview](#overview)
2. [Parser Architecture](#parser-architecture)
3. [Tree-sitter Integration](#tree-sitter-integration)
4. [Language-Specific Import Resolution](#language-specific-import-resolution)
5. [Unified Graph Model](#unified-graph-model)
6. [Cross-Language Dependency Detection](#cross-language-dependency-detection)
7. [Implementation Roadmap](#implementation-roadmap)
8. [Configuration](#configuration)

---

## Overview

### Goals

- Parse source code in multiple languages using a unified approach
- Resolve imports according to each language's module system
- Produce a language-agnostic dependency graph
- Detect cross-language dependencies (e.g., Python → Node.js microservice)
- Maintain the existing 3D visualization and metrics capabilities

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Parsing library | [tree-sitter](https://tree-sitter.github.io/) | Unified API for 100+ languages, fast, error-tolerant |
| Plugin system | Registry pattern | Easy to add new languages without modifying core |
| Graph model | Generalized with language field | Single visualization handles all languages |
| Cross-language | API contract parsing | Most reliable detection method |

---

## Parser Architecture

### Directory Structure

```
backend/app/services/parsers/
├── __init__.py
├── base.py                    # Abstract base class and protocols
├── registry.py                # Parser registration and discovery
├── tree_sitter_base.py        # Common tree-sitter functionality
├── python/
│   ├── __init__.py
│   ├── parser.py              # Python-specific parser
│   └── import_resolver.py     # Python import resolution
├── javascript/
│   ├── __init__.py
│   ├── parser.py              # JS/TS parser
│   └── import_resolver.py     # node_modules resolution
├── java/
│   ├── __init__.py
│   ├── parser.py
│   └── import_resolver.py     # Classpath/Maven/Gradle resolution
├── go/
│   ├── __init__.py
│   ├── parser.py
│   └── import_resolver.py     # go.mod resolution
└── rust/
    ├── __init__.py
    ├── parser.py
    └── import_resolver.py     # Cargo.toml resolution
```

### Base Parser Protocol

```python
# backend/app/services/parsers/base.py

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Protocol, runtime_checkable
from enum import Enum

class Language(str, Enum):
    PYTHON = "python"
    JAVASCRIPT = "javascript"
    TYPESCRIPT = "typescript"
    JAVA = "java"
    GO = "go"
    RUST = "rust"

@runtime_checkable
class LanguageParser(Protocol):
    """Protocol defining the interface for language parsers."""

    language: Language
    file_extensions: tuple[str, ...]

    def parse_file(self, path: Path) -> list["ParsedNode"]:
        """Parse a single file and extract nodes (modules, classes, functions)."""
        ...

    def parse_directory(self, path: Path) -> "DependencyGraph":
        """Parse all files in a directory and build dependency graph."""
        ...

    def resolve_import(
        self,
        import_stmt: str,
        from_file: Path,
        project_root: Path
    ) -> ImportResolution:
        """Resolve an import statement to its target."""
        ...

    def detect_project(self, path: Path) -> bool:
        """Check if this parser should handle the given project."""
        ...

@dataclass
class ImportResolution:
    """Result of resolving an import statement."""

    resolved_path: str | None      # Absolute path or module identifier
    is_internal: bool              # Part of the project
    is_external: bool              # Third-party dependency
    is_stdlib: bool                # Standard library
    package_name: str | None       # For external: package name
    version: str | None            # For external: version if known

@dataclass
class ParsedNode:
    """A parsed code entity (module, class, function, etc.)."""

    id: str
    name: str
    node_type: "NodeType"
    language: Language
    file_path: str
    start_line: int
    end_line: int
    imports: list[str]
    exports: list[str]             # For JS/TS exports
    docstring: str | None
```

### Parser Registry

```python
# backend/app/services/parsers/registry.py

from typing import Type, ClassVar
from pathlib import Path

class ParserRegistry:
    """Central registry for language parsers."""

    _parsers: ClassVar[dict[Language, Type[LanguageParser]]] = {}
    _extension_map: ClassVar[dict[str, Language]] = {}

    @classmethod
    def register(cls, parser_class: Type[LanguageParser]) -> Type[LanguageParser]:
        """Decorator to register a parser class."""
        cls._parsers[parser_class.language] = parser_class
        for ext in parser_class.file_extensions:
            cls._extension_map[ext] = parser_class.language
        return parser_class

    @classmethod
    def get_parser(cls, language: Language) -> LanguageParser:
        """Get parser instance for a language."""
        if language not in cls._parsers:
            raise ValueError(f"No parser registered for {language}")
        return cls._parsers[language]()

    @classmethod
    def get_parser_for_file(cls, path: Path) -> LanguageParser | None:
        """Get appropriate parser for a file based on extension."""
        ext = path.suffix.lower()
        if ext in cls._extension_map:
            return cls.get_parser(cls._extension_map[ext])
        return None

    @classmethod
    def detect_languages(cls, project_path: Path) -> list[Language]:
        """Detect which languages are present in a project."""
        detected = set()

        # Check for language-specific config files
        config_indicators = {
            Language.PYTHON: ["pyproject.toml", "setup.py", "requirements.txt"],
            Language.JAVASCRIPT: ["package.json"],
            Language.TYPESCRIPT: ["tsconfig.json"],
            Language.JAVA: ["pom.xml", "build.gradle", "build.gradle.kts"],
            Language.GO: ["go.mod"],
            Language.RUST: ["Cargo.toml"],
        }

        for lang, indicators in config_indicators.items():
            for indicator in indicators:
                if (project_path / indicator).exists():
                    detected.add(lang)
                    break

        # Also scan for file extensions
        for path in project_path.rglob("*"):
            if path.suffix.lower() in cls._extension_map:
                detected.add(cls._extension_map[path.suffix.lower()])

        return list(detected)
```

---

## Tree-sitter Integration

### Why Tree-sitter?

[Tree-sitter](https://tree-sitter.github.io/) is a parser generator tool and incremental parsing library. It provides:

- **Unified API**: Same interface for 100+ languages
- **Speed**: Incremental parsing, typically < 1ms for edits
- **Error tolerance**: Produces valid syntax trees even for broken code
- **Queries**: Pattern matching DSL for extracting code structures

### Installation

```bash
pip install tree-sitter-languages
```

The [tree-sitter-languages](https://pypi.org/project/tree-sitter-languages/) package provides pre-compiled binaries for 60+ languages, eliminating the need to build grammars manually.

### Base Tree-sitter Parser

```python
# backend/app/services/parsers/tree_sitter_base.py

from tree_sitter_languages import get_language, get_parser
from tree_sitter import Language, Parser, Tree, Node
from pathlib import Path
from abc import ABC, abstractmethod

class TreeSitterParser(ABC):
    """Base class for tree-sitter based parsers."""

    # Override in subclasses
    language_name: str  # "python", "javascript", "java", etc.

    # Query patterns (override in subclasses)
    IMPORT_QUERY: str = ""
    CLASS_QUERY: str = ""
    FUNCTION_QUERY: str = ""

    def __init__(self):
        self.ts_language = get_language(self.language_name)
        self.parser = get_parser(self.language_name)
        self._compile_queries()

    def _compile_queries(self):
        """Compile tree-sitter queries for this language."""
        if self.IMPORT_QUERY:
            self.import_query = self.ts_language.query(self.IMPORT_QUERY)
        if self.CLASS_QUERY:
            self.class_query = self.ts_language.query(self.CLASS_QUERY)
        if self.FUNCTION_QUERY:
            self.function_query = self.ts_language.query(self.FUNCTION_QUERY)

    def parse_source(self, source: bytes) -> Tree:
        """Parse source code into a syntax tree."""
        return self.parser.parse(source)

    def parse_file(self, path: Path) -> Tree:
        """Parse a file into a syntax tree."""
        source = path.read_bytes()
        return self.parse_source(source)

    def extract_imports(self, tree: Tree) -> list[dict]:
        """Extract import statements from parsed tree."""
        if not hasattr(self, 'import_query'):
            return []

        captures = self.import_query.captures(tree.root_node)
        return self._process_import_captures(captures)

    def extract_classes(self, tree: Tree) -> list[dict]:
        """Extract class definitions from parsed tree."""
        if not hasattr(self, 'class_query'):
            return []

        captures = self.class_query.captures(tree.root_node)
        return self._process_class_captures(captures)

    def extract_functions(self, tree: Tree) -> list[dict]:
        """Extract function definitions from parsed tree."""
        if not hasattr(self, 'function_query'):
            return []

        captures = self.function_query.captures(tree.root_node)
        return self._process_function_captures(captures)

    @abstractmethod
    def _process_import_captures(self, captures: list) -> list[dict]:
        """Process captured import nodes (language-specific)."""
        ...

    @abstractmethod
    def _process_class_captures(self, captures: list) -> list[dict]:
        """Process captured class nodes (language-specific)."""
        ...

    @abstractmethod
    def _process_function_captures(self, captures: list) -> list[dict]:
        """Process captured function nodes (language-specific)."""
        ...
```

### Tree-sitter Query Syntax

Tree-sitter uses S-expression patterns for matching syntax nodes. Key concepts:

```scheme
; Match a node type
(function_definition)

; Capture with @name
(function_definition name: (identifier) @func_name)

; Field names with colon
(import_statement module_name: (dotted_name) @module)

; Wildcards
(_)           ; Any named node
_             ; Any node (including anonymous)

; Repetition
(block (_)*)  ; Zero or more children
(block (_)+)  ; One or more children

; Optional
(function_definition return_type: (_)? @return)

; Predicates
((identifier) @name (#eq? @name "main"))
((string) @str (#match? @str "^test_"))
```

Reference: [Tree-sitter Query Syntax](https://tree-sitter.github.io/tree-sitter/using-parsers/queries/1-syntax.html)

---

## Language-Specific Import Resolution

Each language has unique module resolution rules. This section documents how to resolve imports for each supported language.

### Python

**Import Patterns:**
```python
import package
import package.submodule
from package import name
from package.submodule import name
from . import sibling              # Relative
from ..parent import name          # Relative
```

**Resolution Algorithm:**
1. Check if it's a relative import (starts with `.`)
2. For relative: resolve against current package
3. For absolute: check `sys.path` in order
4. Classify as stdlib, internal, or third-party

**Implementation:**
```python
@ParserRegistry.register
class PythonParser(TreeSitterParser, LanguageParser):
    language = Language.PYTHON
    language_name = "python"
    file_extensions = (".py", ".pyi")

    IMPORT_QUERY = """
    (import_statement
      name: (dotted_name) @module)
    (import_from_statement
      module_name: (dotted_name) @module)
    (import_from_statement
      module_name: (relative_import) @relative_module)
    """
```

### JavaScript / TypeScript

**Import Patterns:**
```javascript
import defaultExport from "module";
import { named } from "module";
import * as namespace from "module";
const module = require("module");

// Relative
import utils from "./utils";
import helper from "../lib/helper";
```

**Resolution Algorithm:**

Per [Node.js module resolution](https://nodejs.org/api/esm.html) and [TypeScript moduleResolution](https://www.typescriptlang.org/tsconfig/moduleResolution.html):

1. **Relative imports** (`./`, `../`):
   - Try exact path
   - Try with extensions: `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`
   - Try as directory with `index.{js,ts}`

2. **Package imports**:
   - Look in `node_modules/` directory
   - Check `package.json` `exports` field (Node 12+)
   - Fall back to `main` field
   - Check for `@types/` for TypeScript

3. **TypeScript paths**:
   - Resolve via `tsconfig.json` `paths` mapping

**Implementation:**
```python
@ParserRegistry.register
class JavaScriptParser(TreeSitterParser, LanguageParser):
    language = Language.JAVASCRIPT
    language_name = "javascript"
    file_extensions = (".js", ".jsx", ".mjs", ".cjs")

    IMPORT_QUERY = """
    ; ES6 imports
    (import_statement
      source: (string) @source)

    ; CommonJS require
    (call_expression
      function: (identifier) @func (#eq? @func "require")
      arguments: (arguments (string) @source))

    ; Dynamic import
    (call_expression
      function: (import)
      arguments: (arguments (string) @source))
    """

class JavaScriptImportResolver:
    def __init__(self, project_root: Path):
        self.root = project_root
        self.package_json = self._load_package_json()
        self.node_modules = project_root / "node_modules"

    def resolve(self, import_path: str, from_file: Path) -> ImportResolution:
        # Strip quotes
        import_path = import_path.strip("'\"")

        # Relative import
        if import_path.startswith("."):
            return self._resolve_relative(import_path, from_file)

        # Built-in Node modules
        if import_path in NODE_BUILTINS:
            return ImportResolution(
                resolved_path=f"node:{import_path}",
                is_internal=False,
                is_external=False,
                is_stdlib=True,
                package_name=None,
                version=None,
            )

        # Package import
        return self._resolve_package(import_path)

    def _resolve_relative(self, path: str, from_file: Path) -> ImportResolution:
        base = from_file.parent
        extensions = ["", ".js", ".jsx", ".ts", ".tsx", "/index.js", "/index.ts"]

        for ext in extensions:
            candidate = (base / path).with_suffix(ext) if ext.startswith(".") else base / (path + ext)
            if candidate.exists():
                return ImportResolution(
                    resolved_path=str(candidate.resolve()),
                    is_internal=True,
                    is_external=False,
                    is_stdlib=False,
                    package_name=None,
                    version=None,
                )

        return ImportResolution(resolved_path=None, is_internal=False, is_external=False, is_stdlib=False, package_name=None, version=None)

    def _resolve_package(self, package: str) -> ImportResolution:
        # Handle scoped packages (@org/package)
        parts = package.split("/")
        if parts[0].startswith("@"):
            pkg_name = "/".join(parts[:2])
            subpath = "/".join(parts[2:]) if len(parts) > 2 else None
        else:
            pkg_name = parts[0]
            subpath = "/".join(parts[1:]) if len(parts) > 1 else None

        pkg_path = self.node_modules / pkg_name / "package.json"
        if pkg_path.exists():
            pkg_json = json.loads(pkg_path.read_text())
            version = pkg_json.get("version")
            return ImportResolution(
                resolved_path=f"external:{pkg_name}",
                is_internal=False,
                is_external=True,
                is_stdlib=False,
                package_name=pkg_name,
                version=version,
            )

        return ImportResolution(resolved_path=None, is_internal=False, is_external=False, is_stdlib=False, package_name=pkg_name, version=None)
```

### Go

**Import Patterns:**
```go
import "fmt"
import "github.com/user/repo/package"
import alias "github.com/user/repo/package"
import . "fmt"       // Dot import
import _ "database/sql"  // Side-effect import
```

**Resolution Algorithm:**

Per [Go Modules Reference](https://go.dev/ref/mod):

1. **Standard library**: Single-word imports without dots (e.g., `fmt`, `net/http`)
2. **Module imports**: Must contain a dot in the first path element
3. **Resolution steps**:
   - Parse `go.mod` for module path and dependencies
   - Match import prefix against known modules
   - Locate package directory within module

**Key rules:**
- Module path = repository root + optional subdirectory + optional major version suffix (`/v2`, `/v3`)
- Package path = module path + subdirectory within module
- Minimal Version Selection (MVS): always use the minimum version that satisfies all requirements

**Implementation:**
```python
@ParserRegistry.register
class GoParser(TreeSitterParser, LanguageParser):
    language = Language.GO
    language_name = "go"
    file_extensions = (".go",)

    IMPORT_QUERY = """
    (import_declaration
      (import_spec
        path: (interpreted_string_literal) @path))
    (import_declaration
      (import_spec_list
        (import_spec
          path: (interpreted_string_literal) @path)))
    """

class GoImportResolver:
    STDLIB_PREFIXES = {
        "archive", "bufio", "bytes", "compress", "container", "context",
        "crypto", "database", "debug", "embed", "encoding", "errors",
        "expvar", "flag", "fmt", "go", "hash", "html", "image", "index",
        "io", "log", "maps", "math", "mime", "net", "os", "path", "plugin",
        "reflect", "regexp", "runtime", "slices", "sort", "strconv",
        "strings", "sync", "syscall", "testing", "text", "time", "unicode",
        "unsafe",
    }

    def __init__(self, project_root: Path):
        self.root = project_root
        self.go_mod = self._parse_go_mod()

    def _parse_go_mod(self) -> dict:
        go_mod_path = self.root / "go.mod"
        if not go_mod_path.exists():
            return {}

        content = go_mod_path.read_text()
        result = {"module": None, "require": {}}

        for line in content.split("\n"):
            line = line.strip()
            if line.startswith("module "):
                result["module"] = line.split()[1]
            # Parse require blocks...

        return result

    def resolve(self, import_path: str, from_file: Path) -> ImportResolution:
        import_path = import_path.strip('"')

        # Standard library
        first_part = import_path.split("/")[0]
        if first_part in self.STDLIB_PREFIXES or "." not in first_part:
            return ImportResolution(
                resolved_path=f"stdlib:{import_path}",
                is_internal=False,
                is_external=False,
                is_stdlib=True,
                package_name=None,
                version=None,
            )

        # Internal package (matches module path)
        module_path = self.go_mod.get("module", "")
        if import_path.startswith(module_path):
            rel_path = import_path[len(module_path):].lstrip("/")
            return ImportResolution(
                resolved_path=str(self.root / rel_path),
                is_internal=True,
                is_external=False,
                is_stdlib=False,
                package_name=None,
                version=None,
            )

        # External dependency
        return ImportResolution(
            resolved_path=f"external:{import_path}",
            is_internal=False,
            is_external=True,
            is_stdlib=False,
            package_name=import_path,
            version=self.go_mod.get("require", {}).get(import_path),
        )
```

### Java

**Import Patterns:**
```java
import java.util.List;
import java.util.*;
import static java.lang.Math.PI;
import static java.util.Collections.*;
```

**Resolution Algorithm:**

Per [Gradle](https://docs.gradle.org/current/userguide/declaring_dependencies.html) and Maven conventions:

1. **Standard library**: `java.*`, `javax.*`, `jdk.*`
2. **Classpath resolution**:
   - Maven: `~/.m2/repository/` + coordinates
   - Gradle: `~/.gradle/caches/` + coordinates
3. **Source roots**: `src/main/java/`, `src/test/java/`

**Implementation:**
```python
@ParserRegistry.register
class JavaParser(TreeSitterParser, LanguageParser):
    language = Language.JAVA
    language_name = "java"
    file_extensions = (".java",)

    IMPORT_QUERY = """
    (import_declaration
      (scoped_identifier) @import)
    (import_declaration
      (identifier) @import)
    """

    CLASS_QUERY = """
    (class_declaration
      name: (identifier) @class_name)
    (interface_declaration
      name: (identifier) @interface_name)
    (enum_declaration
      name: (identifier) @enum_name)
    """
```

### Rust

**Import Patterns:**
```rust
use std::collections::HashMap;
use crate::module::Type;
use super::parent_module;
use self::submodule;
extern crate some_crate;
```

**Resolution Algorithm:**

Per [Cargo documentation](https://doc.rust-lang.org/cargo/reference/specifying-dependencies.html):

1. **Crate prefixes**:
   - `std::` - Standard library
   - `crate::` - Current crate root
   - `super::` - Parent module
   - `self::` - Current module
   - Other - External crate from Cargo.toml

2. **Cargo.toml dependencies**:
   - crates.io: `name = "version"`
   - Git: `name = { git = "url" }`
   - Path: `name = { path = "path" }`

**Implementation:**
```python
@ParserRegistry.register
class RustParser(TreeSitterParser, LanguageParser):
    language = Language.RUST
    language_name = "rust"
    file_extensions = (".rs",)

    IMPORT_QUERY = """
    (use_declaration
      argument: (scoped_identifier) @use_path)
    (use_declaration
      argument: (use_wildcard) @use_path)
    (use_declaration
      argument: (use_list) @use_path)
    (extern_crate_declaration
      name: (identifier) @crate_name)
    """

class RustImportResolver:
    def __init__(self, project_root: Path):
        self.root = project_root
        self.cargo_toml = self._parse_cargo_toml()

    def _parse_cargo_toml(self) -> dict:
        cargo_path = self.root / "Cargo.toml"
        if not cargo_path.exists():
            return {}

        import tomllib
        return tomllib.loads(cargo_path.read_text())

    def resolve(self, use_path: str, from_file: Path) -> ImportResolution:
        parts = use_path.split("::")
        prefix = parts[0]

        # Standard library
        if prefix == "std" or prefix == "core" or prefix == "alloc":
            return ImportResolution(
                resolved_path=f"stdlib:{use_path}",
                is_internal=False,
                is_external=False,
                is_stdlib=True,
                package_name=None,
                version=None,
            )

        # Current crate
        if prefix == "crate" or prefix == "super" or prefix == "self":
            return ImportResolution(
                resolved_path=self._resolve_internal(parts, from_file),
                is_internal=True,
                is_external=False,
                is_stdlib=False,
                package_name=None,
                version=None,
            )

        # External crate
        deps = self.cargo_toml.get("dependencies", {})
        if prefix in deps:
            dep_spec = deps[prefix]
            version = dep_spec if isinstance(dep_spec, str) else dep_spec.get("version")
            return ImportResolution(
                resolved_path=f"external:{prefix}",
                is_internal=False,
                is_external=True,
                is_stdlib=False,
                package_name=prefix,
                version=version,
            )

        return ImportResolution(resolved_path=None, is_internal=False, is_external=False, is_stdlib=False, package_name=prefix, version=None)
```

---

## Unified Graph Model

### Extended Node Types

```python
class NodeType(str, Enum):
    """Language-agnostic node types."""

    # Universal types
    MODULE = "module"           # Python module, JS file, Java class file
    PACKAGE = "package"         # Python package, Java package, Go package
    CLASS = "class"             # Class in any OOP language
    INTERFACE = "interface"     # Java/TS/Go interface
    FUNCTION = "function"       # Standalone function
    METHOD = "method"           # Class method
    VARIABLE = "variable"       # Module-level variable/constant

    # Language-specific (mapped where possible)
    STRUCT = "struct"           # Go/Rust struct
    TRAIT = "trait"             # Rust trait
    ENUM = "enum"               # Enum in any language
    TYPE_ALIAS = "type_alias"   # Type definitions
    COMPONENT = "component"     # React/Vue component
    HOOK = "hook"               # React hook

    # Build artifacts
    SERVICE = "service"         # Microservice
    LIBRARY = "library"         # External library
```

### Extended Edge Types

```python
class EdgeType(str, Enum):
    """Relationship types between nodes."""

    # Code-level
    IMPORTS = "imports"           # Import statement
    EXPORTS = "exports"           # Export statement (JS/TS)
    EXTENDS = "extends"           # Class inheritance
    IMPLEMENTS = "implements"     # Interface implementation
    CALLS = "calls"               # Function/method call
    INSTANTIATES = "instantiates" # Object creation
    USES = "uses"                 # Generic usage

    # Cross-language
    HTTP_CALLS = "http_calls"     # REST API call
    GRPC_CALLS = "grpc_calls"     # gRPC call
    GRAPHQL_CALLS = "graphql_calls"  # GraphQL query
    MESSAGE_SENDS = "message_sends"   # Message queue
```

### Extended Node Model

```python
class Node(BaseModel):
    """A node in the dependency graph."""

    id: str
    label: str
    type: NodeType
    language: Language              # NEW
    file_path: str
    module: str | None
    position: Position
    color: str

    # Metrics
    metrics: NodeMetrics

    # Language-specific metadata
    metadata: dict[str, Any] = {}   # NEW: exports, decorators, annotations, etc.

class Edge(BaseModel):
    """An edge in the dependency graph."""

    id: str
    source: str
    target: str
    edge_type: EdgeType

    # Cross-language flag
    cross_language: bool = False    # NEW

    # For API calls
    http_method: str | None = None  # GET, POST, etc.
    endpoint: str | None = None     # /api/users

    # Import details
    import_names: list[str] = []
    is_dynamic: bool = False        # Dynamic import()
```

---

## Cross-Language Dependency Detection

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

    def _parse_openapi(self, spec_path: Path) -> list[ServiceEndpoint]:
        """Parse OpenAPI specification."""
        import yaml

        spec = yaml.safe_load(spec_path.read_text())
        endpoints = []

        for path, methods in spec.get("paths", {}).items():
            for method, details in methods.items():
                if method in ("get", "post", "put", "delete", "patch"):
                    endpoints.append(ServiceEndpoint(
                        path=path,
                        method=method.upper(),
                        operation_id=details.get("operationId"),
                        service_name=spec.get("info", {}).get("title"),
                        spec_file=str(spec_path),
                    ))

        return endpoints

    def _parse_protobuf(self, proto_path: Path) -> list[ServiceEndpoint]:
        """Parse gRPC .proto file for service definitions."""
        content = proto_path.read_text()
        endpoints = []

        # Simple regex parsing (for production, use a proper protobuf parser)
        import re
        service_pattern = r'service\s+(\w+)\s*\{([^}]+)\}'
        rpc_pattern = r'rpc\s+(\w+)\s*\(([^)]+)\)\s*returns\s*\(([^)]+)\)'

        for service_match in re.finditer(service_pattern, content):
            service_name = service_match.group(1)
            service_body = service_match.group(2)

            for rpc_match in re.finditer(rpc_pattern, service_body):
                endpoints.append(ServiceEndpoint(
                    path=f"/{service_name}/{rpc_match.group(1)}",
                    method="GRPC",
                    operation_id=rpc_match.group(1),
                    service_name=service_name,
                    spec_file=str(proto_path),
                ))

        return endpoints

    def detect_client_calls(self, graph: DependencyGraph) -> list[Edge]:
        """Find HTTP/gRPC client calls and match to known endpoints."""
        cross_edges = []

        for node in graph.nodes:
            # Detect HTTP client patterns
            http_calls = self._find_http_calls(node)
            for call in http_calls:
                target = self._match_endpoint(call)
                if target:
                    cross_edges.append(Edge(
                        id=f"{node.id}→{target.id}",
                        source=node.id,
                        target=target.id,
                        edge_type=EdgeType.HTTP_CALLS,
                        cross_language=node.language != target.language,
                        http_method=call.method,
                        endpoint=call.path,
                    ))

        return cross_edges
```

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
            (call_expression
              function: (member_expression
                object: (identifier) @lib (#eq? @lib "axios")
                property: (property_identifier) @method)
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

### Approach 3: Configuration-Based

Allow users to explicitly define service dependencies.

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
          methods: [GET, POST]
        - path: /api/users/{id}
          methods: [GET, PUT, DELETE]

    - name: payment-service
      language: go
      root: ./services/payment
      port: 3000
      endpoints:
        - path: /api/payments
          methods: [POST]
        - path: /api/payments/{id}
          methods: [GET]

  # Explicit dependency declarations
  dependencies:
    - from: frontend/**/*.ts
      to: user-service
      pattern: "fetch.*api/users"

    - from: user-service
      to: payment-service
      type: grpc
```

---

## Implementation Roadmap

### Phase 1: Parser Infrastructure (Week 1-2)

1. Create base parser protocol and registry
2. Integrate tree-sitter-languages
3. Refactor existing Python parser to use new architecture
4. Add comprehensive tests

**Deliverables:**
- `backend/app/services/parsers/base.py`
- `backend/app/services/parsers/registry.py`
- `backend/app/services/parsers/tree_sitter_base.py`
- `backend/app/services/parsers/python/` (refactored)

### Phase 2: JavaScript/TypeScript Support (Week 2-3)

1. Implement JS/TS parser with tree-sitter
2. Implement node_modules resolver
3. Handle ES modules and CommonJS
4. Support TypeScript path mappings

**Deliverables:**
- `backend/app/services/parsers/javascript/`
- Support for `package.json`, `tsconfig.json`
- React/Vue component detection

### Phase 3: Go Support (Week 3-4)

1. Implement Go parser
2. Implement go.mod resolver
3. Handle Go workspace mode

**Deliverables:**
- `backend/app/services/parsers/go/`
- Support for `go.mod`, `go.work`

### Phase 4: Java Support (Week 4-5)

1. Implement Java parser
2. Support Maven and Gradle projects
3. Handle Java modules (JPMS)

**Deliverables:**
- `backend/app/services/parsers/java/`
- Support for `pom.xml`, `build.gradle`

### Phase 5: Rust Support (Week 5-6)

1. Implement Rust parser
2. Implement Cargo.toml resolver
3. Handle workspace projects

**Deliverables:**
- `backend/app/services/parsers/rust/`
- Support for `Cargo.toml`, workspace

### Phase 6: Cross-Language Detection (Week 6-7)

1. Implement OpenAPI parser
2. Implement gRPC/protobuf parser
3. Implement HTTP client detection
4. Add configuration-based linking

**Deliverables:**
- `backend/app/services/cross_language/`
- Configuration schema
- API contract parsing

### Phase 7: Frontend Updates (Week 7-8)

1. Add language badges to nodes
2. Add language filter to UI
3. Update color scheme for languages
4. Show cross-language edges differently

**Deliverables:**
- Updated visualization components
- Language legend
- Cross-language edge styling

---

## Configuration

### Project Configuration File

```yaml
# charon.yaml

# Project metadata
project:
  name: "my-monorepo"
  version: "1.0.0"

# Language-specific settings
languages:
  python:
    enabled: true
    source_roots:
      - "backend/src"
      - "scripts"
    exclude_patterns:
      - "**/__pycache__/**"
      - "**/venv/**"
      - "**/.venv/**"

  javascript:
    enabled: true
    source_roots:
      - "frontend/src"
    node_modules_path: "frontend/node_modules"
    exclude_patterns:
      - "**/node_modules/**"
      - "**/dist/**"
      - "**/build/**"

  typescript:
    enabled: true
    tsconfig_path: "frontend/tsconfig.json"

  go:
    enabled: true
    source_roots:
      - "services/api"
    go_mod_path: "services/api/go.mod"

  java:
    enabled: true
    source_roots:
      - "services/legacy/src/main/java"
    build_system: "maven"  # or "gradle"

  rust:
    enabled: true
    source_roots:
      - "services/core"
    cargo_toml_path: "services/core/Cargo.toml"

# Cross-language detection
cross_language:
  enabled: true

  # Auto-detect from API specs
  openapi_specs:
    - "api/openapi.yaml"
    - "services/*/openapi.yaml"

  grpc_protos:
    - "proto/*.proto"

  # Manual service definitions
  services:
    - name: api-gateway
      language: typescript
      base_url: http://localhost:3000

    - name: user-service
      language: python
      base_url: http://localhost:8000

    - name: payment-service
      language: go
      base_url: http://localhost:8080

# Analysis settings
analysis:
  include_external_deps: false
  max_depth: 10
  detect_circular: true
  compute_metrics: true
```

---

## References

### Tree-sitter
- [tree-sitter-languages PyPI](https://pypi.org/project/tree-sitter-languages/)
- [py-tree-sitter GitHub](https://github.com/tree-sitter/py-tree-sitter)
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
