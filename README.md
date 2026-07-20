# 🥾 Odyssey

**Odyssey is an AI-powered hiking companion that helps you find the right trail for your group, weather, ability, and interests.** Built around explicitly sourced data, it provides offline maps, live GPS tracking, and personalized recommendations while maintaining transparency about what's verified and what requires checking.

Official trail coverage includes Yosemite National Park and Mount Diablo State Park, while OpenStreetMap community data expands destination and nearby discovery without relying on scraped AllTrails content or invented provider facts.

## Feature Status

| Feature | Status | Notes |
|---------|--------|-------|
| **Core Features** | | |
| Hero Section with Value Proposition | ✅ Complete | Clear messaging with 3 action buttons |
| Interactive Map Preview | ✅ Complete | Maplibre GL with sample trails |
| Hiking-First Repositioning | ✅ Complete | Hiking as primary, supporting features optional |
| Custom Hiking Logo | ✅ Complete | Mountain-themed SVG logo |
| Navigation Labels | ✅ Complete | Discover, Map, Track, Saved, Profile |
| Plan a Hike Flow | ✅ Complete | Location, group, difficulty, weather, recommendations |
| Enhanced Recommendation Cards | ✅ Complete | Duration, surface, dog policy, weather, accessibility |
| AI Transparency Section | ✅ Complete | "Why this recommendation" with match factors |
| Safety Center | ✅ Complete | Emergency call, GPS, battery, trip sharing |
| GPS Quality Display | ✅ Complete | Signal strength, accuracy indicators |
| Explicit Tracking Controls | ✅ Complete | Start, Pause, Resume, Finish, Discard |
| Offline Mode Clarity | ✅ Complete | Download details, verification test |
| Accessibility Personalization | ✅ Complete | Comprehensive outdoor-specific options |
| **AI & Architecture** | | |
| Simplified AI Routing | ✅ Complete | Deterministic classifier + safety rules |
| Structured AI Output | ✅ Complete | Zod validation for all AI responses |
| Fallback Behavior | ✅ Complete | Graceful degradation for API failures |
| Caching & Cost Controls | ✅ Complete | Cache manager with cost tracking |
| AI Evaluation Suite | ✅ Complete | Test cases for quality validation |
| **Security & Privacy** | ✅ Complete | |
| API Key Protection | ✅ Complete | Server-side only, environment variables |
| User Data Privacy | ✅ Complete | Auth, encryption, consent, retention policies |
| **Documentation** | | |
| README Feature Status | ✅ Complete | This table |
| Screenshots & Architecture | ⏳ Pending | To be added |
| README Improvements | ⏳ Pending | Final polish |

## Current capabilities

The app intentionally returns a coverage message outside its verified catalog. It does not currently claim offline basemap downloads, live weather, crowds, pollen, air quality, community reviews, or arbitrary global trail coverage.

## Screenshots

*Note: Screenshots will be added to showcase the following key features:*

- **Homepage Hero**: Clear value proposition with "Find hikes near me", "Plan for my group", and "Open saved offline maps" buttons
- **Interactive Map Preview**: Maplibre GL map showing sample trails with difficulty markers
- **Plan a Hike Flow**: Complete flow from location input to ranked recommendations
- **Enhanced Recommendation Cards**: Trail cards with duration, surface, dog policy, weather, and accessibility info
- **AI Transparency**: "Why this recommendation" section with match factors
- **Safety Center**: Emergency call, GPS status, battery, and trip sharing
- **Hike Tracker**: Start, Pause, Resume, Finish controls with live stats
- **Offline Download**: Download details, progress, and verification

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Homepage   │  │   Search     │  │   Plan Hike  │          │
│  │   (Next.js)  │  │   (Next.js)  │  │   (Next.js)  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                  │                  │                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Components  │  │  Components  │  │  Components  │          │
│  │  - Logo      │  │  - TrailCard │  │  - Safety    │          │
│  │  - MapPreview│  │  - SearchBar │  │  - Tracker   │          │
│  │  - Hero      │  │  - Filters   │  │  - Offline   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API Layer                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  /api/search │  │ /api/plan    │  │ /api/auth    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                  │                  │                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Cache Mgr   │  │  Fallback    │  │  Cost Ctrl   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      External Services                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Claude AI  │  │  Google      │  │   OpenStreet │          │
│  │  (Anthropic) │  │  Places API  │  │     Map      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   NPS API    │  │  CA State    │  │  MapLibre    │          │
│  │              │  │  Parks API   │  │     GL       │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Data Storage                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  PostgreSQL  │  │ IndexedDB    │  │  LocalStorage│          │
│  │  (User Data) │  │  (Offline)   │  │  (Cache)     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

**Key Architecture Decisions:**

1. **Server-Side API Keys**: All external API keys are stored in environment variables and only accessed server-side
2. **Caching Layer**: Cache manager reduces API costs and improves performance
3. **Fallback System**: Graceful degradation when external services are unavailable
4. **Structured Validation**: Zod schemas ensure AI responses match expected formats
5. **Offline-First**: IndexedDB stores trail data for offline access
6. **Security**: NextAuth.js handles authentication with secure session management

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
