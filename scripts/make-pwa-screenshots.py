"""Generate PWA manifest screenshots from the existing dark screenshots."""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "screenshots"
OUT.mkdir(parents=True, exist_ok=True)

compose = Image.open(ROOT / "docs/screenshots/compose-dark.png").convert("RGB")
targets = Image.open(ROOT / "docs/screenshots/targets-dark.png").convert("RGB")

# Narrow screenshot: exactly 390x844 for the manifest.
compose.resize((390, 844), Image.LANCZOS).save(OUT / "home-narrow.png", optimize=True)

# Wide promotional screenshot: aurora background + two phone frames.
W, H = 1280, 720
y, x = np.mgrid[0:H, 0:W].astype(np.float32)
t = ((x / W) * 0.5 + (y / H) * 0.5).clip(0, 1)
top = np.array([12, 48, 42], dtype=np.float32)
bottom = np.array([4, 14, 12], dtype=np.float32)
bg = np.zeros((H, W, 3), dtype=np.float32)
for c in range(3):
    bg[..., c] = top[c] + (bottom[c] - top[c]) * t
for (cx, cy, radius, color, strength) in (
    (0.85 * W, 0.05 * H, 0.7 * W, (110, 231, 183), 0.55),
    (0.05 * W, 0.95 * H, 0.7 * W, (14, 165, 233), 0.30),
):
    dist = np.sqrt((x - cx) ** 2 + (y - cy) ** 2) / radius
    fall = np.clip(1 - dist, 0, 1) ** 2 * strength
    for c in range(3):
        bg[..., c] = bg[..., c] * (1 - fall) + color[c] * fall
canvas = Image.fromarray(bg.clip(0, 255).astype(np.uint8), "RGB")


def paste_phone(base: Image.Image, img: Image.Image, cx: float, cy: float, height: int = 600) -> None:
    width = int(height * img.width / img.height)
    ph = img.resize((width, height), Image.LANCZOS)
    x = int(cx - ph.width / 2)
    y = int(cy - ph.height / 2)
    shadow = Image.new("RGBA", (ph.width + 60, ph.height + 60), (0, 0, 0, 0))
    draw = ImageDraw.Draw(shadow)
    draw.rounded_rectangle(
        (30, 34, 30 + ph.width, 30 + ph.height), radius=40, fill=(0, 0, 0, 140)
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    base.paste(shadow, (x - 30, y - 30), shadow)
    mask = Image.new("L", ph.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, ph.width - 1, ph.height - 1), radius=26, fill=255
    )
    base.paste(ph, (x, y), mask)


paste_phone(canvas, compose, 470, 360)
paste_phone(canvas, targets, 830, 380)
canvas.save(OUT / "home-wide.png", optimize=True)
print("created", (OUT / "home-narrow.png").stat().st_size, (OUT / "home-wide.png").stat().st_size)
