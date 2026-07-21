#!/usr/bin/env python3

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path


EXTENSIONS = (".svs", ".scn", ".tif", ".tiff", ".qptif", ".qptiff")


def format_label(path: Path) -> str:
    name = path.name.lower()
    if name.endswith((".ome.tif", ".ome.tiff")):
        return "OME-TIFF"
    if name.endswith((".qptif", ".qptiff")):
        return "QPTIFF"
    if path.suffix.lower() == ".svs":
        return "SVS"
    if path.suffix.lower() == ".scn":
        return "SCN"
    if path.suffix.lower() in {".tif", ".tiff"}:
        return "TIFF"
    return "Image"


def sources(paths: list[Path]) -> list[Path]:
    items: list[Path] = []
    for path in paths:
        if path.is_dir():
            items.extend(child for child in sorted(path.rglob("*")) if child.is_file() and child.name.lower().endswith(EXTENSIONS))
        elif path.is_file():
            items.append(path)
    return items


def slug(path: Path) -> str:
    name = path.name
    lower = name.lower()
    for suffix in (".ome.tiff", ".ome.tif", ".qptiff", ".qptif", ".tiff", ".tif", ".svs", ".scn"):
        if lower.endswith(suffix):
            name = name[: -len(suffix)]
            break
    clean = re.sub(r"[^A-Za-z0-9]+", "-", name).strip("-").lower() or "slide"
    digest = hashlib.sha1(str(path.resolve()).encode("utf-8")).hexdigest()[:10]
    return f"{clean}-{digest}"


def build(builder: Path, path: Path, output_root: Path, public_root: str, max_side: int, dry_run: bool) -> dict[str, object]:
    item_slug = slug(path)
    exhibit = f"{public_root.rstrip('/')}/{item_slug}/exhibit.json"
    record: dict[str, object] = {
        "source": str(path),
        "slug": item_slug,
        "label": path.name,
        "format": format_label(path),
        "exhibit": exhibit,
        "status": "planned" if dry_run else "pending",
    }
    command = [
        sys.executable,
        str(builder),
        str(path),
        item_slug,
        path.name,
        record["format"],
        "--max-side",
        str(max_side),
        "--output-root",
        str(output_root),
        "--public-story-root",
        public_root,
    ]
    record["command"] = command
    if dry_run:
        return record
    try:
        completed = subprocess.run(command, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        for line in reversed(completed.stdout.splitlines()):
            try:
                record.update(json.loads(line))
                break
            except json.JSONDecodeError:
                pass
        record["status"] = "ready"
    except subprocess.CalledProcessError as exc:
        record["status"] = "failed"
        record["error"] = (exc.stderr or exc.stdout or str(exc)).strip()
    return record


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("sources", nargs="+", type=Path)
    parser.add_argument("--output-root", type=Path, default=Path("minerva/stories"))
    parser.add_argument("--public-story-root", default="/labcas-ui/minerva/stories")
    parser.add_argument("--manifest", type=Path, default=Path("minerva/manifest.json"))
    parser.add_argument("--max-side", type=int, default=8192)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    builder = Path(__file__).resolve().with_name("build_minerva_story.py")
    records = [build(builder, path, args.output_root, args.public_story_root, args.max_side, args.dry_run) for path in sources(args.sources)]
    args.manifest.parent.mkdir(parents=True, exist_ok=True)
    args.manifest.write_text(json.dumps({"count": len(records), "stories": records}, indent=2) + "\n")
    for record in records:
        print(json.dumps({key: record[key] for key in ("source", "slug", "format", "status")}))
    return 1 if any(record.get("status") == "failed" for record in records) else 0


if __name__ == "__main__":
    raise SystemExit(main())
