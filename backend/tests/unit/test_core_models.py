import io
import json

import pytest
from pydantic import ValidationError
from starlette.datastructures import UploadFile

from app.core.config import settings
from app.core.models import (
    FileInput,
    PerformanceAnalyzeForm,
    PerformanceProfileUpload,
    SourceFilesPayload,
)


def _sample_graph_payload() -> dict:
    return {
        "nodes": [
            {
                "id": "module_a",
                "label": "module_a.py",
                "type": "internal",
                "module": "module_a",
                "position": {"x": 0, "y": 0, "z": 0},
                "color": "#ffffff",
                "metrics": {
                    "afferent_coupling": 0,
                    "efferent_coupling": 0,
                    "instability": 0.0,
                },
            }
        ],
        "edges": [],
    }


def test_source_files_payload_limits_count(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "max_files_count", 1)
    files = [
        FileInput(path="a.py", content="x = 1"),
        FileInput(path="b.py", content="y = 2"),
    ]

    with pytest.raises(ValidationError) as excinfo:
        SourceFilesPayload(files=files)

    assert "Too many files" in str(excinfo.value)


def test_source_files_payload_limits_size(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "max_files_count", 5)
    monkeypatch.setattr(settings, "max_upload_size_mb", 0)
    files = [FileInput(path="a.py", content="x")]

    with pytest.raises(ValidationError) as excinfo:
        SourceFilesPayload(files=files)

    assert "Total source size exceeds limit" in str(excinfo.value)


def test_performance_analyze_form_parses_json() -> None:
    graph_payload = _sample_graph_payload()
    weights_payload = {
        "execution_time": 0.5,
        "coupling": 0.25,
        "complexity": 0.15,
        "memory_usage": 0.05,
        "call_frequency": 0.05,
    }

    form = PerformanceAnalyzeForm(
        graph_json=json.dumps(graph_payload),
        weights_json=json.dumps(weights_payload),
    )

    assert form.graph.nodes[0].id == "module_a"
    assert form.weights is not None
    assert form.weights.execution_time == 0.5


def test_performance_analyze_form_rejects_invalid_json() -> None:
    with pytest.raises(ValidationError) as excinfo:
        PerformanceAnalyzeForm(graph_json="{")

    assert "Invalid graph JSON" in str(excinfo.value)


def test_performance_profile_upload_rejects_extension() -> None:
    upload = UploadFile(filename="profile.txt", file=io.BytesIO(b""))

    with pytest.raises(ValidationError) as excinfo:
        PerformanceProfileUpload(file=upload)

    assert "Unsupported format" in str(excinfo.value)


def test_performance_profile_upload_accepts_prof() -> None:
    upload = UploadFile(filename="profile.prof", file=io.BytesIO(b""))
    model = PerformanceProfileUpload(file=upload)

    assert model.file.filename == "profile.prof"
