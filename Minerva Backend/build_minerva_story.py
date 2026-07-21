#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import math
import shutil
import subprocess
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image


TILE_SIZE = 1024


def extract_svs_overview(path: Path) -> tuple[Image.Image, Path] | None:
    tiffcp = shutil.which("tiffcp") or ("/opt/homebrew/bin/tiffcp" if Path("/opt/homebrew/bin/tiffcp").exists() else "")
    if not tiffcp:
        return None
    tmpdir = Path(tempfile.mkdtemp(prefix="labcas-minerva-svs-"))
    output = tmpdir / f"{path.stem[:80]}-overview.tif"
    try:
        subprocess.run([tiffcp, f"{path},1", str(output)], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        image = Image.open(output)
        image.load()
        return image, tmpdir
    except Exception:
        shutil.rmtree(tmpdir, ignore_errors=True)
        return None


def open_source(path: Path, max_side: int, frame: int | None) -> tuple[Image.Image, Path | None]:
    try:
        image = Image.open(path)
        if frame is not None:
            image.seek(frame)
        image.load()
        return image, None
    except Exception:
        pass

    if path.suffix.lower() == ".svs":
        overview = extract_svs_overview(path)
        if overview:
            return overview

    sips = shutil.which("sips")
    if not sips:
        raise RuntimeError(f"Cannot open {path}")
    tmpdir = Path(tempfile.mkdtemp(prefix="labcas-minerva-"))
    output = tmpdir / f"{path.stem[:80]}.tif"
    subprocess.run([sips, "-Z", str(max_side), str(path), "--out", str(output)], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    image = Image.open(output)
    image.load()
    return image, tmpdir


def to_rgb(image: Image.Image) -> Image.Image:
    if image.mode == "RGB":
        return image
    if image.mode == "RGBA":
        background = Image.new("RGB", image.size, "white")
        background.paste(image, mask=image.getchannel("A"))
        return background
    if image.mode in {"I;16", "I", "F"}:
        data = np.asarray(image)
        lo, hi = np.percentile(data, [1, 99])
        if hi <= lo:
            lo = float(data.min())
            hi = float(data.max() or 1)
        scaled = np.clip((data.astype("float32") - lo) * 255.0 / (hi - lo), 0, 255).astype("uint8")
        return Image.fromarray(scaled, "L").convert("RGB")
    return image.convert("RGB")


def constrain(image: Image.Image, max_side: int) -> Image.Image:
    if max(image.size) <= max_side:
        return image
    scale = max_side / float(max(image.size))
    size = (max(1, round(image.width * scale)), max(1, round(image.height * scale)))
    return image.resize(size, Image.Resampling.LANCZOS)


def parse_crop(value: str | None) -> tuple[int, int, int, int] | None:
    if not value:
        return None
    left, top, right, bottom = [int(part.strip()) for part in value.split(",")]
    if right <= left or bottom <= top:
        raise ValueError("Invalid crop box")
    return left, top, right, bottom


def max_level(width: int, height: int, tile_size: int) -> int:
    largest = max(width, height)
    return max(0, math.ceil(math.log(largest / tile_size, 2))) if largest > tile_size else 0


def write_tiles(image: Image.Image, output: Path, levels: int, tile_size: int) -> int:
    output.mkdir(parents=True, exist_ok=True)
    count = 0
    for level in range(levels + 1):
        scale = 1 / (2**level)
        size = (max(1, round(image.width * scale)), max(1, round(image.height * scale)))
        level_image = image if level == 0 else image.resize(size, Image.Resampling.LANCZOS)
        for x in range(math.ceil(level_image.width / tile_size)):
            for y in range(math.ceil(level_image.height / tile_size)):
                tile = level_image.crop((x * tile_size, y * tile_size, min((x + 1) * tile_size, level_image.width), min((y + 1) * tile_size, level_image.height)))
                tile.save(output / f"{level}_{x}_{y}.jpg", format="JPEG", quality=86)
                count += 1
    return count


def write_exhibit(image: Image.Image, output: Path, slug: str, label: str, format_label: str, levels: int, public_root: str) -> None:
    image_path = f"{public_root.rstrip('/')}/{slug}/images/{slug}"
    exhibit = {
        "Images": [
            {
                "Name": "i0",
                "Description": f"{label} converted to a static Minerva JPEG pyramid.",
                "Path": image_path,
                "Width": image.width,
                "Height": image.height,
                "MaxLevel": levels,
                "TileSize": [TILE_SIZE, TILE_SIZE],
            }
        ],
        "Header": label,
        "Rotation": 0,
        "Layout": {"Grid": [["i0"]]},
        "Stories": [
            {
                "Name": label,
                "Description": "",
                "Waypoints": [
                    {
                        "Name": "Overview",
                        "Description": f"---\n# {label}\n{format_label} test image.",
                        "Arrows": [],
                        "Overlays": [],
                        "Group": "H&E",
                        "Masks": [],
                        "ActiveMasks": [],
                        "Zoom": 1,
                        "Pan": [0.5, 0.5],
                    }
                ],
            }
        ],
        "Channels": [{"Rendered": True, "Name": "H&E", "Path": "he", "Format": "jpg"}],
        "Masks": [],
        "Groups": [{"Name": "H&E", "Colors": ["ffffff"], "Channels": ["H&E"], "Descriptions": [format_label]}],
    }
    (output / "exhibit.json").write_text(json.dumps(exhibit, indent=2) + "\n")
    thumbnail = image.copy()
    thumbnail.thumbnail((1200, 1200), Image.Resampling.LANCZOS)
    thumbnail.save(output / "thumbnail.jpg", format="JPEG", quality=86)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("slug")
    parser.add_argument("label")
    parser.add_argument("format_label")
    parser.add_argument("--max-side", type=int, default=8192)
    parser.add_argument("--frame", type=int, default=None)
    parser.add_argument("--crop", default=None)
    parser.add_argument("--output-root", type=Path, default=Path("minerva/stories"))
    parser.add_argument("--public-story-root", default="/labcas-ui/minerva/stories")
    args = parser.parse_args()

    output = args.output_root / args.slug
    image_dir = output / "images" / args.slug / "he"
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True, exist_ok=True)

    tmpdir = None
    try:
        image, tmpdir = open_source(args.source, args.max_side, args.frame)
        crop = parse_crop(args.crop)
        if crop:
            image = image.crop(crop)
        image = constrain(to_rgb(image), args.max_side)
        levels = max_level(image.width, image.height, TILE_SIZE)
        tile_count = write_tiles(image, image_dir, levels, TILE_SIZE)
        write_exhibit(image, output, args.slug, args.label, args.format_label, levels, args.public_story_root)
        print(json.dumps({"slug": args.slug, "size": image.size, "maxLevel": levels, "tileCount": tile_count}))
    finally:
        if tmpdir:
            shutil.rmtree(tmpdir, ignore_errors=True)


if __name__ == "__main__":
    main()
