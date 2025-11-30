from functools import lru_cache
from pathlib import Path

from app.services.parsers.base import ImportResolution, ParsedImport

STDLIB_MODULES = frozenset(
    {
        "abc",
        "aifc",
        "argparse",
        "array",
        "ast",
        "asyncio",
        "atexit",
        "base64",
        "bdb",
        "binascii",
        "bisect",
        "builtins",
        "bz2",
        "calendar",
        "cgi",
        "cgitb",
        "chunk",
        "cmath",
        "cmd",
        "code",
        "codecs",
        "codeop",
        "collections",
        "colorsys",
        "compileall",
        "concurrent",
        "configparser",
        "contextlib",
        "contextvars",
        "copy",
        "copyreg",
        "cProfile",
        "crypt",
        "csv",
        "ctypes",
        "curses",
        "dataclasses",
        "datetime",
        "dbm",
        "decimal",
        "difflib",
        "dis",
        "distutils",
        "doctest",
        "email",
        "encodings",
        "ensurepip",
        "enum",
        "errno",
        "faulthandler",
        "fcntl",
        "filecmp",
        "fileinput",
        "fnmatch",
        "fractions",
        "ftplib",
        "functools",
        "gc",
        "getopt",
        "getpass",
        "gettext",
        "glob",
        "graphlib",
        "grp",
        "gzip",
        "hashlib",
        "heapq",
        "hmac",
        "html",
        "http",
        "idlelib",
        "imaplib",
        "imghdr",
        "imp",
        "importlib",
        "inspect",
        "io",
        "ipaddress",
        "itertools",
        "json",
        "keyword",
        "lib2to3",
        "linecache",
        "locale",
        "logging",
        "lzma",
        "mailbox",
        "mailcap",
        "marshal",
        "math",
        "mimetypes",
        "mmap",
        "modulefinder",
        "msilib",
        "msvcrt",
        "multiprocessing",
        "netrc",
        "nis",
        "nntplib",
        "numbers",
        "operator",
        "optparse",
        "os",
        "ossaudiodev",
        "parser",
        "pathlib",
        "pdb",
        "pickle",
        "pickletools",
        "pipes",
        "pkgutil",
        "platform",
        "plistlib",
        "poplib",
        "posix",
        "posixpath",
        "pprint",
        "profile",
        "pstats",
        "pty",
        "pwd",
        "py_compile",
        "pyclbr",
        "pydoc",
        "queue",
        "quopri",
        "random",
        "re",
        "readline",
        "reprlib",
        "resource",
        "rlcompleter",
        "runpy",
        "sched",
        "secrets",
        "select",
        "selectors",
        "shelve",
        "shlex",
        "shutil",
        "signal",
        "site",
        "smtpd",
        "smtplib",
        "sndhdr",
        "socket",
        "socketserver",
        "spwd",
        "sqlite3",
        "ssl",
        "stat",
        "statistics",
        "string",
        "stringprep",
        "struct",
        "subprocess",
        "sunau",
        "symtable",
        "sys",
        "sysconfig",
        "syslog",
        "tabnanny",
        "tarfile",
        "tempfile",
        "termios",
        "test",
        "textwrap",
        "threading",
        "time",
        "timeit",
        "tkinter",
        "token",
        "tokenize",
        "tomllib",
        "trace",
        "traceback",
        "tracemalloc",
        "tty",
        "turtle",
        "turtledemo",
        "types",
        "typing",
        "unicodedata",
        "unittest",
        "urllib",
        "uu",
        "uuid",
        "venv",
        "warnings",
        "wave",
        "weakref",
        "webbrowser",
        "winreg",
        "winsound",
        "wsgiref",
        "xdrlib",
        "xml",
        "xmlrpc",
        "zipapp",
        "zipfile",
        "zipimport",
        "zlib",
        "_thread",
    }
)


@lru_cache(maxsize=1024)
def is_stdlib(module_name: str) -> bool:
    if not module_name:
        return False
    return module_name.split(".")[0] in STDLIB_MODULES


class PythonImportResolver:
    def __init__(self, project_root: Path, project_modules: set[str] | None = None):
        self.project_root = project_root
        self.project_modules = project_modules or set()

    def resolve(
        self,
        import_stmt: ParsedImport,
        from_file: Path,
    ) -> ImportResolution:
        resolved = self._resolve_relative(import_stmt, from_file)

        if is_stdlib(resolved):
            return ImportResolution(
                resolved_path=f"stdlib:{resolved}",
                is_internal=False,
                is_external=False,
                is_stdlib=True,
            )

        internal_match = self._find_internal(resolved, from_file)
        if internal_match:
            return ImportResolution(
                resolved_path=internal_match,
                is_internal=True,
                is_external=False,
                is_stdlib=False,
            )

        return ImportResolution(
            resolved_path=f"external:{resolved}",
            is_internal=False,
            is_external=True,
            is_stdlib=False,
            package_name=resolved.split(".")[0],
        )

    def _resolve_relative(self, import_stmt: ParsedImport, from_file: Path) -> str:
        if not import_stmt.is_relative or import_stmt.level == 0:
            return import_stmt.module

        try:
            relative = from_file.relative_to(self.project_root)
        except ValueError:
            relative = from_file

        parts = list(relative.parent.parts)

        if import_stmt.level > len(parts):
            return import_stmt.module

        base_parts = parts[: -import_stmt.level] if import_stmt.level > 0 else parts

        if import_stmt.module:
            base_parts.append(import_stmt.module)

        return ".".join(base_parts)

    def _find_internal(self, resolved: str, from_file: Path) -> str | None:
        if resolved in self.project_modules:
            return resolved

        if any(m.startswith(resolved + ".") for m in self.project_modules):
            return resolved

        for module in self.project_modules:
            if resolved.startswith(module + "."):
                return module

        try:
            relative = from_file.relative_to(self.project_root)
            current_parts = list(relative.parent.parts)

            for depth in range(1, len(current_parts) + 1):
                parent = ".".join(current_parts[:depth])
                candidate = f"{parent}.{resolved}"

                if candidate in self.project_modules:
                    return candidate

                if any(m.startswith(candidate + ".") for m in self.project_modules):
                    return candidate
        except ValueError:
            pass

        return None

    def set_project_modules(self, modules: set[str]):
        self.project_modules = modules
