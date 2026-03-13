from pydantic import BaseModel
from typing import Optional


class PhotoOut(BaseModel):
    id: int
    file_path: str
    filename: str
    file_size: int
    mime_type: str
    width: Optional[int] = None
    height: Optional[int] = None
    date_taken: Optional[str] = None
    date_file: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    altitude: Optional[float] = None
    camera_make: Optional[str] = None
    camera_model: Optional[str] = None
    lens_model: Optional[str] = None
    focal_length: Optional[float] = None
    aperture: Optional[float] = None
    shutter_speed: Optional[str] = None
    iso: Optional[int] = None
    orientation: int = 1
    thumbnail_path: Optional[str] = None
    has_embedding: bool = False
    has_ai_tags: bool = False
    created_at: str
    updated_at: str
    tags: list["TagOut"] = []


class TagOut(BaseModel):
    id: int
    name: str
    source: str = "user"
    color: Optional[str] = None
    created_at: str


class TagCreate(BaseModel):
    name: str
    color: Optional[str] = None


class TagUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None


class TagAssign(BaseModel):
    tag_ids: list[int]


class ScanRequest(BaseModel):
    directory: str
    recursive: bool = True


class ScanStatus(BaseModel):
    id: int
    directory: str
    status: str
    total_files: int = 0
    processed_files: int = 0
    new_photos: int = 0
    skipped_files: int = 0
    error_count: int = 0
    started_at: Optional[str] = None
    completed_at: Optional[str] = None


class DirectoryCreate(BaseModel):
    directory: str
    recursive: bool = True


class DirectoryOut(BaseModel):
    id: int
    directory: str
    recursive: bool
    last_scanned: Optional[str] = None
    created_at: str


class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    per_page: int
    pages: int


class SimilarPhotoResult(BaseModel):
    photo: PhotoOut
    similarity: float


class TaskStatus(BaseModel):
    id: str
    type: str
    status: str
    progress: dict = {}
    error: Optional[str] = None


class StatsOut(BaseModel):
    total_photos: int
    total_tags: int
    photos_with_embeddings: int
    photos_with_ai_tags: int
    photos_with_gps: int
    total_storage_bytes: int
