# Trail catalog sources and licensing

Phase 2 begins with a Yosemite pilot. Every imported field must retain provider, external identifier, source URL, license, attribution, and timestamps when available.

## Approved sources

### U.S. National Park Service

Use for authoritative park facts, trail facts, alerts, and official park boundaries. The NPS API is intended for external apps and requires a private API key. Individual assets can have separate rights notices, so importers must check per-asset restrictions rather than assuming every photograph or document is reusable.

- API documentation: https://www.nps.gov/subjects/developer/api-documentation.htm
- Yosemite hiking facts: https://www.nps.gov/yose/planyourvisit/hiking.htm
- Yosemite Valley day hikes: https://www.nps.gov/yose/planyourvisit/valleyhikes.htm

### OpenStreetMap

Use for route geometry, paths, trailheads, and map context. OSM data is licensed under ODbL 1.0. Odyssey must display `© OpenStreetMap contributors`, link to the copyright/license page, and preserve applicable share-alike obligations for derived databases.

- License and attribution: https://www.openstreetmap.org/copyright

## Import rules

1. Never copy trail data from AllTrails, Google Maps pages, or another proprietary directory.
2. Store provenance at the record level; field-level provenance is added when records begin merging providers.
3. Do not manufacture ratings, review counts, route geometry, or access status.
4. Treat the pilot Yosemite polygon as a search envelope, not a legal park boundary.
5. Replace the search envelope with the official NPS MultiPolygon before geographic membership is described as authoritative.
6. Run `auditCatalog()` in ingestion and CI before publishing catalog changes.

