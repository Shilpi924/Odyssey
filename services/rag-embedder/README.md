# Odyssey CPU embedding service

This internal CPU service generates normalized 384-dimensional embeddings for
the RAG ingestion and query paths. It is not intended to be publicly reachable.

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
RAG_EMBEDDING_TOKEN=development-token \
  uvicorn app:app --host 127.0.0.1 --port 8010
```

The first startup downloads `BAAI/bge-small-en-v1.5`. Production images should
preload and pin the model artifact so startup does not require network access.
An ONNX export can replace the default CPU runtime after benchmarking without
changing the HTTP contract.
