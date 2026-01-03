import pytest
from pathlib import Path

from app.core.models import Language, NodeType
from app.services.parsers.base import ParsedImport


# =============================================================================
# Go Parser Tests
# =============================================================================


class TestGoParser:
    """Tests for Go parser."""

    def test_parse_simple_import(self, go_parser):
        """Test parsing simple Go imports."""
        code = """
package main

import "fmt"

func main() {
    fmt.Println("Hello")
}
"""
        nodes = go_parser.parse_file(Path("main.go"), code)

        assert len(nodes) >= 1
        module_node = nodes[0]
        assert module_node.node_type == NodeType.MODULE
        assert module_node.language == Language.GO
        assert len(module_node.imports) == 1
        assert module_node.imports[0].module == "fmt"

    def test_parse_multiple_imports(self, go_parser):
        """Test parsing grouped imports."""
        code = """
package main

import (
    "fmt"
    "net/http"
    "github.com/gin-gonic/gin"
)

func main() {}
"""
        nodes = go_parser.parse_file(Path("main.go"), code)
        import_modules = [imp.module for imp in nodes[0].imports]

        assert len(import_modules) == 3
        assert "fmt" in import_modules
        assert "net/http" in import_modules
        assert "github.com/gin-gonic/gin" in import_modules

    @pytest.mark.parametrize(
        "code,node_type,expected_name",
        [
            (
                "package m\ntype User struct { ID int }",
                NodeType.CLASS,
                "User",
            ),
            (
                "package m\ntype Service interface { Get() }",
                NodeType.INTERFACE,
                "Service",
            ),
        ],
        ids=["struct", "interface"],
    )
    def test_parse_type_definitions(self, go_parser, code, node_type, expected_name):
        """Test parsing Go type definitions."""
        nodes = go_parser.parse_file(Path("types.go"), code)
        type_nodes = [n for n in nodes if n.node_type == node_type]

        assert len(type_nodes) == 1
        assert type_nodes[0].name == expected_name

    def test_parse_functions(self, go_parser):
        """Test parsing function declarations."""
        code = """
package utils

func Add(a, b int) int { return a + b }
func Subtract(a, b int) int { return a - b }
"""
        nodes = go_parser.parse_file(Path("utils.go"), code)
        func_names = {n.name for n in nodes if n.node_type == NodeType.FUNCTION}

        assert func_names == {"Add", "Subtract"}


class TestGoImportResolver:
    """Tests for Go import resolver."""

    @pytest.mark.parametrize(
        "module,is_stdlib,is_internal,is_external",
        [
            ("fmt", True, False, False),
            ("net/http", True, False, False),
            ("github.com/myorg/myproject/internal/models", False, True, False),
            ("github.com/gin-gonic/gin", False, False, True),
        ],
        ids=["stdlib_simple", "stdlib_nested", "internal", "external"],
    )
    def test_import_classification(
        self, go_resolver, module, is_stdlib, is_internal, is_external
    ):
        """Test import classification."""
        import_stmt = ParsedImport(module=module, names=[], is_relative=False)
        result = go_resolver.resolve(import_stmt, Path("main.go"))

        assert result.is_stdlib == is_stdlib
        assert result.is_internal == is_internal
        assert result.is_external == is_external

    def test_module_name_loaded(self, go_resolver):
        """Test that module name is loaded from go.mod."""
        assert go_resolver.module_name == "github.com/myorg/myproject"


# =============================================================================
# Java Parser Tests
# =============================================================================


class TestJavaParser:
    """Tests for Java parser."""

    def test_parse_simple_class(self, java_parser):
        """Test parsing a simple Java class."""
        code = """
package com.example.app;

import java.util.List;

public class User {
    private String name;
}
"""
        nodes = java_parser.parse_file(Path("User.java"), code)

        assert len(nodes) >= 1
        assert nodes[0].language == Language.JAVA

    @pytest.mark.parametrize(
        "code,node_type,expected_name",
        [
            (
                "package p;\npublic interface Service { void get(); }",
                NodeType.INTERFACE,
                "Service",
            ),
            (
                "package p;\npublic class User { }",
                NodeType.CLASS,
                "User",
            ),
        ],
        ids=["interface", "class"],
    )
    def test_parse_type_definitions(self, java_parser, code, node_type, expected_name):
        """Test parsing Java type definitions."""
        nodes = java_parser.parse_file(Path("Types.java"), code)
        type_nodes = [n for n in nodes if n.node_type == node_type]

        assert len(type_nodes) == 1
        assert type_nodes[0].name == expected_name

    def test_parse_methods(self, java_parser):
        """Test parsing Java methods."""
        code = """
package com.example;

public class Calculator {
    public int add(int a, int b) { return a + b; }
    public int subtract(int a, int b) { return a - b; }
}
"""
        nodes = java_parser.parse_file(Path("Calculator.java"), code)
        func_names = {n.name for n in nodes if n.node_type == NodeType.FUNCTION}

        assert "add" in func_names
        assert "subtract" in func_names


