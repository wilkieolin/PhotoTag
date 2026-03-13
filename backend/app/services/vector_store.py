import chromadb
from ..config import settings


class VectorStore:
    def __init__(self):
        self._client = None
        self._collection = None

    def _ensure_init(self):
        if self._client is None:
            self._client = chromadb.PersistentClient(path=str(settings.chromadb_path))
            self._collection = self._client.get_or_create_collection(
                name="photo_embeddings",
                metadata={"hnsw:space": "cosine"},
            )

    def upsert(self, photo_id: int, embedding: list[float], metadata: dict | None = None):
        self._ensure_init()
        meta = metadata or {}
        meta["photo_id"] = photo_id
        self._collection.upsert(
            ids=[str(photo_id)],
            embeddings=[embedding],
            metadatas=[meta],
        )

    def upsert_batch(self, ids: list[int], embeddings: list[list[float]],
                     metadatas: list[dict] | None = None):
        self._ensure_init()
        str_ids = [str(i) for i in ids]
        if metadatas is None:
            metadatas = [{"photo_id": i} for i in ids]
        self._collection.upsert(
            ids=str_ids,
            embeddings=embeddings,
            metadatas=metadatas,
        )

    def query_similar(self, photo_id: str, limit: int = 20) -> list[tuple[str, float]]:
        """Find similar photos by ID. Returns list of (id, distance)."""
        self._ensure_init()
        try:
            result = self._collection.get(ids=[photo_id], include=["embeddings"])
            if not result["embeddings"]:
                return []
            embedding = result["embeddings"][0]
        except Exception:
            return []

        return self.query_by_embedding(embedding, limit)

    def query_by_embedding(self, embedding: list[float], limit: int = 20) -> list[tuple[str, float]]:
        """Query by raw embedding vector. Returns list of (id, distance)."""
        self._ensure_init()
        results = self._collection.query(
            query_embeddings=[embedding],
            n_results=limit,
        )
        pairs = []
        if results["ids"] and results["distances"]:
            for doc_id, distance in zip(results["ids"][0], results["distances"][0]):
                pairs.append((doc_id, distance))
        return pairs

    def delete(self, photo_id: int):
        self._ensure_init()
        try:
            self._collection.delete(ids=[str(photo_id)])
        except Exception:
            pass

    def count(self) -> int:
        self._ensure_init()
        return self._collection.count()


vector_store = VectorStore()
