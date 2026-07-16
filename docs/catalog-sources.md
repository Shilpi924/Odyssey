# Trail catalog sources and licensing

Odyssey's California pilot has officially sourced catalog coverage for Yosemite National Park and Mount Diablo State Park. Every imported field must retain its provider, external identifier, source URL, license, attribution, and timestamps when available.

The catalog contains 43 NPS-sourced Yosemite routes across Yosemite Valley, Glacier Point Road, Tuolumne Meadows, Mariposa Grove, Hetch Hetchy, and Wawona, plus seven California State Parks-sourced Mount Diablo trails. When an official source publishes distance and elevation but not one of Odyssey's canonical difficulty labels, the record may use an `odyssey-*` method and must expose that method in provenance. Missing facts remain unknown.

## Approved sources

### U.S. National Park Service

Use for authoritative park facts, trail facts, alerts, and official park boundaries. The NPS API is intended for external apps and requires a private API key. Individual assets can have separate rights notices, so importers must check per-asset restrictions rather than assuming every photograph or document is reusable.

- API documentation: https://www.nps.gov/subjects/developer/api-documentation.htm
- Yosemite hiking facts: https://www.nps.gov/yose/planyourvisit/hiking.htm
- Yosemite Valley day hikes: https://www.nps.gov/yose/planyourvisit/valleyhikes.htm

### California State Parks

Use for authoritative Mount Diablo park and trail facts, accessibility details, trail-use designations, and official route geometry. California State Parks pages and datasets may contain copyrighted or third-party material, so preserve attribution and evaluate restrictions for each imported item. Odyssey uses individual facts and provider-supplied route lines; it does not reproduce State Parks map artwork.

- Mount Diablo State Park: https://www.parks.ca.gov/?page_id=517
- Accessible features: https://www.parks.ca.gov/AccessibleFeatures/Details/517
- Official trail facts: https://www.parks.ca.gov/NewsRelease/887
- Diablo Range District trail-use policy: https://www.parks.ca.gov/pages/561/files/680-19-029%20-%20Diablo%20Range%20District%20Trail%20Use%20Policy.pdf
- Mount Diablo road and trail management plan: https://www.parks.ca.gov/pages/1324/files/mdsp%20rtmp%20final.sm.pdf
- Official ArcGIS trail layer metadata: https://services2.arcgis.com/AhxrK3F6WM8ECvDi/arcgis/rest/services/Click_able_Layers/FeatureServer/4

### OpenStreetMap

Use for community-mapped trail discovery, available route-relation geometry, paths, trailheads, and map context. OSM data is licensed under ODbL 1.0. Odyssey must display `© OpenStreetMap contributors`, link to the copyright/license page, and preserve applicable share-alike obligations for derived databases. OSM records must not be presented as official park facts.

- License and attribution: https://www.openstreetmap.org/copyright

## Import rules

1. Never copy trail data from AllTrails, Google Maps pages, or another proprietary directory.
2. Store provenance at the record level; field-level provenance is added when records begin merging providers.
3. Do not manufacture ratings, review counts, route geometry, or access status.
4. Treat the Yosemite and Mount Diablo catalog polygons as discovery search envelopes, not legal park boundaries.
5. Use an authoritative provider boundary before geographic membership is described as official; the NPS boundary endpoint is available for Yosemite, while Mount Diablo's current envelope remains non-authoritative.
6. Run `auditCatalog()` in ingestion and CI before publishing catalog changes.

## Live enrichment

- Geometry-enabled records retain the provider's source identifier and attribution. Yosemite records may identify an OSM relation; Mount Diablo records identify California State Parks ArcGIS feature IDs and unit number 203.
- `/api/trails/[id]/geometry` retrieves route lines on demand from the record's declared provider and calculates displayed geometry distance from the returned coordinates. A calculated line distance does not replace the official route-distance fact in the catalog.
- Elevation gain is displayed only when the sourced catalog record provides it; no external elevation fallback is active.
- `/api/park-alerts` retrieves NPS alerts with `NPS_API_KEY`, caches them briefly, and fails without blocking Yosemite trail results.
- `/api/parks/[code]/boundary` retrieves an official NPS park boundary as GeoJSON for PostGIS ingestion and precise membership checks; it does not make the Mount Diablo search envelope authoritative.
- Provider failures must return explicit unavailable/error states; they must never silently become official facts.
