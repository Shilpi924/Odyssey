# Grounded Trail Guide architecture

Odyssey uses a two-step retrieval-augmented generation flow for trail questions.
The deterministic catalog remains authoritative for structured trail facts. An
optional CPU embedding service and PostgreSQL `pgvector` index supplement those
facts with passages from allowlisted official park sources. Current NPS alerts
are fetched at request time and are never treated as static indexed guidance.

## Request flow

1. The API resolves a client-supplied trail ID to the server catalog.
2. When `RAG_ENABLED=true`, the question is embedded by the private CPU service.
3. PostgreSQL performs metadata-filtered semantic and full-text retrieval.
4. The evidence builder combines catalog facts, retrieved passages, and alerts.
5. Claude receives only the bounded evidence and must cite evidence identifiers.
6. The API removes unknown citations and returns source metadata with a grounding
   state of `supported`, `partial`, or `insufficient`.

LangGraph is intentionally not part of this path. Retrieval is mandatory and
predictable, so a stateful agent loop would add complexity without improving the
control boundary. LangGraph remains a possible later fit for the multi-step day
planner.

## Local setup

1. Apply `db/migrations/001_rag.sql` to a PostgreSQL database with `pgvector`.
2. Start the private service described in `services/rag-embedder/README.md`.
3. Configure `DATABASE_URL`, `RAG_EMBEDDING_URL`, and `RAG_EMBEDDING_TOKEN`.
4. Run `npm run rag:ingest` to index `docs/rag-sources.json`.
5. Set `RAG_ENABLED=true` and restart the application.

The application remains functional with RAG disabled or temporarily unavailable;
the Trail Guide still receives the canonical catalog record and reports retrieval
warnings in its response metadata.

## Operational controls

- Keep the embedding service on a private network and require its bearer token.
- Preload the pinned embedding model in production images.
- Run ingestion on a schedule appropriate to each source and retain fetch logs.
- Review source licensing and robots policies before expanding the manifest.
- Measure retrieval recall before introducing an approximate vector index.
- Do not log full questions or evidence passages by default.
- Keep emergency flows deterministic and outside the RAG system.
