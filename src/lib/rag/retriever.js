import { db } from '@/lib/pg';
import { embedTexts } from './embedding-client';

const DEFAULT_LIMIT = 8;

export function toVectorLiteral(vector) {
  if (!Array.isArray(vector) || !vector.length || vector.some(value => !Number.isFinite(value))) {
    throw new Error('A finite embedding vector is required');
  }
  return `[${vector.join(',')}]`;
}

export async function retrieveRagChunks({
  question,
  parkId = null,
  trailId = null,
  limit = Number(process.env.RAG_RETRIEVAL_LIMIT) || DEFAULT_LIMIT,
  dbClient = db,
  embed = embedTexts,
} = {}) {
  if (!dbClient) return { available: false, chunks: [], reason: 'database_unavailable' };
  if (!String(question || '').trim()) return { available: true, chunks: [] };

  try {
    const [embedding] = await embed([question]);
    const safeLimit = Math.min(Math.max(Number(limit) || DEFAULT_LIMIT, 1), 20);
    const result = await dbClient.query(`
      SELECT
        c.id,
        c.heading,
        c.content,
        c.park_id,
        c.trail_id,
        d.title,
        d.source_url,
        d.provider,
        d.fetched_at,
        1 - (c.embedding <=> $1::vector) AS semantic_score,
        ts_rank(c.search_vector, plainto_tsquery('english', $2)) AS lexical_score
      FROM rag_chunks c
      JOIN rag_documents d ON d.id = c.document_id
      WHERE d.status = 'active'
        AND ($3::text IS NULL OR c.park_id IS NULL OR c.park_id = $3)
        AND ($4::text IS NULL OR c.trail_id IS NULL OR c.trail_id = $4)
      ORDER BY (
        (1 - (c.embedding <=> $1::vector)) * 0.8
        + ts_rank(c.search_vector, plainto_tsquery('english', $2)) * 0.2
      ) DESC
      LIMIT $5
    `, [toVectorLiteral(embedding), question, parkId, trailId, safeLimit]);

    return {
      available: true,
      chunks: result.rows.map(row => ({
        id: row.id,
        title: row.title,
        heading: row.heading,
        content: row.content,
        url: row.source_url,
        provider: row.provider,
        fetchedAt: row.fetched_at,
        semanticScore: Number(row.semantic_score),
        lexicalScore: Number(row.lexical_score),
      })).filter(chunk => chunk.semanticScore >= 0.3 || chunk.lexicalScore > 0),
    };
  } catch (error) {
    console.error('RAG retrieval error:', error);
    return { available: false, chunks: [], reason: 'retrieval_failed' };
  }
}
