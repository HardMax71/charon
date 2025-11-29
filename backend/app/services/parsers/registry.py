from pathlib import Path
from typing import ClassVar

from app.core.models import Language
from app.services.parsers.base import BaseParser


class ParserRegistry:
    _parsers: ClassVar[dict[Language, type[BaseParser]]] = {}
    _extension_map: ClassVar[dict[str, Language]] = {}

    @classmethod
    def register(cls, parser_class: type[BaseParser]) -> type[BaseParser]:
        cls._parsers[parser_class.language] = parser_class
        for ext in parser_class.file_extensions:
            cls._extension_map[ext] = parser_class.language
        return parser_class

    @classmethod
    def get_parser(cls, language: Language) -> BaseParser:
        if language not in cls._parsers:
            raise ValueError(f"No parser registered for {language}")
        return cls._parsers[language]()

    @classmethod
    def get_parser_for_file(cls, path: Path) -> BaseParser | None:
        ext = path.suffix.lower()
        if ext in cls._extension_map:
            return cls.get_parser(cls._extension_map[ext])
        return None

    @classmethod
    def detect_languages(cls, project_path: Path) -> list[Language]:
        detected: set[Language] = set()

        config_indicators = {
            Language.PYTHON: ("pyproject.toml", "setup.py", "requirements.txt"),
            Language.JAVASCRIPT: ("package.json",),
            Language.TYPESCRIPT: ("tsconfig.json",),
            Language.JAVA: ("pom.xml", "build.gradle", "build.gradle.kts"),
            Language.GO: ("go.mod",),
            Language.RUST: ("Cargo.toml",),
        }

        for lang, indicators in config_indicators.items():
            for indicator in indicators:
                if (project_path / indicator).exists():
                    detected.add(lang)
                    break

        for path in project_path.rglob("*"):
            if path.is_file() and path.suffix.lower() in cls._extension_map:
                detected.add(cls._extension_map[path.suffix.lower()])

        return list(detected)

    @classmethod
    def get_registered_languages(cls) -> list[Language]:
        return list(cls._parsers.keys())

    @classmethod
    def get_supported_extensions(cls) -> list[str]:
        return list(cls._extension_map.keys())
