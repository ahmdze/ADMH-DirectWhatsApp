"""Generate ADMH Direct WhatsApp v2 app icons (Aurora Glass identity).

Run: python scripts/generate-icons.py
Outputs: public/icons/*.png + monochrome.svg
"""
from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "icons"
OUT.mkdir(parents=True, exist_ok=True)

S = 1024
TOP = (14, 58, 51)
BOTTOM = (5, 16, 14)
GLOW_A = (110, 231, 183)
GLOW_B = (14, 165, 233)


def gradient(size: int) -> Image.Image:
    """Diagonal teal -> near-black gradient with two aurora glows."""
    y, x = np.mgrid[0:size, 0:size].astype(np.float32)
    t = ((x / size) * 0.45 + (y / size) * 0.55).clip(0, 1)
    out = np.zeros((size, size, 3), dtype=np.float32)
    for c in range(3):
        out[..., c] = TOP[c] + (BOTTOM[c] - TOP[c]) * t

    # Aurora blobs
    for (cx, cy, radius, color, strength) in (
        (size * 0.82, size * 0.12, size * 0.55, GLOW_A, 0.55),
        (size * 0.05, size * 0.92, size * 0.55, GLOW_B, 0.28),
    ):
        dist = np.sqrt((x - cx) ** 2 + (y - cy) ** 2) / radius
        falloff = np.clip(1 - dist, 0, 1) ** 2 * strength
        for c in range(3):
            out[..., c] = out[..., c] * (1 - falloff) + color[c] * falloff

    return Image.fromarray(out.clip(0, 255).astype(np.uint8), "RGB")


def rounded_mask(size: int, radius: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    return mask


def draw_icon(scale: float = 1.0) -> Image.Image:
    """Draw the full icon; scale shrinks the bubble for maskable safe area."""
    img = gradient(S)
    layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    cx = cy = S / 2
    # Speech bubble body
    bw, bh = 520 * scale, 330 * scale
    bx0, by0 = cx - bw / 2, cy - bh / 2 - 12 * scale
    d.rounded_rectangle((bx0, by0, bx0 + bw, by0 + bh), radius=112 * scale, fill=(255, 255, 255, 255))
    # Tail (bottom-left)
    tail = [
        (bx0 + 86 * scale, by0 + bh - 8 * scale),
        (bx0 + 42 * scale, by0 + bh + 96 * scale),
        (bx0 + 196 * scale, by0 + bh - 8 * scale),
    ]
    d.polygon(tail, fill=(255, 255, 255, 255))
    # Three dots
    dot_r = 27 * scale
    gap = 74 * scale
    dot_y = cy - 12 * scale + 6 * scale
    for i in (-1, 0, 1):
        dx = cx + i * gap
        d.ellipse((dx - dot_r, dot_y - dot_r, dx + dot_r, dot_y + dot_r), fill=(9, 78, 64, 255))

    # Subtle inner stroke around bubble
    d.rounded_rectangle(
        (bx0, by0, bx0 + bw, by0 + bh),
        radius=112 * scale,
        outline=(255, 255, 255, 90),
        width=max(2, int(4 * scale)),
    )

    # Soft white glow behind bubble
    glow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.rounded_rectangle(
        (bx0 - 40, by0 - 40, bx0 + bw + 40, by0 + bh + 120),
        radius=150 * scale,
        fill=(110, 231, 183, 70),
    )
    glow = glow.filter(ImageFilter.GaussianBlur(70))
    layer = Image.alpha_composite(glow, layer)
    img = Image.alpha_composite(img.convert("RGBA"), layer)
    return img


def save(img: Image.Image, name: str, size: int, rounding: int | None = None) -> None:
    out = img.resize((size, size), Image.LANCZOS)
    if rounding is not None:
        mask = rounded_mask(size, rounding)
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        canvas.paste(out, (0, 0), mask)
        out = canvas
    out.save(OUT / name, optimize=True)
    print(f"wrote {name} ({size}px)")


def main() -> None:
    full = draw_icon(1.0)
    save(full, "icon-512.png", 512)
    save(full, "icon-192.png", 192)
    save(full, "apple-touch-icon.png", 180)
    # Maskable: full-bleed background, content already inside the safe circle.
    save(draw_icon(0.82), "maskable-512.png", 512)
    save(draw_icon(0.82), "maskable-192.png", 192)
    # Store a 1024 master for future use
    save(full, "icon-1024.png", 1024)

    # Monochrome: white bubble silhouette on transparent
    mono = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    md = ImageDraw.Draw(mono)
    cx = cy = S / 2
    bw, bh = 560, 350
    bx0, by0 = cx - bw / 2, cy - bh / 2 - 12
    md.rounded_rectangle((bx0, by0, bx0 + bw, by0 + bh), radius=116, fill=(255, 255, 255, 255))
    md.polygon(
        [(bx0 + 90, by0 + bh - 8), (bx0 + 40, by0 + bh + 104), (bx0 + 200, by0 + bh - 8)],
        fill=(255, 255, 255, 255),
    )
    for i in (-1, 0, 1):
        dx = cx + i * 78
        md.ellipse((dx - 30, cy - 6 - 30, dx + 30, cy - 6 + 30), fill=(0, 0, 0, 0))
    mono.resize((512, 512), Image.LANCZOS).save(OUT / "monochrome.png", optimize=True)

    # Monochrome SVG (for Android 13 themed icons)
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <path fill="currentColor" d="M256 72c-101.6 0-184 76.6-184 171.1 0 53.9 27 102 69.3 133.4L122 448l76.5-40.3c18.1 4.9 37.4 7.5 57.5 7.5 101.6 0 184-76.6 184-171.1S357.6 72 256 72Zm-70 154.5a24 24 0 1 1 0 48 24 24 0 0 1 0-48Zm70 0a24 24 0 1 1 0 48 24 24 0 0 1 0-48Zm70 0a24 24 0 1 1 0 48 24 24 0 0 1 0-48Z"/>
</svg>
'''
    (OUT / "monochrome.svg").write_text(svg, encoding="utf-8")
    print("wrote monochrome.svg")


if __name__ == "__main__":
    main()
