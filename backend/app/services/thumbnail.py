from pathlib import Path
from PIL import Image

from ..config import settings
from ..utils.image_utils import correct_orientation


def generate_thumbnails(file_path: str, photo_id: int, orientation: int = 1) -> str:
    """Generate thumbnail for a photo. Returns the relative path under thumbnail_dir."""
    bucket = str(photo_id % 1000)
    bucket_dir = settings.thumbnail_dir / bucket
    bucket_dir.mkdir(parents=True, exist_ok=True)

    rel_path = f"{bucket}/{photo_id}_sm.jpg"
    out_path = settings.thumbnail_dir / rel_path

    try:
        with Image.open(file_path) as img:
            img = img.convert("RGB")
            img = correct_orientation(img, orientation)
            img.thumbnail(
                (settings.thumbnail_small_size, settings.thumbnail_small_size),
                Image.LANCZOS,
            )
            img.save(str(out_path), "JPEG", quality=80)
    except Exception as e:
        raise RuntimeError(f"Failed to generate thumbnail for {file_path}: {e}")

    return rel_path
