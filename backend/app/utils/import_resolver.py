import sys
from pathlib import Path
from typing import Literal

from app.utils.ast_parser import ImportInfo


def is_standard_library(module_name: str) -> bool:
    """Check if a module is part of the Python standard library."""
    if not module_name:
        return False

    top_level = module_name.split(".")[0]

    stdlib_modules = {
        "abc", "aifc", "argparse", "array", "ast", "asyncio", "atexit",
        "base64", "bdb", "binascii", "bisect", "builtins", "bz2",
        "calendar", "cgi", "cgitb", "chunk", "cmath", "cmd", "code",
        "codecs", "codeop", "collections", "colorsys", "compileall",
        "concurrent", "configparser", "contextlib", "contextvars", "copy",
        "copyreg", "cProfile", "crypt", "csv", "ctypes", "curses",
        "dataclasses", "datetime", "dbm", "decimal", "difflib", "dis",
        "distutils", "doctest", "email", "encodings", "ensurepip", "enum",
        "errno", "faulthandler", "fcntl", "filecmp", "fileinput", "fnmatch",
        "fractions", "ftplib", "functools", "gc", "getopt", "getpass",
        "gettext", "glob", "graphlib", "grp", "gzip", "hashlib", "heapq",
        "hmac", "html", "http", "idlelib", "imaplib", "imghdr", "imp",
        "importlib", "inspect", "io", "ipaddress", "itertools", "json",
        "keyword", "lib2to3", "linecache", "locale", "logging", "lzma",
        "mailbox", "mailcap", "marshal", "math", "mimetypes", "mmap",
        "modulefinder", "msilib", "msvcrt", "multiprocessing", "netrc",
        "nis", "nntplib", "numbers", "operator", "optparse", "os",
        "ossaudiodev", "parser", "pathlib", "pdb", "pickle", "pickletools",
        "pipes", "pkgutil", "platform", "plistlib", "poplib", "posix",
        "posixpath", "pprint", "profile", "pstats", "pty", "pwd", "py_compile",
        "pyclbr", "pydoc", "queue", "quopri", "random", "re", "readline",
        "reprlib", "resource", "rlcompleter", "runpy", "sched", "secrets",
        "select", "selectors", "shelve", "shlex", "shutil", "signal",
        "site", "smtpd", "smtplib", "sndhdr", "socket", "socketserver",
        "spwd", "sqlite3", "ssl", "stat", "statistics", "string", "stringprep",
        "struct", "subprocess", "sunau", "symtable", "sys", "sysconfig",
        "syslog", "tabnanny", "tarfile", "tempfile", "termios", "test",
        "textwrap", "threading", "time", "timeit", "tkinter", "token",
        "tokenize", "tomllib", "trace", "traceback", "tracemalloc", "tty",
        "turtle", "turtledemo", "types", "typing", "unicodedata", "unittest",
        "urllib", "uu", "uuid", "venv", "warnings", "wave", "weakref",
        "webbrowser", "winreg", "winsound", "wsgiref", "xdrlib", "xml",
        "xmlrpc", "zipapp", "zipfile", "zipimport", "zlib", "_thread",
    }

    return top_level in stdlib_modules


def resolve_relative_import(
    import_info: ImportInfo,
    current_module: str,
) -> str:
    """Resolve a relative import to an absolute module path."""
    if import_info.level == 0:
        return import_info.module

    parts = current_module.split(".")
    if import_info.level > len(parts):
        return import_info.module

    base_parts = parts[: -import_info.level] if import_info.level > 0 else parts
    if import_info.module:
        base_parts.append(import_info.module)

    return ".".join(base_parts)


def classify_import(
    import_info: ImportInfo,
    current_module: str,
    project_modules: set[str],
) -> tuple[Literal["internal", "third_party", "stdlib"], str]:
    """
    Classify an import as internal, third_party, or stdlib.

    Resolution strategies (in order):
    1. Resolve relative imports to absolute
    2. Check if it's stdlib
    3. Find matching internal module
    4. Default to third-party
    """
    # Step 1: Resolve relative imports
    resolved = resolve_relative_import(import_info, current_module)

    # Step 2: Check stdlib
    if is_standard_library(resolved):
        return "stdlib", resolved

    # Step 3: Find internal module
    internal = _find_internal_module(resolved, current_module, project_modules)
    if internal:
        return "internal", internal

    # Step 4: Default to third-party
    return "third_party", resolved


def _find_internal_module(
    resolved: str,
    current_module: str,
    project_modules: set[str],
) -> str | None:
    """
    Find the internal project module that this import refers to.

    Strategies:
    1. Exact match
    2. Resolved is a parent (import 'pkg' when we have 'pkg.mod')
    3. Project module is a parent (import 'pkg.mod.x' when we have 'pkg.mod')
    4. Context-aware resolution (prepend parent packages)
    """
    # Strategy 1: Exact match
    if resolved in project_modules:
        return resolved

    # Strategy 2: Resolved is a parent of project modules
    match = _find_as_parent(resolved, project_modules)
    if match:
        return match

    # Strategy 3: A project module is a parent of resolved
    match = _find_as_child(resolved, project_modules)
    if match:
        return match

    # Strategy 4: Context-aware resolution
    match = _resolve_with_context(resolved, current_module, project_modules)
    if match:
        return match

    return None


def _find_as_parent(resolved: str, project_modules: set[str]) -> str | None:
    """
    Check if resolved is a parent package of project modules.
    Returns resolved only if it exists as an actual module.
    """
    # Only return if the parent package itself exists (has __init__.py)
    if resolved in project_modules:
        return resolved
    return None


def _find_as_child(resolved: str, project_modules: set[str]) -> str | None:
    """Check if any project module is a parent of resolved."""
    for pm in project_modules:
        if resolved.startswith(pm + "."):
            return pm
    return None


def _resolve_with_context(
    resolved: str,
    current_module: str,
    project_modules: set[str],
) -> str | None:
    """
    Resolve imports by prepending parent packages of current module.

    Example:
        current_module: 'chat_service.app.api.auth'
        resolved: 'app.config'
        tries: 'chat_service.app.config' -> found!
    """
    parts = current_module.split(".")

    # Try prepending each level of parent packages
    for depth in range(1, len(parts)):
        parent = ".".join(parts[:depth])
        candidate = f"{parent}.{resolved}"

        # Check if this candidate exists exactly
        if candidate in project_modules:
            return candidate

        # Check if any project module is a child of this candidate
        # e.g., import 'app' when we have 'chat_service.app.config'
        prefix = candidate + "."
        matches = [pm for pm in project_modules if pm.startswith(prefix)]
        if matches:
            # Candidate is a package with submodules - return it
            # even if __init__.py doesn't exist
            return candidate

    return None


def extract_top_level_module(module_path: str) -> str:
    """Extract the top-level module from a module path."""
    return module_path.split(".")[0] if module_path else module_path
