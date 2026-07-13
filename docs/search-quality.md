# Odyssey Trail Search Quality Contract

Phase 1 establishes the shared data language and measurable acceptance criteria for trail search. It does not attempt large-scale route verification, moderation, community ingestion, or navigation reliability.

## Canonical trail record

The executable model lives in `src/lib/trails/schema.js`. A trail record separates:

- identity: stable Odyssey ID, slug, canonical name, and aliases;
- geography: park, region, locality, state, country, and trailhead coordinates;
- route facts: geometry, route type, distance, elevation, and expected duration;
- discovery attributes: difficulty, activities, features, and suitability;
- access: open/closed state, permits, reservations, fees, and seasonal notes;
- quality signals: rating, review count, popularity, and record completeness;
- provenance: provider, external ID, URL, license, attribution, import time, and verification time.

Unknown information must remain `null` or `Unknown`; importers must not invent route facts. Display formatting such as `14–16 miles` belongs in the UI, while canonical numeric values belong in the model.

## Difficulty vocabulary

Odyssey uses `Easy`, `Moderate`, `Hard`, and `Strenuous`. Source-specific labels must be mapped during ingestion, with the original value retained in source metadata when necessary.

## Initial search targets

The executable targets and seed benchmark queries live in `src/lib/trails/search-benchmarks.js`.

| Metric | Initial acceptance target |
| --- | ---: |
| Precision@5 | 80% |
| Precision@10 | 75% |
| Famous-trail recall | 95% |
| Zero-result rate | <= 2% |
| Duplicate rate | <= 1% |
| Wrong-region rate | <= 1% |
| Closed trails in top five | 0% |
| Search response time, p95 | <= 1.5 seconds |

Precision is judged against human-labeled relevant results. Famous-trail recall measures whether a named or destination-defining trail appears when expected. A closed trail may be shown for informational purposes, but it cannot be presented as a recommended top-five result.

## Benchmark lifecycle

1. Each benchmark has a stable ID, query, expected geographic entity, and expected filters.
2. Human-reviewed relevance judgments will be added before ranking work begins.
3. Retrieval changes must be evaluated against the same benchmark version.
4. New regions receive their own benchmark subset before release.
5. Metrics are reported by region and query class so strong Yosemite results cannot hide weak nearby-search performance.

## Phase 1 completion criteria

- One reusable canonical schema exists and validates unsafe values.
- Legacy result objects can be normalized into it without importing provider-specific assumptions.
- Search-quality targets are executable constants rather than informal goals.
- Seed benchmarks cover exact trail, park, region, filtered, and nearby searches.
- Unit tests protect the schema and quality contract.

## Yosemite pilot evaluation

`evaluateSearchBenchmarks()` executes the supported benchmark subset against the catalog engine. Unsupported regions are reported separately and never counted as successful. This prevents the Yosemite pilot from implying nationwide coverage.
