import numpy as np
from PIL import Image
from ..config import settings


class CLIPModelManager:
    """Singleton that loads the CLIP model once and keeps it in memory."""

    def __init__(self):
        self._model = None
        self._preprocess = None
        self._tokenizer = None
        self._device = None
        self._loaded = False

    def load(self):
        if self._loaded:
            return

        import torch
        import open_clip

        if settings.clip_device == "auto":
            self._device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self._device = settings.clip_device

        self._model, _, self._preprocess = open_clip.create_model_and_transforms(
            settings.clip_model_name,
            pretrained=settings.clip_pretrained,
            device=self._device,
        )
        self._tokenizer = open_clip.get_tokenizer(settings.clip_model_name)
        self._model.eval()
        self._loaded = True

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    def embed_images(self, image_paths: list[str], batch_size: int | None = None) -> np.ndarray:
        """Embed a batch of images. Returns (N, dim) float32 array."""
        import torch

        if not self._loaded:
            self.load()

        batch_size = batch_size or settings.clip_batch_size
        all_embeddings = []

        for i in range(0, len(image_paths), batch_size):
            batch_paths = image_paths[i:i + batch_size]
            images = []
            for path in batch_paths:
                try:
                    img = Image.open(path).convert("RGB")
                    images.append(self._preprocess(img))
                except Exception:
                    # Use a zero tensor as placeholder for corrupt images
                    images.append(self._preprocess(Image.new("RGB", (224, 224))))

            image_tensor = torch.stack(images).to(self._device)
            with torch.no_grad():
                features = self._model.encode_image(image_tensor)
                features = features / features.norm(dim=-1, keepdim=True)
            all_embeddings.append(features.cpu().numpy().astype(np.float32))

        return np.concatenate(all_embeddings, axis=0)

    def embed_text(self, text: str) -> np.ndarray:
        """Embed a text query. Returns (1, dim) float32 array."""
        import torch

        if not self._loaded:
            self.load()

        tokens = self._tokenizer([text]).to(self._device)
        with torch.no_grad():
            features = self._model.encode_text(tokens)
            features = features / features.norm(dim=-1, keepdim=True)
        return features.cpu().numpy().astype(np.float32)


clip_manager = CLIPModelManager()
