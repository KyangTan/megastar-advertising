#!/usr/bin/env python3
"""
Image processing pipeline for Megastar Advertising website.
Reads all photos from raw/materials/, generates optimized web versions
(full + thumb, JPEG + WebP), and outputs a portfolio.json manifest.
"""
import json, os, hashlib, subprocess
from pathlib import Path
from PIL import Image, ImageOps
try:
    LANCZOS = Image.Resampling.LANCZOS
except AttributeError:
    LANCZOS = Image.LANCZOS  # type: ignore

SOURCE = Path("/Users/kyang/Documents/Kwan Yang/notto/tech/Projects/megastar_advertising/raw/materials")
OUTPUT = Path("/Users/kyang/Documents/Kwan Yang/notto/tech/Projects/megastar_advertising/site/assets/img")
MANIFEST_PATH = Path("/Users/kyang/Documents/Kwan Yang/notto/tech/Projects/megastar_advertising/site/assets/data/portfolio.json")

# Category display names and web-safe slugs
CATEGORY_MAP = {
    "3D SIGNAGE":          {"slug": "3d-signage",       "label": "3D Signage"},
    "3D LED SIGNAGE":      {"slug": "3d-led",           "label": "3D LED Signage"},
    "BILLBOARD":           {"slug": "billboard",        "label": "Billboards"},
    "STREAMER@BANNER":     {"slug": "banner",           "label": "Banners & Streamers"},
    "METALBOARD":          {"slug": "metalboard",       "label": "Metal Boards"},
    "LIGHTBOARD@LIGHTBOX": {"slug": "lightbox",         "label": "Lightboxes"},
    "WALLPAPER":           {"slug": "wallpaper",        "label": "Wall Murals"},
    "VEHICLE STICKER":     {"slug": "vehicle",          "label": "Vehicle Wraps"},
    "SANDBLAST STICKER":   {"slug": "sandblast",        "label": "Sandblast & Glass Film"},
    "DIRECTION SIGN":      {"slug": "directional",      "label": "Directional Signs"},
    "PROJECT SIGN":        {"slug": "project",          "label": "Project Signs"},
    "CANOPY":              {"slug": "canopy",           "label": "Canopies"},
    "WOODBLINDS":          {"slug": "woodblinds",       "label": "Wood Blinds"},
    "INKJET STICKER":      {"slug": "inkjet",           "label": "Inkjet Stickers"},
    "OTHERS":              {"slug": "others",           "label": "Other Work"},
}

FULL_MAX = 1280   # max dimension for full images
THUMB_MAX = 480    # max dimension for thumbnails
JPEG_Q = 82
THUMB_Q = 76

def sanitize_filename(name):
    """Create a clean web-safe filename from source."""
    stem = Path(name).stem
    # Replace spaces, special chars
    import re
    slug = re.sub(r'[^a-zA-Z0-9_\-\.\u4e00-\u9fff]', '_', stem)
    slug = re.sub(r'_+', '_', slug).strip('_').lower()
    return slug

def hash_filename(filepath, category_slug):
    """Generate short hash-based filename for UUID-named files."""
    h = hashlib.md5(str(filepath).encode()).hexdigest()[:10]
    return f"{category_slug}_{h}"

def get_display_name(filepath):
    """Extract a human-readable name from named files, or None."""
    stem = Path(filepath).stem
    # If it's a UUID (contains dashes and hex), return None
    import re
    if re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}', stem, re.I):
        return None
    if stem.startswith('IMG_') or stem.startswith('WhatsApp'):
        return None
    # Clean up common patterns
    name = stem.replace('@', '').replace('_', ' ').strip()
    # Remove duplicate spaces
    name = re.sub(r'\s+', ' ', name)
    return name if name else None