class TestJavaImportResolver:
    """Tests for Java import resolver."""

    @pytest.mark.parametrize(
        "module,is_stdlib,is_external",
        [
            ("java.util.List", True, False),
            ("javax.servlet.http.HttpServletRequest", True, False),
            ("org.springframework.boot.SpringApplication", False, True),
        ],
        ids=["java_stdlib", "javax_stdlib", "external"],
    )
    def test_import_classification(self, java_resolver, module, is_stdlib, is_external):
        """Test import classification."""
        import_stmt = ParsedImport(module=module, names=[], is_relative=False)
        result = java_resolver.resolve(import_stmt, Path("Main.java"))

        assert result.is_stdlib == is_stdlib
        assert result.is_external == is_external


# =============================================================================
# Rust Parser Tests
# =============================================================================


class TestRustParser:
    """Tests for Rust parser."""

    def test_parse_use_statement(self, rust_parser):
        """Test parsing Rust use statements."""
        code = """
use std::collections::HashMap;

fn main() {
    let map = HashMap::new();
}
"""
        nodes = rust_parser.parse_file(Path("main.rs"), code)

        assert len(nodes) >= 1
        assert nodes[0].language == Language.RUST

    @pytest.mark.parametrize(
        "code,node_type,expected_name",
        [
            ("pub struct User { id: u64 }", NodeType.CLASS, "User"),
            ("pub enum Status { Active, Inactive }", NodeType.CLASS, "Status"),
            ("pub trait Drawable { fn draw(&self); }", NodeType.INTERFACE, "Drawable"),
        ],
        ids=["struct", "enum", "trait"],
    )
    def test_parse_type_definitions(self, rust_parser, code, node_type, expected_name):
        """Test parsing Rust type definitions."""
        nodes = rust_parser.parse_file(Path("types.rs"), code)
        type_nodes = [n for n in nodes if n.node_type == node_type]

        assert len(type_nodes) == 1
        assert type_nodes[0].name == expected_name

    def test_parse_functions(self, rust_parser):
        """Test parsing Rust functions."""
        code = """
pub fn add(a: i32, b: i32) -> i32 { a + b }
fn private_func() { println!("private"); }
"""
        nodes = rust_parser.parse_file(Path("utils.rs"), code)
        func_names = {n.name for n in nodes if n.node_type == NodeType.FUNCTION}

        assert func_names == {"add", "private_func"}


class TestRustImportResolver:
    """Tests for Rust import resolver."""

    @pytest.mark.parametrize(
        "module,is_stdlib,is_internal,is_external,package_name",
        [
            ("std::collections::HashMap", True, False, False, "std"),
            ("core::mem::size_of", True, False, False, "core"),
            ("crate::models::User", False, True, False, "my_crate"),
            ("super::parent_module", False, True, False, "my_crate"),
            ("serde::Deserialize", False, False, True, "serde"),
        ],
        ids=["std", "core", "crate", "super", "external"],
    )
    def test_import_classification(
        self, rust_resolver, module, is_stdlib, is_internal, is_external, package_name
    ):
        """Test import classification."""
        import_stmt = ParsedImport(module=module, names=[], is_relative=False)
        result = rust_resolver.resolve(import_stmt, Path("main.rs"))

        assert result.is_stdlib == is_stdlib
        assert result.is_internal == is_internal
        assert result.is_external == is_external
        assert result.package_name == package_name

    def test_crate_name_loaded(self, rust_resolver):
        """Test that crate name is loaded from Cargo.toml."""
        assert rust_resolver.crate_name == "my_crate"


# =============================================================================
# JavaScript/TypeScript Parser Tests
# =============================================================================


class TestJavaScriptParser:
    """Tests for JavaScript parser."""

    def test_parse_es6_import(self, js_parser):
        """Test parsing ES6 imports."""
        code = """
import React from 'react';
import * as utils from './utils';

function App() { return null; }
"""
        nodes = js_parser.parse_file(Path("App.js"), code)
        import_modules = [imp.module for imp in nodes[0].imports]

        assert nodes[0].language == Language.JAVASCRIPT
        assert "react" in import_modules
        assert "./utils" in import_modules

    def test_parse_commonjs_require(self, js_parser):
        """Test parsing CommonJS require."""
        code = """
const express = require('express');
const path = require('path');
"""
        nodes = js_parser.parse_file(Path("server.js"), code)
        import_modules = [imp.module for imp in nodes[0].imports]

        assert "express" in import_modules
        assert "path" in import_modules

    def test_parse_class(self, js_parser):
        """Test parsing JavaScript class."""
        code = """
class Calculator {
    add(a, b) { return a + b; }
}
"""
        nodes = js_parser.parse_file(Path("Calculator.js"), code)
        class_nodes = [n for n in nodes if n.node_type == NodeType.CLASS]

        assert len(class_nodes) == 1
        assert class_nodes[0].name == "Calculator"


