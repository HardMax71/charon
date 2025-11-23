import pytest
from app.services import analyze_files
from app.core.models import FileInput


def test_basic_import_analysis():
    """Test basic import detection."""
    files = [
        FileInput(
            path="module_a.py",
            content="import os\nfrom module_b import something"
        ),
        FileInput(
            path="module_b.py",
            content="def something(): pass"
        ),
    ]

    result = analyze_files(files, "test_project")

    assert "module_a" in result.modules
    assert "module_b" in result.modules
    assert "module_b" in result.dependencies["module_a"]


def test_relative_imports():
    """Test relative import resolution."""
    files = [
        FileInput(
            path="package/module_a.py",
            content="from . import module_b"
        ),
        FileInput(
            path="package/module_b.py",
            content="x = 1"
        ),
    ]

    result = analyze_files(files, "test_project")
    assert len(result.errors) == 0


def test_syntax_error_handling():
    """Test that syntax errors are captured."""
    files = [
        FileInput(
            path="bad.py",
            content="this is not valid python syntax @#$%"
        ),
    ]

    result = analyze_files(files, "test_project")
    assert len(result.errors) > 0
