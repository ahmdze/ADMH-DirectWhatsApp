#!/usr/bin/env python3
"""Generate Android launcher / notification icons and splash screens.

The artwork comes from the web PWA sources in ``public/icons``:

* ``icon-1024.png``     -> legacy + round launcher icons (full bleed)
* ``monochrome.png``    -> adaptive-icon foreground + notification status icon
* brand colours         -> adaptive-icon background + splash screens

Generated PNG/XML files are committed under ``android/app/src/main/res``.
Only re-run this script when the brand icon changes.

Usage (from the repository root):

    python android/tools/generate-icons.py

Requires Pillow (``python -m pip install pillow``).
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
RES = ROOT / "android" / "app" / "src" / "main" / "res"
ICONS = ROOT / "public" / "icons"

BRAND_BG = (6, 17, 15)  # #06110F — Aurora Glass dark background
BRAND_GLOW = (15, 59, 50)  # soft radial glow used behind the splash logo

# density -> px for legacy launcher icons (48dp / 72dp / 96dp / 144dp / 192dp)
LEGACY_SIZES = {
    "mdpi": 48,
    "hdpi": 72,
    "xhdpi": 96,
    "xxhdpi": 144,
    "xxxhdpi": 192,
}

# density -> px for the adaptive-icon foreground layer (108dp canvas)
FOREGROUND_SIZES = {
    "mdpi": 108,
    "hdpi": 162,
    "xhdpi": 216,
    "xxhdpi": 324,
    "xxxhdpi": 432,
}

# Capacitor splash template sizes (portrait, landscape and the fallback drawable)
SPLASH_SIZES = {
    "drawable/splash.png": (480, 320),
    "drawable-port-mdpi/splash.png": (320, 480),
    "drawable-port-hdpi/splash.png": (480, 800),
    "drawable-port-xhdpi/splash.png": (720, 1280),
    "drawable-port-xxhdpi/splash.png": (960, 1600),
    "drawable-port-xxxhdpi/splash.png": (1280, 1920),
    "drawable-land-mdpi/splash.png": (480, 320),
    "drawable-land-hdpi/splash.png": (800, 480),
    "drawable-land-xhdpi/splash.png": (1280, 720),
    "drawable-land-xxhdpi/splash.png": (1600, 960),
    "drawable-land-xxxhdpi/splash.png": (1920, 1280),
}


def load_logo() -> Image.Image:
    return Image.open(ICONS / "icon-1024.png").convert("RGBA")


def load_glyph() -> Image.Image:
    """White chat-bubble glyph on a transparent background (from the PWA mask)."""
    glyph = Image.open(ICONS / "monochrome.png").convert("RGBA")
    bbox = glyph.getchannel("A").getbbox()
    if bbox:
        glyph = glyph.crop(bbox)
    white = Image.new("RGBA", glyph.size, (255, 255, 255, 0))
    white.putalpha(glyph.getchannel("A"))
    return white


def fit_glyph(glyph: Image.Image, canvas_size: int, content_ratio: float) -> Image.Image:
    """Center the glyph on a transparent square canvas."""
    target_w = max(1, round(canvas_size * content_ratio))
    target_h = max(1, round(target_w * glyph.height / glyph.width))
    scaled = glyph.resize((target_w, target_h), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    canvas.alpha_composite(scaled, ((canvas_size - target_w) // 2, (canvas_size - target_h) // 2))
    return canvas


def round_icon(logo: Image.Image, size: int) -> Image.Image:
    """Circular crop, supersampled for smooth edges."""
    high = logo.resize((size * 4, size * 4), Image.Resampling.LANCZOS)
    mask = Image.new("L", high.size, 0)
    ImageDraw.Draw(mask).ellipse((0, 0, high.width - 1, high.height - 1), fill=255)
    high.putalpha(mask)
    return high.resize((size, size), Image.Resampling.LANCZOS)


def splash_background(size: tuple[int, int]) -> Image.Image:
    width, height = size
    background = Image.new("RGB", size, BRAND_BG)
    glow = Image.new("RGB", size, BRAND_GLOW)
    mask = Image.new("L", size, 0)
    radius = int(max(width, height) * 0.62)
    cx, cy = width // 2, int(height * 0.38)
    ImageDraw.Draw(mask).ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(max(8, max(width, height) // 9)))
    return Image.composite(glow, background, mask)


def main() -> None:
    logo = load_logo()
    glyph = load_glyph()

    for density, size in LEGACY_SIZES.items():
        folder = RES / f"mipmap-{density}"
        folder.mkdir(parents=True, exist_ok=True)
        logo.resize((size, size), Image.Resampling.LANCZOS).save(folder / "ic_launcher.png", optimize=True)
        round_icon(logo, size).save(folder / "ic_launcher_round.png", optimize=True)
        # Adaptive foreground: the glyph stays inside the 66dp safe circle.
        fit_glyph(glyph, FOREGROUND_SIZES[density], 0.46).save(folder / "ic_launcher_foreground.png", optimize=True)

    # Notification status-bar icon (white silhouette, tinted by Android).
    drawable = RES / "drawable"
    drawable.mkdir(parents=True, exist_ok=True)
    fit_glyph(glyph, 96, 0.78).save(drawable / "ic_stat_reminder.png", optimize=True)

    # Adaptive-icon background colour.
    background_xml = RES / "values" / "ic_launcher_background.xml"
    background_xml.write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n'
        "<resources>\n"
        '    <color name="ic_launcher_background">#06110F</color>\n'
        "</resources>\n",
        encoding="utf-8",
    )

    # Branded splash screens: Aurora background + centered glyph.
    for relative, size in SPLASH_SIZES.items():
        target = RES / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        canvas = splash_background(size).convert("RGBA")
        target_w = max(1, round(min(size) * 0.3))
        target_h = max(1, round(target_w * glyph.height / glyph.width))
        mark = glyph.resize((target_w, target_h), Image.Resampling.LANCZOS)
        canvas.alpha_composite(mark, ((size[0] - target_w) // 2, (size[1] - target_h) // 2))
        canvas.convert("RGB").save(target, optimize=True)

    print(f"Generated launcher icons, notification icon and {len(SPLASH_SIZES)} splash screens.")


if __name__ == "__main__":
    main()
