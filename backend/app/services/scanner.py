import hashlib
import os
from datetime import datetime, timezone
from pathlib import Path

from ..config import settings
from ..utils.image_utils import get_mime_type


def compute_file_hash(file_path: str) -> str:
    """Fast hash: SHA-256 of first 64KB concatenated with file size."""
    h = hashlib.sha256()
    size = os.path.getsize(file_path)
    h.update(str(size).encode())
    with open(file_path, "rb") as f:
        h.update(f.read(65536))
    return h.hexdigest()


def scan_directory(directory: str, recursive: bool = True) -> list[dict]:
    """Walk a directory and return metadata for supported image files."""
    found = []
    extensions = set(settings.scan_extensions)
    root = Path(directory)

    if recursive:
        iterator = root.rglob("*")
    else:
        iterator = root.glob("*")

    for path in iterator:
        if not path.is_file():
            continue
        if path.suffix.lower() not in extensions:
            continue

        try:
            stat = path.stat()
            file_hash = compute_file_hash(str(path))
            mime_type = get_mime_type(str(path))
            date_file = datetime.fromtimestamp(
                stat.st_mtime, tz=timezone.utc
            ).isoformat()

            found.append({
                "file_path": str(path.resolve()),
                "filename": path.name,
                "file_size": stat.st_size,
                "file_hash": file_hash,
                "mime_type": mime_type,
                "date_file": date_file,
            })
        except (OSError, PermissionError):
            continue

    return found
