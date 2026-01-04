import pytest

from app.core.models import FileInput, Language, NodeType
from app.services.analysis.multi_language import MultiLanguageAnalyzer


class TestMultiLanguageAnalyzer:
    @pytest.fixture
    def analyzer(self):
        return MultiLanguageAnalyzer()

    def test_analyze_empty_files(self, analyzer):
        result = analyzer.analyze([], "test_project")

        assert len(result.modules) == 0
        assert "No supported files found" in result.errors[0]

    def test_analyze_python_files(self, analyzer):
        files = [
            FileInput(
                path="app/main.py",
                content="import os\nfrom app.utils import helper\n\ndef main():\n    pass",
            ),
            FileInput(
                path="app/utils.py",
                content="def helper():\n    return 42",
            ),
        ]

        result = analyzer.analyze(files, "test_project")

        assert "app.main" in result.modules
        assert "app.utils" in result.modules
        assert len(result.dependencies) > 0

    def test_analyze_javascript_files(self, analyzer):
        files = [
            FileInput(
                path="src/index.js",
                content="import { helper } from './utils';\nexport default function main() {}",
            ),
            FileInput(
                path="src/utils.js",
                content="export function helper() { return 42; }",
            ),
        ]

        result = analyzer.analyze(files, "test_project")

        assert len(result.modules) == 2

    def test_analyze_typescript_files(self, analyzer):
        files = [
            FileInput(
                path="src/app.ts",
                content="import { Service } from './service';\nconst s = new Service();",
            ),
            FileInput(
                path="src/service.ts",
                content="export class Service { run() {} }",
            ),
        ]

        result = analyzer.analyze(files, "test_project")

        assert len(result.modules) == 2

    def test_analyze_mixed_languages(self, analyzer):
        files = [
            FileInput(
                path="backend/main.py",
                content="import json\n\ndef api(): pass",
            ),
            FileInput(
                path="frontend/app.ts",
                content="import React from 'react';\nexport default function App() {}",
            ),
        ]

        result = analyzer.analyze(files, "test_project")

        assert len(result.modules) == 2

    @pytest.mark.parametrize(
        "file_path,expected_service",
        [
            ("frontend/src/App.tsx", "frontend"),
            ("backend/main.py", "backend"),
            ("api/routes.py", "api"),
            ("packages/utils/index.ts", "utils"),
            ("libs/common/helper.py", "common"),
            ("apps/web/pages/index.tsx", "web"),
            ("services/auth/handler.py", "auth"),
            ("src/components/Button.tsx", "main"),
            ("src/backend/api.py", "backend"),
            ("nested/deep/file.py", "nested"),
        ],
        ids=[
            "frontend",
            "backend",
            "api",
            "packages",
            "libs",
            "apps",
            "services",
            "src_main",
            "src_with_service",
            "nested",
        ],
    )
    def test_detect_service(self, analyzer, file_path, expected_service):
        result = analyzer._detect_service(file_path)
        assert result == expected_service

    def test_detect_service_single_file(self, analyzer):
        result = analyzer._detect_service("file.py")
        assert result is None

    def test_detect_service_empty_path(self, analyzer):
        result = analyzer._detect_service("")
        assert result is None

    @pytest.mark.parametrize(
        "file_path,content,language,expected_kind",
        [
            (
                "useCounter.ts",
                "export function useCounter() {}",
                Language.TYPESCRIPT,
                NodeType.HOOK,
            ),
            (
                "Button.tsx",
                "export default function Button() { return <div/>; }",
                Language.TYPESCRIPT,
                NodeType.COMPONENT,
            ),
            ("models.py", "class User:\n    pass", Language.PYTHON, NodeType.CLASS),
            (
                "user_service.py",
                "def get_user(): pass",
                Language.PYTHON,
                NodeType.SERVICE,
            ),
            ("utils.py", "def helper(): pass", Language.PYTHON, NodeType.MODULE),
        ],
        ids=["hook", "component", "py_class", "py_service", "py_module"],
    )
    def test_detect_node_kind(
        self, analyzer, file_path, content, language, expected_kind
    ):
        result = analyzer._detect_node_kind(file_path, content, language)
        assert result == expected_kind

    def test_detect_node_kind_ts_service(self, analyzer):
        result = analyzer._detect_node_kind(
            "apiService.ts", "export class ApiService {}", Language.TYPESCRIPT
        )
        assert result in (NodeType.SERVICE, NodeType.COMPONENT, NodeType.MODULE)

    def test_group_by_language(self, analyzer):
        files = [
            FileInput(path="main.py", content=""),
            FileInput(path="app.ts", content=""),
            FileInput(path="index.js", content=""),
            FileInput(path="README.md", content=""),
        ]

        result = analyzer._group_by_language(files)

        assert Language.PYTHON in result
        assert Language.TYPESCRIPT in result
        assert Language.JAVASCRIPT in result
        assert len(result) == 3

    @pytest.mark.parametrize(
        "file_path,language,expected_id",
        [
            ("app/main.py", Language.PYTHON, "app.main"),
            ("app/__init__.py", Language.PYTHON, "app"),
            ("src/index.ts", Language.TYPESCRIPT, "src"),
            ("src/utils/helper.ts", Language.TYPESCRIPT, "src.utils.helper"),
            ("src/index.js", Language.JAVASCRIPT, "src"),
        ],
        ids=["py_module", "py_init", "ts_index", "ts_nested", "js_index"],
    )
    def test_file_to_module_id(self, analyzer, file_path, language, expected_id):
        result = analyzer._file_to_module_id(file_path, language)
        assert result == expected_id

    def test_relative_js_import_resolution(self, analyzer):
        files = [
            FileInput(
                path="src/components/Button.tsx",
                content="import { helper } from '../utils/helper';",
            ),
            FileInput(
                path="src/utils/helper.ts",
                content="export function helper() {}",
            ),
        ]

        result = analyzer.analyze(files, "project")

        assert "src.components.Button" in result.modules

    def test_analyze_with_package_json(self, analyzer):
        files = [
            FileInput(
                path="package.json",
                content='{"name": "my-app", "dependencies": {"react": "^18.0.0"}}',
            ),
            FileInput(
                path="src/App.tsx",
                content="import React from 'react';\nexport default function App() { return <div/>; }",
            ),
        ]

        result = analyzer.analyze(files, "project")

        assert "src.App" in result.modules

    def test_analyze_with_tsconfig(self, analyzer):
        files = [
            FileInput(
                path="tsconfig.json",
                content='{"compilerOptions": {"baseUrl": ".", "paths": {"@/*": ["src/*"]}}}',
            ),
            FileInput(
                path="src/index.ts",
                content="export const app = 'app';",
            ),
        ]

        result = analyzer.analyze(files, "project")

        assert len(result.modules) > 0

    def test_analyze_with_invalid_package_json(self, analyzer):
        files = [
            FileInput(path="package.json", content="not valid json"),
            FileInput(path="src/app.ts", content="export const x = 1;"),
        ]

        result = analyzer.analyze(files, "project")

        assert len(result.modules) > 0

    def test_import_details_collected(self, analyzer):
        files = [
            FileInput(
                path="app/main.py",
                content="from app.utils import helper, formatter",
            ),
            FileInput(
                path="app/utils.py",
                content="def helper(): pass\ndef formatter(): pass",
            ),
        ]

        result = analyzer.analyze(files, "project")

        if ("app.main", "app.utils") in result.import_details:
            imports = result.import_details[("app.main", "app.utils")]
            assert len(imports) > 0

    def test_module_metadata_collected(self, analyzer):
        files = [
            FileInput(
                path="backend/service.py",
                content="class UserService:\n    pass",
            ),
        ]

        result = analyzer.analyze(files, "project")

        assert "backend.service" in result.module_metadata
        metadata = result.module_metadata["backend.service"]
        assert metadata.language == "python"
        assert metadata.service == "backend"

    def test_complexity_calculated_for_python(self, analyzer):
        files = [
            FileInput(
                path="app/complex.py",
                content="""
def complex_function(x):
    if x > 0:
        if x > 10:
            return "big"
        else:
            return "small"
    else:
        return "negative"
""",
            ),
        ]

        result = analyzer.analyze(files, "project")

        assert "app.complex" in result.complexity

    def test_parse_error_handling(self, analyzer):
        files = [
            FileInput(
                path="app/broken.py",
                content="def broken(\n  # syntax error without closing",
            ),
        ]

        result = analyzer.analyze(files, "project")

        assert "app.broken" in result.complexity
        assert result.complexity["app.broken"].error is not None

    def test_unsupported_file_filtered(self, analyzer):
        files = [
            FileInput(path="README.md", content="# Readme"),
            FileInput(path="data.json", content="{}"),
            FileInput(path="app.py", content="x = 1"),
        ]

        result = analyzer.analyze(files, "project")

        assert "app" in result.modules
        assert len(result.modules) == 1

    def test_load_project_config(self, analyzer):
        files = [
            FileInput(
                path="package.json",
                content='{"name": "test", "version": "1.0.0"}',
            ),
            FileInput(
                path="nested/package.json",
                content='{"name": "nested"}',
            ),
        ]

        result = analyzer._load_project_config(files, "package.json")

        assert result is not None
        assert result["name"] == "test"

    def test_resolve_relative_js_import(self, analyzer):
        analyzer._path_to_module = {
            "src/utils/helper.ts": "src.utils.helper",
            "src/utils/helper": "src.utils.helper",
        }

        result = analyzer._resolve_relative_js_import(
            "../utils/helper", "src/components/Button.tsx"
        )

        assert result == "src.utils.helper"

    def test_resolve_relative_js_import_index(self, analyzer):
        analyzer._path_to_module = {
            "src/utils/index.ts": "src.utils",
            "src/utils": "src.utils",
        }

        result = analyzer._resolve_relative_js_import(
            "../utils", "src/components/Button.tsx"
        )

        assert result == "src.utils"

    def test_resolve_relative_js_import_not_found(self, analyzer):
        analyzer._path_to_module = {}

        result = analyzer._resolve_relative_js_import("./missing", "src/app.ts")

        assert result is None
