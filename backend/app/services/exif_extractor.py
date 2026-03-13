from PIL import Image
from PIL.ExifTags import Base as ExifBase
from ..utils.geo_utils import dms_to_decimal


def _safe_str(val) -> str | None:
    if val is None:
        return None
    return str(val).strip() or None


def _parse_gps(gps_info: dict) -> tuple[float | None, float | None, float | None]:
    """Parse GPS info from EXIF IFD GPS tags."""
    lat = lon = alt = None

    try:
        if 2 in gps_info and 1 in gps_info:
            lat_dms = gps_info[2]
            lat_ref = gps_info[1]
            lat = dms_to_decimal(
                float(lat_dms[0]), float(lat_dms[1]), float(lat_dms[2]),
                lat_ref,
            )
        if 4 in gps_info and 3 in gps_info:
            lon_dms = gps_info[4]
            lon_ref = gps_info[3]
            lon = dms_to_decimal(
                float(lon_dms[0]), float(lon_dms[1]), float(lon_dms[2]),
                lon_ref,
            )
        if 6 in gps_info:
            alt = float(gps_info[6])
            if gps_info.get(5) == 1:
                alt = -alt
    except (KeyError, TypeError, ValueError, IndexError):
        pass

    return lat, lon, alt


def extract_exif(file_path: str) -> dict:
    """Extract EXIF metadata from an image file."""
    result = {
        "width": None,
        "height": None,
        "date_taken": None,
        "latitude": None,
        "longitude": None,
        "altitude": None,
        "camera_make": None,
        "camera_model": None,
        "lens_model": None,
        "focal_length": None,
        "aperture": None,
        "shutter_speed": None,
        "iso": None,
        "orientation": 1,
    }

    try:
        with Image.open(file_path) as img:
            result["width"] = img.width
            result["height"] = img.height

            exif = img.getexif()
            if not exif:
                return result

            # Orientation
            if ExifBase.Orientation in exif:
                result["orientation"] = int(exif[ExifBase.Orientation])

            # Camera info
            result["camera_make"] = _safe_str(exif.get(ExifBase.Make))
            result["camera_model"] = _safe_str(exif.get(ExifBase.Model))

            # Date taken
            date_str = exif.get(ExifBase.DateTimeOriginal) or exif.get(ExifBase.DateTime)
            if date_str:
                date_str = str(date_str).strip()
                # Convert EXIF format "YYYY:MM:DD HH:MM:SS" to ISO 8601
                if len(date_str) >= 19 and date_str[4] == ":":
                    date_str = date_str[:4] + "-" + date_str[5:7] + "-" + date_str[8:]
                result["date_taken"] = date_str

            # Lens
            ifd = exif.get_ifd(0x8769)  # EXIF IFD
            if ifd:
                result["lens_model"] = _safe_str(ifd.get(0xA434))  # LensModel

                # Focal length
                fl = ifd.get(0x920A)  # FocalLength
                if fl is not None:
                    result["focal_length"] = float(fl)

                # Aperture (FNumber)
                fn = ifd.get(0x829D)
                if fn is not None:
                    result["aperture"] = float(fn)

                # Shutter speed (ExposureTime)
                et = ifd.get(0x829A)
                if et is not None:
                    result["shutter_speed"] = str(et)

                # ISO
                iso = ifd.get(0x8827)
                if iso is not None:
                    if isinstance(iso, tuple):
                        iso = iso[0]
                    result["iso"] = int(iso)

            # GPS
            gps_ifd = exif.get_ifd(0x8825)
            if gps_ifd:
                lat, lon, alt = _parse_gps(gps_ifd)
                result["latitude"] = lat
                result["longitude"] = lon
                result["altitude"] = alt

    except Exception:
        pass

    return result