def process_image(src_path, out_name, category_slug, cat_label, display_name):
    """Generate full + thumb versions in JPEG and WebP."""
    results = {}
    
    try:
        with Image.open(src_path) as img:
            img = ImageOps.exif_transpose(img)  # Fix orientation
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            w, h = img.size
            
            # Full size
            full_dir = OUTPUT / "full"
            full_jpeg = full_dir / f"{out_name}.jpg"
            full_webp = full_dir / f"{out_name}.webp"
            
            if max(w, h) > FULL_MAX:
                ratio = FULL_MAX / max(w, h)
                full_img = img.resize((int(w * ratio), int(h * ratio)), LANCZOS)
            else:
                full_img = img.copy()
            
            full_img.save(full_jpeg, "JPEG", quality=JPEG_Q, optimize=True, progressive=True)
            results['full_jpeg'] = str(full_jpeg.relative_to(OUTPUT.parent.parent))
            results['full_w'] = full_img.size[0]
            results['full_h'] = full_img.size[1]
            
            # Full WebP
            try:
                subprocess.run(
                    ["cwebp", "-q", str(JPEG_Q), "-quiet", str(full_jpeg), "-o", str(full_webp)],
                    timeout=30, capture_output=True
                )
                if full_webp.exists():
                    results['full_webp'] = str(full_webp.relative_to(OUTPUT.parent.parent))
            except Exception:
                pass
            
            # Thumbnail
            thumb_dir = OUTPUT / "thumb"
            thumb_jpeg = thumb_dir / f"{out_name}.jpg"
            thumb_webp = thumb_dir / f"{out_name}.webp"
            
            # Smart crop to 4:3 for uniform grid
            target_ratio = 4 / 3
            current_ratio = w / h
            
            if current_ratio > target_ratio:
                # Too wide, crop sides
                new_w = int(h * target_ratio)
                left = (w - new_w) // 2
                crop_box = (left, 0, left + new_w, h)
            else:
                # Too tall, crop top/bottom
                new_h = int(w / target_ratio)
                top = (h - new_h) // 2
                crop_box = (0, top, w, top + new_h)
            
            thumb_img = img.crop(crop_box)
            thumb_ratio = THUMB_MAX / max(thumb_img.size)
            if thumb_ratio < 1:
                tw, th = thumb_img.size
                thumb_img = thumb_img.resize((int(tw * thumb_ratio), int(th * thumb_ratio)), LANCZOS)
            
            thumb_img.save(thumb_jpeg, "JPEG", quality=THUMB_Q, optimize=True, progressive=True)
            results['thumb_jpeg'] = str(thumb_jpeg.relative_to(OUTPUT.parent.parent))
            results['thumb_w'] = thumb_img.size[0]
            results['thumb_h'] = thumb_img.size[1]
            
            # Thumb WebP
            try:
                subprocess.run(
                    ["cwebp", "-q", str(THUMB_Q), "-quiet", str(thumb_jpeg), "-o", str(thumb_webp)],
                    timeout=20, capture_output=True
                )
                if thumb_webp.exists():
                    results['thumb_webp'] = str(thumb_webp.relative_to(OUTPUT.parent.parent))
            except Exception:
                pass
            
            results['orientation'] = 'portrait' if h > w else ('landscape' if w > h else 'square')
            results['orig_w'] = w
            results['orig_h'] = h
            
    except Exception as e:
        print(f"  ERROR: {src_path}: {e}")
        return None
    
    return results

def main():
    manifest = []
    stats = {'total': 0, 'processed': 0, 'errors': 0}
    
    for cat_name, cat_info in sorted(CATEGORY_MAP.items()):
        cat_dir = SOURCE / cat_name
        if not cat_dir.exists():
            continue
        
        files = sorted([
            f for f in cat_dir.iterdir()
            if f.suffix.lower() in ('.jpg', '.jpeg', '.png') and not f.name.startswith('.')
        ])
        
        if not files:
            continue
        
        print(f"\n{'='*60}")
        print(f"Category: {cat_info['label']} ({len(files)} files)")
        print(f"{'='*60}")
        
        for i, filepath in enumerate(files):
            stats['total'] += 1
            
            # Determine output name
            display_name = get_display_name(filepath)
            if display_name:
                out_name = sanitize_filename(filepath.name)
            else:
                out_name = hash_filename(filepath, cat_info['slug'])
            
            # Avoid name collisions
            out_name = f"{cat_info['slug']}-{out_name}" if not out_name.startswith(cat_info['slug']) else out_name
            
            result = process_image(filepath, out_name, cat_info['slug'], cat_info['label'], display_name)
            
            if result:
                stats['processed'] += 1
                entry = {
                    'id': out_name,
                    'category': cat_info['slug'],
                    'category_label': cat_info['label'],
                    'title': display_name or cat_info['label'],
                    'full': result.get('full_jpeg', ''),
                    'full_webp': result.get('full_webp', ''),
                    'thumb': result.get('thumb_jpeg', ''),
                    'thumb_webp': result.get('thumb_webp', ''),
                    'width': result.get('full_w', 0),
                    'height': result.get('full_h', 0),
                    'orientation': result.get('orientation', 'landscape'),
                    'orig_w': result.get('orig_w', 0),
                    'orig_h': result.get('orig_h', 0),
                }
                manifest.append(entry)
                
                if (i + 1) % 20 == 0 or i == len(files) - 1:
                    print(f"  [{i+1}/{len(files)}] {out_name} — {result.get('full_w','?')}x{result.get('full_h','?')}")
            else:
                stats['errors'] += 1
    
    # Write manifest
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(MANIFEST_PATH, 'w', encoding='utf-8') as f:
        json.dump({
            'categories': CATEGORY_MAP,
            'items': manifest,
            'stats': stats,
        }, f, indent=2, ensure_ascii=False)
    
    print(f"\n{'='*60}")
    print(f"DONE: {stats['processed']}/{stats['total']} processed, {stats['errors']} errors")
    print(f"Manifest: {MANIFEST_PATH}")
    print(f"{'='*60}")
    
    # Output disk usage
    import subprocess as sp
    du = sp.run(['du', '-sh', str(OUTPUT / 'full'), str(OUTPUT / 'thumb')], capture_output=True, text=True)
    print(du.stdout)

if __name__ == '__main__':
    main()
