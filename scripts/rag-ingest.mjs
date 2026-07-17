import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import nextEnv from '@next/env';
import pg from 'pg';

const { loadEnvConfig } = nextEnv;
const { Pool } = pg;
loadEnvConfig(process.cwd());

const ALLOWED_HOSTS = new Set(['www.nps.gov', 'nps.gov', 'www.parks.ca.gov', 'parks.ca.gov']);
const MAX_DOCUMENT_BYTES = 2_000_000;
const TARGET_CHARS = 2600;
const OVERLAP_CHARS = 350;

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

function assertAllowedUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !ALLOWED_HOSTS.has(url.hostname)) throw new Error(`Source URL is not allowlisted: ${value}`);
  return url;
}

function decodeEntities(value) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

export function extractHtml(html) {
  const title = decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || 'Official park guidance')
    .replace(/\s+/g, ' ').trim();
  const text = decodeEntities(html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<\/(?:p|div|section|article|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '))
    .split('\n')
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(line => line.length >= 30)
    .join('\n');
  return { title, text };
}

export function chunkText(text, targetChars = TARGET_CHARS, overlapChars = OVERLAP_CHARS) {
  const paragraphs = String(text || '').split(/\n+/).map(value => value.trim()).filter(Boolean);
  const chunks = [];
  let current = '';
  for (const paragraph of paragraphs) {
    if (current && current.length + paragraph.length + 1 > targetChars) {
      chunks.push(current);
      current = `${current.slice(-overlapChars)}\n${paragraph}`;
    } else {
      current = current ? `${current}\n${paragraph}` : paragraph;
    }
  }
  if (current) chunks.push(current);
  return chunks.filter(value => value.length >= 80);
}

async function embed(texts) {
  const baseUrl = String(process.env.RAG_EMBEDDING_URL || '').replace(/\/$/, '');
  if (!baseUrl) throw new Error('RAG_EMBEDDING_URL is required');
  const response = await fetch(`${baseUrl}/embed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.RAG_EMBEDDING_TOKEN ? { Authorization: `Bearer ${process.env.RAG_EMBEDDING_TOKEN}` } : {}),
    },
    body: JSON.stringify({ texts }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Embedding service failed (${response.status})`);
  const body = await response.json();
  if (body.dimensions !== 384 || body.embeddings?.length !== texts.length) throw new Error('Unexpected embedding response');
  return body.embeddings;
}

async function fetchDocument(entry) {
  assertAllowedUrl(entry.url);
  const response = await fetch(entry.url, {
    headers: { Accept: 'text/html', 'User-Agent': 'Odyssey/0.1 RAG indexer' },
    signal: AbortSignal.timeout(20000),
  });
  assertAllowedUrl(response.url);
  if (!response.ok) throw new Error(`Source request failed (${response.status})`);
  const length = Number(response.headers.get('content-length'));
  if (Number.isFinite(length) && length > MAX_DOCUMENT_BYTES) throw new Error('Source document is too large');
  const html = await response.text();
  if (Buffer.byteLength(html) > MAX_DOCUMENT_BYTES) throw new Error('Source document is too large');
  return extractHtml(html);
}

async function ingestEntry(pool, entry) {
  const { title, text } = await fetchDocument(entry);
  const chunks = chunkText(text);
  if (!chunks.length) throw new Error('No indexable content was found');
  const contentHash = hash(text);
  const documentId = hash(entry.url);
  const existing = await pool.query('SELECT content_hash FROM rag_documents WHERE id = $1', [documentId]);
  if (existing.rows[0]?.content_hash === contentHash) return { url: entry.url, status: 'unchanged', chunks: 0 };

  const embeddings = [];
  for (let index = 0; index < chunks.length; index += 16) {
    embeddings.push(...await embed(chunks.slice(index, index + 16)));
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      INSERT INTO rag_documents (id, source_url, title, provider, park_id, trail_id, content_hash, fetched_at, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, now(), $8::jsonb)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        provider = EXCLUDED.provider,
        park_id = EXCLUDED.park_id,
        trail_id = EXCLUDED.trail_id,
        content_hash = EXCLUDED.content_hash,
        status = 'active',
        fetched_at = now(),
        metadata = EXCLUDED.metadata
    `, [documentId, entry.url, title, entry.provider, entry.parkId || null, entry.trailId || null, contentHash, JSON.stringify({ ingestion: 'html-v1' })]);
    await client.query('DELETE FROM rag_chunks WHERE document_id = $1', [documentId]);
    for (let index = 0; index < chunks.length; index += 1) {
      const vector = `[${embeddings[index].join(',')}]`;
      await client.query(`
        INSERT INTO rag_chunks (id, document_id, chunk_index, heading, content, park_id, trail_id, embedding)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector)
      `, [hash(`${documentId}:${index}:${chunks[index]}`), documentId, index, null, chunks[index], entry.parkId || null, entry.trailId || null, vector]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  return { url: entry.url, status: 'indexed', chunks: chunks.length };
}

async function main() {
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL or POSTGRES_URL is required');
  const manifestPath = resolve(process.env.RAG_SOURCE_MANIFEST || 'docs/rag-sources.json');
  const entries = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (!Array.isArray(entries) || !entries.length) throw new Error('The RAG source manifest is empty');
  const pool = new Pool({ connectionString, ssl: /localhost|127\.0\.0\.1/.test(connectionString) ? false : { rejectUnauthorized: false } });
  try {
    for (const entry of entries) console.log(JSON.stringify(await ingestEntry(pool, entry)));
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
