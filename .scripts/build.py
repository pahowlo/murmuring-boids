#!/usr/bin/env python3.13

import json
import shutil
import sys
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

ROOT_DIR = SCRIPTS_DIR.parent

from includes.utils.subprocess import run_cmd  # noqa: E402


def build() -> None:
    # Remove target directory (if it exists) for a clean build
    target_dir = ROOT_DIR / "target"
    if target_dir.exists():
        if target_dir.is_file():
            target_dir.unlink()
        else:
            shutil.rmtree(target_dir)

    process = run_cmd(f"pnpm tsc --outDir {str(target_dir / 'dist')!r}")
    if not process.successful():
        exit(1)

    with open(ROOT_DIR / "package.json", "r") as f:
        package_json = json.load(f)

    build_package_json = {
        k: package_json[k]
        for k in [
            "name",
            "version",
            "description",
            "author",
            "license",
            "main",
            "exports",
            "dependencies",
        ]
    }
    for opt_k in [
        "types",
        "packageManager",
        "repository",
        "publishConfig",
        "keywords",
    ]:
        if opt_k in package_json:
            build_package_json[opt_k] = package_json[opt_k]

    build_package_json_str = json.dumps(build_package_json, indent=2)
    build_package_json_str.replace("src/", "dist/")

    with open(target_dir / "package.json", "w") as f:
        f.write(build_package_json_str)


if __name__ == "__main__":
    build()
