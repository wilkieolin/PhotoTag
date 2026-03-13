from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Paths
    data_dir: Path = Path(__file__).resolve().parent.parent.parent / "data"
    db_path: Path = Path(__file__).resolve().parent.parent.parent / "data" / "phototag.db"
    chromadb_path: Path = Path(__file__).resolve().parent.parent.parent / "data" / "chromadb"
    thumbnail_dir: Path = Path(__file__).resolve().parent.parent.parent / "data" / "thumbnails"

    # CLIP model
    clip_model_name: str = "ViT-B-32"
    clip_pretrained: str = "laion2b_s34b_b79k"
    clip_batch_size: int = 32
    clip_device: str = "auto"

    # Ollama
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen3-vl:latest"
    ollama_timeout: int = 120

    # Processing
    thumbnail_small_size: int = 400
    thumbnail_medium_size: int = 1200
    scan_extensions: list[str] = [
        ".jpg", ".jpeg", ".png", ".webp",
        ".tiff", ".tif", ".heic", ".heif", ".avif",
    ]
    max_scan_workers: int = 4

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    frontend_url: str = "http://localhost:5173"

    model_config = {"env_prefix": "PHOTOTAG_", "env_file": ".env"}


settings = Settings()