class TestTypeScriptParser:
    """Tests for TypeScript parser."""

    def test_parse_typescript_imports(self, ts_parser):
        """Test parsing TypeScript imports."""
        code = """
import { Component } from '@angular/core';

@Component({})
class AppComponent {}
"""
        nodes = ts_parser.parse_file(Path("app.component.ts"), code)
        assert nodes[0].language == Language.TYPESCRIPT

    def test_parse_class(self, ts_parser):
        """Test parsing TypeScript class."""
        code = """
export class User {
    id: number;
    constructor(id: number) { this.id = id; }
}
"""
        nodes = ts_parser.parse_file(Path("user.ts"), code)
        class_nodes = [n for n in nodes if n.node_type == NodeType.CLASS]

        assert len(class_nodes) == 1
        assert class_nodes[0].name == "User"


class TestJavaScriptImportResolver:
    """Tests for JavaScript import resolver."""

    @pytest.mark.parametrize(
        "module,is_relative,is_internal,is_external,is_stdlib",
        [
            ("./utils", True, True, False, False),
            ("react", False, False, True, False),
            ("path", False, False, False, True),
        ],
        ids=["relative", "package", "node_builtin"],
    )
    def test_import_classification(
        self, js_resolver, module, is_relative, is_internal, is_external, is_stdlib
    ):
        """Test import classification."""
        import_stmt = ParsedImport(module=module, names=[], is_relative=is_relative)
        result = js_resolver.resolve(import_stmt, Path("src/index.js"))

        assert result.is_internal == is_internal
        assert result.is_external == is_external
        assert result.is_stdlib == is_stdlib


# =============================================================================
# Python Parser Tests
# =============================================================================


class TestPythonParser:
    """Tests for Python parser."""

    def test_parse_imports(self, python_parser):
        """Test parsing Python imports."""
        code = """
import os
import sys
from pathlib import Path

def main(): pass
"""
        nodes = python_parser.parse_file(Path("main.py"), code)
        import_modules = [imp.module for imp in nodes[0].imports]

        assert nodes[0].language == Language.PYTHON
        assert "os" in import_modules
        assert "sys" in import_modules
        assert "pathlib" in import_modules

    def test_parse_relative_imports(self, python_parser):
        """Test parsing relative imports."""
        code = """
from . import sibling
from ..parent import something
"""
        nodes = python_parser.parse_file(Path("package/module.py"), code)
        relative_imports = [imp for imp in nodes[0].imports if imp.is_relative]

        assert len(relative_imports) >= 1

    def test_parse_class(self, python_parser):
        """Test parsing Python class."""
        code = """
class User:
    def __init__(self, name: str):
        self.name = name
"""
        nodes = python_parser.parse_file(Path("user.py"), code)
        class_nodes = [n for n in nodes if n.node_type == NodeType.CLASS]

        assert len(class_nodes) == 1
        assert class_nodes[0].name == "User"

    def test_parse_functions(self, python_parser):
        """Test parsing Python functions."""
        code = """
def add(a: int, b: int) -> int:
    return a + b

async def fetch_data(url: str) -> dict:
    pass
"""
        nodes = python_parser.parse_file(Path("utils.py"), code)
        func_names = {n.name for n in nodes if n.node_type == NodeType.FUNCTION}

        assert "add" in func_names
        assert "fetch_data" in func_names


class TestPythonImportResolver:
    """Tests for Python import resolver."""

    @pytest.mark.parametrize(
        "module,is_stdlib,is_external",
        [
            ("os", True, False),
            ("typing", True, False),
            ("requests", False, True),
        ],
        ids=["os", "typing", "third_party"],
    )
    def test_import_classification(
        self, python_resolver, module, is_stdlib, is_external
    ):
        """Test import classification."""
        import_stmt = ParsedImport(module=module, names=[], is_relative=False)
        result = python_resolver.resolve(import_stmt, Path("main.py"))

        assert result.is_stdlib == is_stdlib
        assert result.is_external == is_external

    def test_relative_import(self, tmp_path):
        """Test resolving relative imports."""
        from app.services.parsers.python import PythonImportResolver

        project_resolver = PythonImportResolver(
            tmp_path, project_modules={"package", "package.sibling", "package.module"}
        )

        import_stmt = ParsedImport(
            module="sibling", names=[], is_relative=True, level=1
        )
        result = project_resolver.resolve(
            import_stmt, tmp_path / "package" / "module.py"
        )

        assert result.is_internal is True
