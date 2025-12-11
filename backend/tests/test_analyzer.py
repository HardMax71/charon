import pytest
from app.services import analyze_files
from app.core.models import FileInput


@pytest.mark.asyncio
async def test_basic_import_analysis():
    files = [
        FileInput(
            path="module_a.py", content="import os\nfrom module_b import something"
        ),
        FileInput(path="module_b.py", content="def something(): pass"),
    ]

    result = await analyze_files(files, "test_project")

    assert "module_a" in result.modules
    assert "module_b" in result.modules
    assert "module_b" in result.dependencies["module_a"]


@pytest.mark.asyncio
async def test_relative_imports():
    files = [
        FileInput(path="package/module_a.py", content="from . import module_b"),
        FileInput(path="package/module_b.py", content="x = 1"),
    ]

    result = await analyze_files(files, "test_project")
    assert len(result.errors) == 0


@pytest.mark.asyncio
async def test_syntax_error_handling():
    files = [
        FileInput(path="bad.py", content="this is not valid python syntax @#$%"),
    ]

    result = await analyze_files(files, "test_project")
    assert len(result.errors) > 0
