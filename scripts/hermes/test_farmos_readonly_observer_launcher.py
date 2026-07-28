from __future__ import annotations

import importlib.util
import os
import stat
import tempfile
import unittest
from pathlib import Path

LAUNCHER_PATH = (
    Path(__file__).parent
    / "mcp/farmos_readonly_observer/launcher.py"
)
SPEC = importlib.util.spec_from_file_location(
    "farmos_readonly_observer_launcher",
    LAUNCHER_PATH,
)
assert SPEC is not None and SPEC.loader is not None
launcher = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(launcher)


class LauncherContractTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.env_file = self.root / ".env.local"

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def write_env(self, text: str, mode: int = 0o600) -> None:
        self.env_file.write_text(text, encoding="utf-8")
        self.env_file.chmod(mode)

    def load(self) -> dict[str, str]:
        return launcher.load_allowed_environment(
            self.env_file,
            expected_uid=os.getuid(),
            require_git_untracked=False,
        )

    def assert_code(self, code: str) -> None:
        with self.assertRaises(launcher.LauncherError) as raised:
            self.load()
        self.assertEqual(str(raised.exception), code)
        self.assertNotIn("fixture-token", str(raised.exception))

    def test_loads_only_allowlisted_values(self) -> None:
        self.write_env(
            "APPARETENKEI_READONLY_API_BASE_URL=https://farm.invalid\n"
            "FARMOS_CORE_READONLY_TOKEN=fixture-token\n"
            "APPARETENKEI_READONLY_API_TIMEOUT_MS=5000\n"
            "UNRELATED_SECRET=must-not-pass\n",
        )
        values = self.load()
        self.assertEqual(set(values), set(launcher.ALLOWED_KEYS))
        environment = launcher.build_exec_environment(
            {
                "HOME": "/fixture-home",
                "PATH": "/fixture-path",
                "UNRELATED_SECRET": "must-not-pass",
            },
            values,
        )
        self.assertEqual(
            set(environment),
            {"HOME", "PATH", *launcher.ALLOWED_KEYS},
        )
        self.assertNotIn("UNRELATED_SECRET", environment)

    def test_missing_key_rejected(self) -> None:
        self.write_env(
            "APPARETENKEI_READONLY_API_BASE_URL=https://farm.invalid\n",
        )
        self.assert_code("ENV_KEY_MISSING")

    def test_duplicate_key_rejected(self) -> None:
        self.write_env(
            "APPARETENKEI_READONLY_API_BASE_URL=https://farm.invalid\n"
            "FARMOS_CORE_READONLY_TOKEN=fixture-token\n"
            "FARMOS_CORE_READONLY_TOKEN=second-fixture-token\n",
        )
        self.assert_code("ENV_KEY_DUPLICATED")

    def test_empty_token_rejected(self) -> None:
        self.write_env(
            "APPARETENKEI_READONLY_API_BASE_URL=https://farm.invalid\n"
            "FARMOS_CORE_READONLY_TOKEN=\n",
        )
        self.assert_code("ENV_VALUE_INVALID")

    def test_invalid_url_rejected(self) -> None:
        self.write_env(
            "APPARETENKEI_READONLY_API_BASE_URL=file:///fixture\n"
            "FARMOS_CORE_READONLY_TOKEN=fixture-token\n",
        )
        self.assert_code("ENV_VALUE_INVALID")

    def test_invalid_timeout_rejected(self) -> None:
        self.write_env(
            "APPARETENKEI_READONLY_API_BASE_URL=https://farm.invalid\n"
            "FARMOS_CORE_READONLY_TOKEN=fixture-token\n"
            "APPARETENKEI_READONLY_API_TIMEOUT_MS=5s\n",
        )
        self.assert_code("ENV_VALUE_INVALID")

    def test_symlink_rejected(self) -> None:
        target = self.root / "target.env"
        target.write_text(
            "APPARETENKEI_READONLY_API_BASE_URL=https://farm.invalid\n"
            "FARMOS_CORE_READONLY_TOKEN=fixture-token\n",
            encoding="utf-8",
        )
        target.chmod(0o600)
        self.env_file.symlink_to(target)
        self.assert_code("ENV_FILE_UNSAFE")

    def test_unsafe_permission_rejected(self) -> None:
        self.write_env(
            "APPARETENKEI_READONLY_API_BASE_URL=https://farm.invalid\n"
            "FARMOS_CORE_READONLY_TOKEN=fixture-token\n",
            mode=0o644,
        )
        self.assert_code("ENV_FILE_UNSAFE")

    def test_wrong_owner_rejected(self) -> None:
        self.write_env(
            "APPARETENKEI_READONLY_API_BASE_URL=https://farm.invalid\n"
            "FARMOS_CORE_READONLY_TOKEN=fixture-token\n",
        )
        with self.assertRaises(launcher.LauncherError) as raised:
            launcher.load_allowed_environment(
                self.env_file,
                expected_uid=os.getuid() + 1,
                require_git_untracked=False,
            )
        self.assertEqual(str(raised.exception), "ENV_FILE_UNSAFE")


if __name__ == "__main__":
    unittest.main()
