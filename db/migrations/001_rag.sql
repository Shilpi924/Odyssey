CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS rag_documents (
  id TEXT PRIMARY KEY,
  source_url TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  provider TEXT NOT NULL,
  park_id TEXT,
  trail_id TEXT,
  content_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'superseded', 'failed')),
  published_at TIMESTAMP WITH TIME ZONE,
  effective_at TIMESTAMP WITH TIME ZONE,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS rag_chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL CHECK (chunk_index >= 0),
  heading TEXT,
  content TEXT NOT NULL,
  park_id TEXT,
  trail_id TEXT,
  embedding VECTOR(384) NOT NULL,
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(heading, '') || ' ' || content)
  ) STORED,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS rag_documents_scope_idx ON rag_documents(park_id, trail_id);
CREATE INDEX IF NOT EXISTS rag_documents_status_idx ON rag_documents(status);
CREATE INDEX IF NOT EXISTS rag_chunks_scope_idx ON rag_chunks(park_id, trail_id);
CREATE INDEX IF NOT EXISTS rag_chunks_search_idx ON rag_chunks USING GIN(search_vector);

-- Exact cosine search is intentional for the initial, small official-source corpus.
-- Add an HNSW index only after retrieval benchmarks show that it is needed.
