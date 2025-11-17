import sys
from pathlib import Path
from typing import Literal

from app.utils.ast_parser import ImportInfo


def is_standard_library(module_name: str) -> bool:
    """
    Check if a module is part of the Python standard library.

    Note: This is a heuristic and may not be 100% accurate for all edge cases.
    """
    if not module_name:
        return False

    # Get the top-level module name
    top_level = module_name.split(".")[0]

    # Common standard library modules (not exhaustive, but covers most cases)
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
    """
    Resolve a relative import to an absolute module path.

    Args:
        import_info: Import information
        current_module: Current module path (e.g., 'package.subpackage.module')

    Returns:
        Absolute module path
    """
    if import_info.level == 0:
        # Absolute import
        return import_info.module

    # Split current module into parts
    parts = current_module.split(".")

    # Go up 'level' number of packages
    # level=1: from . import x (same package)
    # level=2: from .. import x (parent package)
    if import_info.level > len(parts):
        # Can't go up that many levels; return as-is
        return import_info.module

    # Remove the last 'level' parts
    base_parts = parts[: -import_info.level] if import_info.level > 0 else parts

    # Add the imported module
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

    Args:
        import_info: Import information
        current_module: Current module path
        project_modules: Set of all module paths in the project

    Returns:
        Tuple of (type, resolved_module_path)
    """
    # Resolve relative imports
    resolved_module = resolve_relative_import(import_info, current_module)

    # Check if stdlib
    if is_standard_library(resolved_module):
        return "stdlib", resolved_module

    # Check if internal (exact match or submodule)
    if resolved_module in project_modules:
        return "internal", resolved_module

    # Check if it's a submodule of an internal module
    for project_module in project_modules:
        if resolved_module.startswith(project_module + "."):
            return "internal", project_module

    # Check if internal module is a submodule of this import
    # (e.g., import might be 'package' but we have 'package.module')
    for project_module in project_modules:
        if project_module.startswith(resolved_module + "."):
            return "internal", project_module

    # Otherwise, it's third-party
    return "third_party", resolved_module


def extract_top_level_module(module_path: str) -> str:
    """Extract the top-level module from a module path."""
    return module_path.split(".")[0] if module_path else module_path
