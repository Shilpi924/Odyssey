import { fetchNpsAlerts } from '@/lib/trails/providers';
import { retrieveRagChunks } from './retriever';

function supplied(value, fallback = 'not supplied') {
  return value == null || value === '' ? fallback : value;
}

function cleanEvidenceText(value, maxLength = 4000) {
  return String(value || '').replace(/\0/g, '').trim().slice(0, maxLength);
}

function source(id, { title, url, provider, retrievedAt, content, kind }) {
  return {
    id,
    title: cleanEvidenceText(title, 300),
    url: String(url || ''),
    provider: cleanEvidenceText(provider, 200),
    retrievedAt,
    content: cleanEvidenceText(content),
    kind,
  };
}

export function catalogEvidence(trail) {
  const facts = [
    `Trail: ${trail.name}`,
    `Park: ${trail.geography.parkName}`,
    `Region: ${supplied(trail.geography.region)}`,
    `Difficulty: ${supplied(trail.difficulty, 'unknown')}`,
    `Route: ${supplied(trail.route.type)}`,
    `Distance: ${trail.route.distanceMiles == null ? 'not supplied' : `${trail.route.distanceMiles} miles`}`,
    `Elevation gain: ${trail.route.elevationGainFeet == null ? 'not supplied' : `${trail.route.elevationGainFeet} feet`}`,
    `Features: ${trail.features.length ? trail.features.join(', ') : 'none supplied'}`,
    `Access status: ${supplied(trail.access.status, 'Unknown')}`,
    `Permit required: ${trail.access.permitRequired ? 'yes' : 'not indicated by the catalog'}`,
  ].join('\n');
  return source('source-1', {
    title: `${trail.name} catalog record`,
    url: trail.source.sourceUrl,
    provider: trail.source.attribution,
    retrievedAt: null,
    content: facts,
    kind: 'catalog',
  });
}

export async function buildTrailEvidence({
  trail,
  park,
  question,
  ragEnabled = process.env.RAG_ENABLED === 'true',
  retrieve = retrieveRagChunks,
  alertsFetcher = fetchNpsAlerts,
  npsApiKey = process.env.NPS_API_KEY,
} = {}) {
  const sources = [catalogEvidence(trail)];
  const warnings = [];
  let retrievalAvailable = false;

  if (ragEnabled) {
    const retrieval = await retrieve({ question, parkId: park?.id, trailId: trail.id });
    retrievalAvailable = retrieval.available;
    if (!retrieval.available) warnings.push(retrieval.reason || 'retrieval_unavailable');
    for (const chunk of retrieval.chunks) {
      sources.push(source(`source-${sources.length + 1}`, {
        title: chunk.heading ? `${chunk.title} — ${chunk.heading}` : chunk.title,
        url: chunk.url,
        provider: chunk.provider,
        retrievedAt: chunk.fetchedAt,
        content: chunk.content,
        kind: 'document',
      }));
    }
  }

  const alerts = [];
  if (park?.parkCode && npsApiKey) {
    try {
      const response = await alertsFetcher(park.parkCode, npsApiKey);
      for (const alert of response.alerts.slice(0, 10)) {
        const alertUrl = alert.url || `https://www.nps.gov/${park.parkCode}/planyourvisit/conditions.htm`;
        const evidence = source(`source-${sources.length + 1}`, {
          title: alert.title,
          url: alertUrl,
          provider: 'U.S. National Park Service alert',
          retrievedAt: response.fetchedAt,
          content: `${alert.category || 'Park alert'}: ${alert.description}`,
          kind: 'alert',
        });
        sources.push(evidence);
        alerts.push({ id: alert.id, title: alert.title, category: alert.category, url: alertUrl, sourceId: evidence.id });
      }
    } catch {
      warnings.push('alerts_unavailable');
    }
  }

  return {
    sources,
    alerts,
    warnings,
    retrievalAvailable,
    context: sources.map(item => `[${item.id}] ${item.title}\nURL: ${item.url}\n${item.content}`).join('\n\n'),
  };
}
