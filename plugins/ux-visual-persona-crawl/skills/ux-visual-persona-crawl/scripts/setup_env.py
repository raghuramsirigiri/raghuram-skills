#!/usr/bin/env python3
"""Create a project-local browser environment for visual persona crawls. Stdlib only.

Everything lands in <project>/.ux-visual-crawl/ (a virtualenv with Playwright and
Pillow, plus Chromium), so nothing touches the user's global Python or their
shared Playwright browser cache.

Usage: python setup_env.py [--project DIR]
"""
import argparse
import os
import subprocess
import sys
import venv
from pathlib import Path

PACKAGES = ["playwright==1.56.0", "pillow>=10,<13"]


def venv_python(root: Path) -> Path:
    return root / "venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", default=".", help="Project root (default: cwd)")
    args = ap.parse_args()

    root = Path(args.project).resolve() / ".ux-visual-crawl"
    root.mkdir(parents=True, exist_ok=True)
    py = venv_python(root)
    if not py.exists():
        print(f"Creating virtualenv in {root / 'venv'}", flush=True)
        venv.EnvBuilder(with_pip=True, clear=False).create(root / "venv")

    env = dict(os.environ)
    env["PLAYWRIGHT_BROWSERS_PATH"] = str(root / "browsers")
    env["PIP_DISABLE_PIP_VERSION_CHECK"] = "1"

    print("Installing " + ", ".join(PACKAGES), flush=True)
    if subprocess.run([str(py), "-m", "pip", "install", "--quiet", *PACKAGES], env=env).returncode:
        print("pip install failed", file=sys.stderr)
        return 1
    print("Installing Chromium into the project", flush=True)
    if subprocess.run([str(py), "-m", "playwright", "install", "chromium"], env=env).returncode:
        print("Chromium install failed", file=sys.stderr)
        return 1

    gitignore = root / ".gitignore"
    if not gitignore.exists():
        gitignore.write_text("*\n", encoding="utf-8")
    print(f"READY python={py}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
