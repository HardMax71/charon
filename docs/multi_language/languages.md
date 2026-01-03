# Language-Specific Import Resolution

Each language has its own module resolution rules.

## Python

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

---

## JavaScript / TypeScript

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

Per [Node.js module resolution](https://nodejs.org/api/esm.html)
and [TypeScript moduleResolution](https://www.typescriptlang.org/tsconfig/moduleResolution.html):

1. **Relative imports** (`./`, `../`):
    - Try exact path
    - Try with extensions: `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`
    - Try as directory with `index.{js,ts}`

2. **Package imports**:
    - Look in `node_modules/`
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
```

---

## Go

**Import Patterns:**

```go
import "fmt"
import "github.com/user/repo/package"
import alias "github.com/user/repo/package"
import . "fmt"           // Dot import
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

Key rules:

- Module path = repository root + optional subdirectory + optional major version suffix (`/v2`, `/v3`)
- Package path = module path + subdirectory within module
- Minimal Version Selection (MVS): always use the minimum version that satisfies all requirements

**Implementation:**

```python
@ParserRegistry.register
class GoParser(TreeSitterParser):
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

    CLASS_QUERY = """
    (type_declaration
      (type_spec
        name: (type_identifier) @name
        type: (struct_type)))
    (type_declaration
      (type_spec
        name: (type_identifier) @name
        type: (interface_type)))
    """

    FUNCTION_QUERY = """
    (function_declaration
      name: (identifier) @name)
    (method_declaration
      name: (field_identifier) @name)
    """
```

**Import Resolver:**

The `GoImportResolver` parses `go.mod` to determine:

- Module name for the project
- Standard library detection (imports without dots like `fmt`, `net/http`)
- Internal vs external package classification

---

## Java

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
class JavaParser(TreeSitterParser):
    language = Language.JAVA
    language_name = "java"
    file_extensions = (".java",)

    IMPORT_QUERY = """
    (import_declaration) @import
    """

    CLASS_QUERY = """
    (class_declaration
      name: (identifier) @name)
    (interface_declaration
      name: (identifier) @name)
    (enum_declaration
      name: (identifier) @name)
    (record_declaration
      name: (identifier) @name)
    """

    FUNCTION_QUERY = """
    (method_declaration
      name: (identifier) @name)
    (constructor_declaration
      name: (identifier) @name)
    """
```

**Import Resolver:**

The `JavaImportResolver` classifies imports as:

- **Standard library**: Packages starting with `java.`, `javax.`, `jdk.`, `sun.`, `com.sun.`
- **External**: All other packages (from Maven/Gradle dependencies)
- Detects project type via `pom.xml`, `build.gradle`, or `build.gradle.kts`

---

## Rust

**Import Patterns:**

```rust
use std::collections::HashMap;
use crate::module::Type;
use super::parent_module;
use self::submodule;
mod submodule;  // Module declaration
```

**Resolution Algorithm:**

Per [Cargo documentation](https://doc.rust-lang.org/cargo/reference/specifying-dependencies.html):

1. **Crate prefixes**:
    - `std::`, `core::`, `alloc::` - Standard library
    - `crate::` - Current crate root
    - `super::` - Parent module
    - `self::` - Current module
    - Other - External crate from `Cargo.toml`

2. **Cargo.toml dependencies**:
    - crates.io: `name = "version"`
    - Git: `name = { git = "url" }`
    - Path: `name = { path = "path" }`

**Implementation:**

```python
@ParserRegistry.register
class RustParser(TreeSitterParser):
    language = Language.RUST
    language_name = "rust"
    file_extensions = (".rs",)

    IMPORT_QUERY = """
    (use_declaration) @use
    (mod_item
      name: (identifier) @mod_name)
    """

    CLASS_QUERY = """
    (struct_item
      name: (type_identifier) @name)
    (enum_item
      name: (type_identifier) @name)
    (trait_item
      name: (type_identifier) @name)
    (impl_item
      type: (type_identifier) @name)
    """

    FUNCTION_QUERY = """
    (function_item
      name: (identifier) @name)
    """
```

**Import Resolver:**

The `RustImportResolver` parses `Cargo.toml` to determine:

- **Crate name**: Extracted from `[package]` section using robust regex parsing
- **Standard library**: Imports starting with `std::`, `core::`, `alloc::`, `proc_macro::`, `test::`
- **Internal**: Imports using `crate::`, `super::`, `self::` prefixes
- **External**: All other crate imports
