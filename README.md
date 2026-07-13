# 🥾 Odyssey

Odyssey is an early-stage trail discovery and local GPS tool built around explicitly sourced catalog data. Verified search coverage currently focuses on Yosemite National Park and includes Half Dome, El Capitan, and other official trail records without relying on scraped AllTrails content or guessed provider results.

## Current capabilities

- Verified Yosemite trail search with difficulty and feature filters
- National Park Service alerts and source links
- OpenStreetMap trail relation geometry where a catalog record identifies it
- Interactive MapLibre map using a Stadia Maps vector basemap with visible attribution
- Locally saved trail facts and on-device GPS recording
- Optional authenticated preference storage
- Optional Anthropic-powered questions and refinement over the supplied trail set

The app intentionally returns a coverage message outside its verified catalog. It does not currently claim offline basemap downloads, live weather, crowds, pollen, air quality, community reviews, or arbitrary global trail coverage.

## Technology

- Next.js 16 App Router and React 19
- MapLibre GL and react-map-gl
- National Park Service and OpenStreetMap source data
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
- California-first engineering and counsel gates: [`docs/legal/US_CALIFORNIA_LAUNCH_READINESS.md`](docs/legal/US_CALIFORNIA_LAUNCH_READINESS.md)
- Current original Odyssey code is proprietary except where stated otherwise. Earlier revisions released under MIT remain subject to those earlier grants. See [`LICENSE`](LICENSE).

The public OpenStreetMap Standard Tile endpoint is not used by the interactive map. Before production, activate a commercial Stadia plan with domain authentication, complete a jurisdiction-specific legal review, designate a dedicated legal/privacy contact, and implement moderation before enabling community uploads.
