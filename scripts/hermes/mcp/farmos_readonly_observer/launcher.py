#!/usr/bin/env python3
"""Fixed, fail-closed launcher for the local FarmOS read-only MCP server."""

from __future__ import annotations

import os
import re
import stat
import subprocess
import sys
from pathlib import Path
from typing import Mapping
from urllib.parse import urlparse

REPOSITORY = Path("/Users/hayate/projects/farmos-core")
ENV_FILE = REPOSITORY / ".env.local"
TSX = REPOSITORY / "node_modules/.bin/tsx"
SERVER = (
    REPOSITORY
    / "scripts/hermes/mcp/farmos_readonly_observer/server.ts"
)
GIT = Path("/usr/bin/git")

ALLOWED_KEYS = (
    "APPARETENKEI_READONLY_API_BASE_URL",
    "FARMOS_CORE_READONLY_TOKEN",
    "APPARETENKEI_READONLY_API_TIMEOUT_MS",
)
REQUIRED_KEYS = ALLOWED_KEYS[:2]
BASE_ENV_KEYS = ("HOME", "PATH", "LANG", "LC_ALL", "HERMES_HOME")
ASSIGNMENT = re.compile(
    r"^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$",
)


class LauncherError(Exception):
    """Safe launcher failure containing only an allowlisted error code."""


def _fail(code: str) -> LauncherError:
    return LauncherError(code)


def _parse_value(raw: str) -> str:
    value = raw.strip()
    if not value:
        return ""
    if value[0] in {'"', "'"}:
        if len(value) < 2 or value[-1] != value[0]:
            raise _fail("ENV_VALUE_INVALID")
        value = value[1:-1]
    elif any(character.isspace() for character in value):
        raise _fail("ENV_VALUE_INVALID")
    return value


def _git_reports_tracked(repository: Path, env_file: Path) -> bool:
    try:
        relative = env_file.relative_to(repository)
        completed = subprocess.run(
            [
                str(GIT),
                "-C",
                str(repository),
                "ls-files",
                "--error-unmatch",
                "--",
                str(relative),
            ],
            check=False,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            env={
                key: os.environ[key]
                for key in ("HOME", "PATH", "LANG", "LC_ALL")
                if key in os.environ
            },
        )
    except (OSError, ValueError):
        raise _fail("ENV_FILE_UNSAFE")
    if completed.returncode not in (0, 1):
        raise _fail("ENV_FILE_UNSAFE")
    return completed.returncode == 0


def load_allowed_environment(
    env_file: Path,
    *,
    repository: Path | None = None,
    expected_uid: int | None = None,
    require_git_untracked: bool = True,
) -> dict[str, str]:
    try:
        metadata = env_file.lstat()
    except OSError:
        raise _fail("ENV_FILE_UNSAFE")
    owner = os.getuid() if expected_uid is None else expected_uid
    if (
        stat.S_ISLNK(metadata.st_mode)
        or not stat.S_ISREG(metadata.st_mode)
        or metadata.st_uid != owner
        or stat.S_IMODE(metadata.st_mode) != 0o600
    ):
        raise _fail("ENV_FILE_UNSAFE")
    if require_git_untracked:
        if repository is None or _git_reports_tracked(repository, env_file):
            raise _fail("ENV_FILE_UNSAFE")

    found: dict[str, list[str]] = {key: [] for key in ALLOWED_KEYS}
    try:
        lines = env_file.read_text(encoding="utf-8").splitlines()
    except (OSError, UnicodeError):
        raise _fail("ENV_FILE_UNSAFE")
    for raw_line in lines:
        stripped = raw_line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        match = ASSIGNMENT.fullmatch(stripped)
        if match is None:
            candidate = stripped.removeprefix("export ").lstrip()
            if any(
                candidate == key or candidate.startswith(f"{key} ")
                for key in ALLOWED_KEYS
            ):
                raise _fail("ENV_VALUE_INVALID")
            continue
        key = match.group(1)
        if key in found:
            found[key].append(_parse_value(match.group(2)))

    for key in ALLOWED_KEYS:
        values = found[key]
        if len(values) > 1:
            raise _fail("ENV_KEY_DUPLICATED")
        if key in REQUIRED_KEYS and not values:
            raise _fail("ENV_KEY_MISSING")
        if values and not values[0]:
            raise _fail("ENV_VALUE_INVALID")

    values = {
        key: entries[0]
        for key, entries in found.items()
        if entries
    }
    parsed_url = urlparse(values["APPARETENKEI_READONLY_API_BASE_URL"])
    if (
        parsed_url.scheme not in {"http", "https"}
        or not parsed_url.hostname
        or parsed_url.username is not None
        or parsed_url.password is not None
    ):
        raise _fail("ENV_VALUE_INVALID")
    timeout = values.get("APPARETENKEI_READONLY_API_TIMEOUT_MS")
    if timeout is not None and (
        not timeout.isascii()
        or not timeout.isdecimal()
        or int(timeout) <= 0
    ):
        raise _fail("ENV_VALUE_INVALID")
    return values


def build_exec_environment(
    source_environment: Mapping[str, str],
    allowed_values: Mapping[str, str],
) -> dict[str, str]:
    result = {
        key: source_environment[key]
        for key in BASE_ENV_KEYS
        if key in source_environment
    }
    result.update(
        {
            key: allowed_values[key]
            for key in ALLOWED_KEYS
            if key in allowed_values
        },
    )
    return result


def _validate_exec_target(path: Path, error_code: str) -> None:
    try:
        metadata = path.lstat()
    except OSError:
        raise _fail(error_code)
    if stat.S_ISLNK(metadata.st_mode) or not stat.S_ISREG(metadata.st_mode):
        raise _fail(error_code)


def main() -> int:
    try:
        values = load_allowed_environment(
            ENV_FILE,
            repository=REPOSITORY,
        )
        _validate_exec_target(TSX, "MCP_EXEC_NOT_FOUND")
        if not os.access(TSX, os.X_OK):
            raise _fail("MCP_EXEC_NOT_FOUND")
        _validate_exec_target(SERVER, "MCP_SERVER_NOT_FOUND")
        environment = build_exec_environment(os.environ, values)
        os.execve(str(TSX), [str(TSX), str(SERVER)], environment)
    except LauncherError as error:
        print(str(error), file=sys.stderr)
        return 78
    except Exception:
        print("ENV_VALUE_INVALID", file=sys.stderr)
        return 78
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
