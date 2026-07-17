import os
from typing import List

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer


MODEL_NAME = os.getenv("RAG_EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")
API_TOKEN = os.getenv("RAG_EMBEDDING_TOKEN", "")
MAX_BATCH_SIZE = int(os.getenv("RAG_MAX_BATCH_SIZE", "32"))
MAX_TEXT_LENGTH = int(os.getenv("RAG_MAX_TEXT_LENGTH", "8000"))

app = FastAPI(title="Odyssey RAG Embedder", docs_url=None, redoc_url=None)
model = SentenceTransformer(MODEL_NAME, device="cpu")


class EmbedRequest(BaseModel):
    texts: List[str] = Field(min_length=1)


def authorize(authorization: str | None = Header(default=None)):
    if API_TOKEN and authorization != f"Bearer {API_TOKEN}":
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_NAME}


@app.post("/embed", dependencies=[Depends(authorize)])
def embed(request: EmbedRequest):
    if len(request.texts) > MAX_BATCH_SIZE:
        raise HTTPException(status_code=413, detail="Batch is too large")
    texts = [text.strip() for text in request.texts]
    if any(not text or len(text) > MAX_TEXT_LENGTH for text in texts):
        raise HTTPException(status_code=400, detail="Texts must be non-empty and within the size limit")
    embeddings = model.encode(texts, normalize_embeddings=True).tolist()
    return {
        "model": MODEL_NAME,
        "dimensions": len(embeddings[0]),
        "embeddings": embeddings,
    }
