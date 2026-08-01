"""Adversarial tests for the LifeOS sidecar guard.

Two halves that both matter:
  DENY — credential material, including the bypass spellings (symlink, case,
         traversal, shell indirection).
  ALLOW — the LifeOS surface the mount exists to expose. A guard that blocks
         TELOS or skills is a failed guard, not a safe one.

Run: python3 LIFEOS/HERMES/plugin/test_guard.py
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from plugin import guard  # noqa: E402

HOME = os.path.expanduser("~")

# (tool, args, should_block, label)
CASES = [
    # ── must DENY ────────────────────────────────────────────────────────────
    ("read_file", {"path": f"{HOME}/.claude/.env"}, True, "vault env file"),
    ("read_file", {"path": "~/.claude/.env"}, True, "tilde form"),
    ("read_file", {"path": f"{HOME}/.claude/.ENV"}, True, "case variant (macOS)"),
    ("read_file", {"path": f"{HOME}/.claude/LIFEOS/../.env"}, True, "traversal"),
    ("read_file", {"path": f"{HOME}/.ssh/id_rsa"}, True, "ssh private key"),
    ("read_file", {"path": f"{HOME}/.ssh"}, True, "ssh directory itself"),
    ("read_file", {"path": f"{HOME}/.aws/credentials"}, True, "aws credentials"),
    ("read_file", {"path": f"{HOME}/.codex/auth.json"}, True, "sibling agent tokens"),
    ("read_file", {"path": f"{HOME}/.hermes/auth.json"}, True, "own tokens"),
    ("read_file", {"path": f"{HOME}/.claude/settings.json"}, True, "harness config"),
    ("read_file", {"path": f"{HOME}/.claude/LIFEOS/USER/SECURITY/SecurityPosture.md"}, True, "security state"),
    ("read_file", {"path": ".env"}, True, "bare relative env"),
    ("read_file", {"path": f"{HOME}/certs/server.pem"}, True, "private key by extension"),
    ("terminal", {"command": "cat ~/.claude/.env"}, True, "shell read of env"),
    ("terminal", {"command": "cp ~/.ssh/id_rsa /tmp/x"}, True, "shell key exfil"),
    ("terminal", {"command": "grep -r TOKEN ~/.claude/.env"}, True, "shell grep of env"),
    ("write_file", {"path": f"{HOME}/.claude/.env"}, True, "write to env"),
    ("grep", {"path": f"{HOME}/.ssh"}, True, "grep over key dir"),

    ("execute_code", {"code": "print(open('/Users/x/.aws/credentials').read())"}, True, "code-exec credential read"),
    ("execute_code", {"code": "open(os.path.expanduser('~/.claude/.env')).read()"}, True, "code-exec env read"),
    ("execute_code", {"code": "print(2+2)"}, False, "benign code exec"),

    # ── must ALLOW — this is what the mount is FOR ───────────────────────────
    ("read_file", {"path": f"{HOME}/.claude/CLAUDE.md"}, False, "routing table"),
    ("read_file", {"path": f"{HOME}/.claude/LIFEOS/USER/TELOS/TELOS.md"}, False, "TELOS"),
    ("read_file", {"path": f"{HOME}/.claude/LIFEOS/USER/PROJECTS.md"}, False, "projects"),
    ("read_file", {"path": f"{HOME}/.claude/LIFEOS/USER/PRINCIPAL/PRINCIPAL_IDENTITY.md"}, False, "identity"),
    ("read_file", {"path": f"{HOME}/.claude/LIFEOS/MEMORY/KNOWLEDGE/Ideas/x.md"}, False, "knowledge archive"),
    ("read_file", {"path": f"{HOME}/.claude/skills/_COFFEE/SKILL.md"}, False, "private skill"),
    ("read_file", {"path": f"{HOME}/.claude/LIFEOS/LIFEOS_SYSTEM_PROMPT.md"}, False, "system prompt"),
    ("terminal", {"command": "bun ~/.claude/LIFEOS/TOOLS/Upgrades.ts list"}, False, "CLI-first tool call"),
    ("terminal", {"command": "ls ~/.claude/skills"}, False, "list skills"),
    ("read_file", {"path": f"{HOME}/HermesWorkspace/notes.md"}, False, "workspace file"),
]


def _fresh_policy_dir() -> Path:
    """Generate the policy from Policy.ts into a temp dir and test THAT.

    The suite used to load `policy.json` from this directory, which is a
    GENERATED artifact that Mount.ts writes to the destination install, not
    here. A copy sitting in the source tree drifts silently and the suite then
    passes against a policy nobody ships. Generating per-run means the test can
    only ever pass against the policy the current Policy.ts produces.
    """
    import subprocess
    import tempfile

    tmp = Path(tempfile.mkdtemp(prefix="lifeos-guard-test-"))
    subprocess.run(
        ["bun", str(Path(__file__).resolve().parent.parent / "Policy.ts"), str(tmp / "policy.json")],
        check=True, capture_output=True,
    )
    return tmp


def main() -> int:
    guard.load_policy(_fresh_policy_dir())
    if guard._POLICY is None:  # noqa: SLF001 — test asserts the load worked
        print("FATAL: policy failed to load")
        return 2

    failures = []
    for tool, args, should_block, label in CASES:
        verdict = guard.evaluate(tool, args)
        blocked = verdict is not None
        ok = blocked == should_block
        mark = "ok  " if ok else "FAIL"
        want = "DENY " if should_block else "ALLOW"
        got = "DENY " if blocked else "ALLOW"
        print(f"  {mark} want={want} got={got}  {label}")
        if not ok:
            failures.append(label)

    print()
    if failures:
        print(f"✗ {len(failures)}/{len(CASES)} failed: {', '.join(failures)}")
        return 1
    print(f"✓ all {len(CASES)} cases pass ({sum(1 for c in CASES if c[2])} deny, "
          f"{sum(1 for c in CASES if not c[2])} allow)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
