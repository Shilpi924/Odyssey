const DEFAULT_TIMEOUT_MS = 5000;

function configuredUrl(baseUrl) {
  const value = String(baseUrl || '').trim().replace(/\/$/, '');
  return value || null;
}

export function validateEmbeddings(value, expectedCount) {
  if (!Array.isArray(value) || value.length !== expectedCount) throw new Error('Embedding service returned an invalid batch');
  const dimensions = value[0]?.length;
  if (!Number.isInteger(dimensions) || dimensions <= 0) throw new Error('Embedding service returned an empty vector');
  for (const vector of value) {
    if (!Array.isArray(vector) || vector.length !== dimensions || vector.some(number => !Number.isFinite(number))) {
      throw new Error('Embedding service returned an invalid vector');
    }
  }
  return value;
}

export async function embedTexts(texts, {
  fetchImpl = fetch,
  baseUrl = process.env.RAG_EMBEDDING_URL,
  token = process.env.RAG_EMBEDDING_TOKEN,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  if (!Array.isArray(texts) || texts.length === 0 || texts.some(text => !String(text).trim())) {
    throw new Error('At least one non-empty text is required');
  }
  const url = configuredUrl(baseUrl);
  if (!url) throw new Error('RAG embedding service is not configured');
  const response = await fetchImpl(`${url}/embed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ texts: texts.map(text => String(text).trim()) }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`Embedding service request failed (${response.status})`);
  const body = await response.json();
  return validateEmbeddings(body.embeddings, texts.length);
}
