import mimetypes
from PIL import Image


ORIENTATION_TRANSFORMS = {
    2: (Image.FLIP_LEFT_RIGHT,),
    3: (Image.ROTATE_180,),
    4: (Image.FLIP_TOP_BOTTOM,),
    5: (Image.FLIP_LEFT_RIGHT, Image.ROTATE_90),
    6: (Image.ROTATE_270,),
    7: (Image.FLIP_LEFT_RIGHT, Image.ROTATE_270),
    8: (Image.ROTATE_90,),
}


def correct_orientation(img: Image.Image, orientation: int) -> Image.Image:
    """Apply EXIF orientation correction."""
    if orientation in ORIENTATION_TRANSFORMS:
        for op in ORIENTATION_TRANSFORMS[orientation]:
            img = img.transpose(op)
    return img


def get_mime_type(file_path: str) -> str:
    """Guess MIME type from file extension."""
    mime, _ = mimetypes.guess_type(file_path)
    return mime or "application/octet-stream"
