#!/usr/bin/env python3
"""Assemble a Flatpak bundle from a prebuilt electron-builder linux-unpacked tree."""

from __future__ import annotations

import argparse
import re
import shutil
import sys
from datetime import date
from pathlib import Path

from _flatpak_env import ensure_flathub_remote, repo_root, run_command


DEFAULT_MANIFEST = "flatpak/com.nexusmods.vortex.prebuilt.yaml"
DEFAULT_BUILD_DIR = "flatpak/.flatpak-build-prebuilt"
DEFAULT_REPO_DIR = "flatpak/.flatpak-repo-prebuilt"
DEFAULT_STATE_DIR = "flatpak/.flatpak-builder-prebuilt"
DEFAULT_PREBUILT = "flatpak/prebuilt/linux-unpacked"
DEFAULT_OUTPUT = "dist/vortex.flatpak"
APP_ID = "com.nexusmods.vortex"
METAINFO = "flatpak/com.nexusmods.vortex.metainfo.xml"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build a Flatpak bundle from a prebuilt linux-unpacked directory."
    )
    parser.add_argument(
        "--prebuilt",
        type=Path,
        default=Path(DEFAULT_PREBUILT),
        help="Path to electron-builder linux-unpacked directory",
    )
    parser.add_argument(
        "--version",
        type=str,
        default="",
        help="Optional version to stamp into metainfo before building",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(DEFAULT_OUTPUT),
        help="Output .flatpak bundle path",
    )
    parser.add_argument(
        "--manifest",
        type=Path,
        default=Path(DEFAULT_MANIFEST),
        help="Flatpak manifest path",
    )
    parser.add_argument(
        "--keep-workdir",
        action="store_true",
        help="Keep flatpak-builder work directories after success",
    )
    return parser.parse_args()


def resolve_path(path: Path, root: Path) -> Path:
    return path if path.is_absolute() else root / path


def stamp_metainfo_version(metainfo: Path, version: str) -> None:
    content = metainfo.read_text(encoding="utf-8")
    today = date.today().isoformat()
    pattern = r'(<release\s+version=")([^"]+)("\s+date=")([^"]+)(")'
    if not re.search(pattern, content):
        print(f"Warning: no release tag found in {metainfo}, skipping version stamp")
        return
    updated = re.sub(pattern, rf"\g<1>{version}\g<3>{today}\g<5>", content, count=1)
    metainfo.write_text(updated, encoding="utf-8")
    print(f"Stamped metainfo version {version} ({today})")


def stage_prebuilt(prebuilt: Path, staged: Path) -> None:
    if not prebuilt.is_dir():
        print(f"Prebuilt directory not found: {prebuilt}", file=sys.stderr)
        sys.exit(1)

    binary = prebuilt / "vortex"
    if not binary.exists():
        print(f"Expected Vortex binary missing: {binary}", file=sys.stderr)
        print("Contents:", file=sys.stderr)
        for child in sorted(prebuilt.iterdir()):
            print(f"  {child.name}", file=sys.stderr)
        sys.exit(1)

    prebuilt_resolved = prebuilt.resolve()
    staged_resolved = staged.resolve()
    if prebuilt_resolved == staged_resolved:
        print(f"Prebuilt already staged at {staged}")
        return

    if staged.exists():
        shutil.rmtree(staged)
    staged.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(prebuilt, staged, symlinks=True)
    print(f"Staged prebuilt tree at {staged}")


def main() -> None:
    args = parse_args()
    root = repo_root()

    prebuilt = resolve_path(args.prebuilt, root)
    staged = root / "flatpak" / "prebuilt" / "linux-unpacked"
    manifest = resolve_path(args.manifest, root)
    output = resolve_path(args.output, root)
    build_dir = root / DEFAULT_BUILD_DIR
    repo_dir = root / DEFAULT_REPO_DIR
    state_dir = root / DEFAULT_STATE_DIR
    metainfo = root / METAINFO

    if not manifest.is_file():
        print(f"Manifest not found: {manifest}", file=sys.stderr)
        sys.exit(1)

    if args.version:
        stamp_metainfo_version(metainfo, args.version)

    stage_prebuilt(prebuilt, staged)
    ensure_flathub_remote()

    for path in (build_dir, repo_dir, state_dir):
        if path.exists():
            shutil.rmtree(path)

    output.parent.mkdir(parents=True, exist_ok=True)

    run_command(
        [
            "flatpak-builder",
            "--user",
            "--install-deps-from=flathub",
            "--force-clean",
            "--repo",
            str(repo_dir),
            "--state-dir",
            str(state_dir),
            str(build_dir),
            str(manifest),
        ],
        cwd=root,
    )

    run_command(
        [
            "flatpak",
            "build-bundle",
            str(repo_dir),
            str(output),
            APP_ID,
        ],
        cwd=root,
    )

    print(f"Wrote Flatpak bundle: {output}")

    if not args.keep_workdir:
        for path in (build_dir, repo_dir, state_dir):
            if path.exists():
                shutil.rmtree(path)


if __name__ == "__main__":
    main()
