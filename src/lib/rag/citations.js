export function citedSourceIds(answer) {
  return [...new Set(String(answer || '').match(/\[source-\d+\]/g) || [])]
    .map(value => value.slice(1, -1));
}

export function validateCitations(answer, sources) {
  const known = new Map(sources.map(source => [source.id, source]));
  const requested = citedSourceIds(answer);
  const citations = requested.map(id => known.get(id)).filter(Boolean);
  return {
    citations,
    unknownCitationIds: requested.filter(id => !known.has(id)),
    hasCitations: citations.length > 0,
  };
}

export function removeUnknownCitations(answer, unknownCitationIds) {
  const unknown = new Set(unknownCitationIds);
  return String(answer || '').replace(/\[(source-\d+)\]/g, (match, id) => unknown.has(id) ? '' : match)
    .replace(/ +([.,;:!?])/g, '$1')
    .replace(/ {2,}/g, ' ')
    .trim();
}
