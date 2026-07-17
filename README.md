# 🥾 Odyssey

Odyssey is an early-stage trail discovery and local GPS tool built around explicitly sourced data. Official trail coverage includes Yosemite National Park and Mount Diablo State Park, while OpenStreetMap community data expands destination and nearby discovery without relying on scraped AllTrails content or invented provider facts.

## Current capabilities

- Official Yosemite and Mount Diablo trail search plus OpenStreetMap destination and near-me discovery
- National Park Service alerts and source links
- Official California State Parks geometry for Mount Diablo and reviewed OpenStreetMap relation geometry for Yosemite
- Interactive MapLibre map using a Stadia Maps vector basemap with visible attribution
- Locally saved trail facts and route lines, a connection-free route canvas, completed activity history, GPX export, and privacy-controlled GPS recording
- Optional authenticated preference storage
- Explicit, optional account backup for completed activities
- Optional Anthropic-powered questions and refinement over the supplied trail set

The app intentionally returns a coverage message outside its verified catalog. It does not currently claim offline basemap downloads, live weather, crowds, pollen, air quality, community reviews, or arbitrary global trail coverage.

## Technology

- Next.js 16 App Router and React 19
- MapLibre GL and react-map-gl
- National Park Service, California State Parks, and OpenStreetMap source data
- Dexie/IndexedDB for local saved trails and active GPS records
- NextAuth with optional Google sign-in
- PostgreSQL for optional authenticated preferences
- Vitest and Playwright

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3007`.

Required for live NPS alerts:

```env
NPS_API_KEY=your_nps_api_key
```

Optional account, database, and AI variables are documented in `.env.example`. Secret values must remain server-only and `.env.local` must never be committed.

The optional grounded Trail Guide can retrieve official park guidance through a
private CPU embedding service and PostgreSQL with `pgvector`. Setup, ingestion,
and operational controls are documented in [`docs/rag-architecture.md`](docs/rag-architecture.md).

Destination lookup and community trail discovery default to the public Nominatim and Overpass endpoints for low-volume, user-triggered beta use. Responses are cached, nearby coordinates are rounded to roughly 100-meter precision, and both endpoints can be replaced through `NOMINATIM_BASE_URL` and `OVERPASS_BASE_URL`. Use self-hosted or appropriately contracted providers before traffic exceeds the public-service policies.

Local map development uses Stadia Maps without an API key. Before production, upgrade to a commercial Stadia plan and add the production domain in Stadia’s authentication settings. `NEXT_PUBLIC_MAP_STYLE_URL` is an optional public style override, not a secret.

## Verification

```bash
npm run lint
npm test
npm run licenses:check
npm run build
npm run test:e2e
```

Regenerate dependency notices after package changes:

```bash
npm run licenses
```

## Data, privacy, and licensing

- Catalog sourcing rules: [`docs/catalog-sources.md`](docs/catalog-sources.md)
- Third-party software notices: [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)
- Public app disclosures: `/legal/terms`, `/legal/privacy`, `/legal/data-sources`, `/legal/licenses`, and `/legal/copyright`
- Profile controls can clear scoped search, planning, saved-trail, GPS, preference, cache, and in-app location-choice data from the current browser.
- California-first engineering and counsel gates: [`docs/legal/US_CALIFORNIA_LAUNCH_READINESS.md`](docs/legal/US_CALIFORNIA_LAUNCH_READINESS.md)
- Current original Odyssey code is proprietary except where stated otherwise. Earlier revisions released under MIT remain subject to those earlier grants. See [`LICENSE`](LICENSE).

The public OpenStreetMap Standard Tile endpoint is not used by the interactive map. Before production, activate a commercial Stadia plan with domain authentication, complete a jurisdiction-specific legal review, designate a dedicated legal/privacy contact, and implement moderation before enabling community uploads.
