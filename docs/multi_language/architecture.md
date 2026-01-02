# Parser Architecture

## Directory Structure

```text
backend/app/services/parsers/
├── __init__.py
├── base.py                    # Abstract base class and protocols
├── registry.py                # Parser registration and discovery
├── tree_sitter_base.py        # Common tree-sitter functionality
├── python/
│   ├── __init__.py
│   ├── parser.py              # Python-specific parser
│   └── import_resolver.py     # Python import resolution
└── javascript/
    ├── __init__.py
    ├── parser.py              # JS/TS parser (includes TypeScript)
    └── import_resolver.py     # node_modules resolution
```

!!! note "Planned Parsers"
    Support for Java, Go, and Rust is planned. Each will follow the same structure with `parser.py` and `import_resolver.py` modules.

## Base Parser Protocol

The [`ImportResolution`](https://github.com/HardMax71/charon/blob/main/backend/app/services/parsers/base.py#L9-L16) dataclass represents the result of resolving an import:

```python title="backend/app/services/parsers/base.py" linenums="9"
--8<-- "backend/app/services/parsers/base.py:9:16"
```

The [`ParsedNode`](https://github.com/HardMax71/charon/blob/main/backend/app/services/parsers/base.py#L28-L40) dataclass represents a parsed code entity:

```python title="backend/app/services/parsers/base.py" linenums="28"
--8<-- "backend/app/services/parsers/base.py:28:40"
```

The [`LanguageParser`](https://github.com/HardMax71/charon/blob/main/backend/app/services/parsers/base.py#L43-L61) protocol defines the interface for language parsers:

```python title="backend/app/services/parsers/base.py" linenums="43"
--8<-- "backend/app/services/parsers/base.py:43:61"
```

## Parser Registry

The [`ParserRegistry`](https://github.com/HardMax71/charon/blob/main/backend/app/services/parsers/registry.py#L8-L63) provides central registration and discovery of parsers:

```python title="backend/app/services/parsers/registry.py" linenums="8"
--8<-- "backend/app/services/parsers/registry.py:8:63"
```

---

## Tree-sitter Integration

### Why Tree-sitter?

[Tree-sitter](https://tree-sitter.github.io/) is a parser generator and incremental parsing library:

- **Unified API**: Same interface for 100+ languages
- **Speed**: Incremental parsing, typically < 1ms for edits
- **Error tolerance**: Produces valid syntax trees even for broken code
- **Queries**: Pattern matching DSL for extracting code structures

### Installation

```bash
pip install tree-sitter-language-pack
```

The [tree-sitter-language-pack](https://pypi.org/project/tree-sitter-language-pack/) package provides pre-compiled
binaries for many languages.

### Base Tree-sitter Parser

The [`TreeSitterParser`](https://github.com/HardMax71/charon/blob/main/backend/app/services/parsers/tree_sitter_base.py#L10-L83) base class provides common tree-sitter functionality:

```python title="backend/app/services/parsers/tree_sitter_base.py" linenums="10"
--8<-- "backend/app/services/parsers/tree_sitter_base.py:10:83"
```

### Tree-sitter Query Syntax

Tree-sitter uses S-expression patterns for matching syntax nodes:

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

See the full [Tree-sitter Query Syntax docs](https://tree-sitter.github.io/tree-sitter/using-parsers/queries/1-syntax.html).
