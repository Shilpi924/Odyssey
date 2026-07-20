'use client';

import TrailGuidePanel from './TrailGuidePanel';

const FEATURE_ICONS = {
  Shaded: '🌳', Sunny: '☀️', Water: '💧', Summit: '🏔️',
  DogFriendly: '🐾', Loop: '🔄', Scenic: '📸', EasyParking: '🚗',
  Wildflowers: '🌸', Alpine: '🧊',
};

const DIFFICULTY_STYLES = {
  Easy: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  Moderate: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  Strenuous: 'border-orange-400/30 bg-orange-400/10 text-orange-300',
  Expert: 'border-rose-400/30 bg-rose-400/10 text-rose-300',
};

function geometryProviderName(source) {
  if (source?.provider === 'ca-state-parks-arcgis') return 'California State Parks';
  if (source?.provider === 'osm') return 'OpenStreetMap';
  return 'Official source';
}

function Metric({ icon, children }) {
  if (!children) return null;
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <span aria-hidden="true">{icon}</span>
      {children}
    </span>
  );
}

export default function TrailResultCard({
  trail,
  index,
  isSelected,
  onSelect,
  cardRef,
  onSave,
  onDownloadOffline,
  isSaved,
  onStartHike,
  onViewMap,
  routeStatus,
  distanceFromUser,
}) {
  const slug = String(trail.placeId || index).replace(/[^a-z0-9-]/gi, '-');
  const headingId = `trail-heading-${slug}`;
  const detailsId = `trail-details-${slug}`;
  const isCommunitySource = trail.sourceKind === 'community';
  const sourceLabel = isCommunitySource ? 'OpenStreetMap' : 'Official';
  const sourceName = isCommunitySource
    ? 'OpenStreetMap contributors'
    : String(trail.sourceAttribution || 'Official source').replace(/^Source:\s*/i, '');
  const rating = Number(trail.rating);
  const reviewCount = Number(trail.userRatingsTotal);
  const hasVerifiedReviews = Number.isFinite(rating) && rating > 0 && Number.isFinite(reviewCount) && reviewCount > 0;

  return (
    <article
      ref={cardRef}
      aria-labelledby={headingId}
      className={`rounded-2xl border bg-[var(--app-surface)] shadow-md transition-colors ${
        isSelected ? 'border-[var(--app-primary)]' : 'border-[var(--app-border)] hover:border-slate-500'
      }`}
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span
            aria-label={`Map marker ${index + 1}`}
            className="mt-0.5 flex h-7 min-w-7 items-center justify-center rounded-lg bg-[var(--app-primary-strong)] px-1.5 text-xs font-bold text-white"
          >
            {index + 1}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 id={headingId} className="min-w-0 flex-1 text-[17px] font-bold leading-tight text-[var(--app-text)]">
                {trail.name}
              </h3>
              <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                <span className="rounded-full border border-[var(--app-border)] bg-[var(--app-raised)] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--app-muted)]">
                  {sourceLabel}
                </span>
                {trail.difficulty && (
                  <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${DIFFICULTY_STYLES[trail.difficulty] || DIFFICULTY_STYLES.Moderate}`}>
                    {trail.difficulty}
                  </span>
                )}
              </div>
            </div>

            {trail.vicinity && <p className="mt-1 truncate text-xs text-[var(--app-muted)]">{trail.vicinity}</p>}

            <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--app-muted)]">
              Source:{' '}
              {trail.sourceUrl ? (
                <a href={trail.sourceUrl} target="_blank" rel="noreferrer" className="font-semibold text-sky-300 underline decoration-sky-300/40 underline-offset-2 hover:text-sky-200">
                  {sourceName}
                </a>
              ) : (
                <span className="font-semibold">{sourceName}</span>
              )}
              {isCommunitySource && ' · Community mapped'}
            </p>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-medium text-slate-300">
              <Metric icon="🥾">{trail.length ? `Trail ${trail.length}` : null}</Metric>
              <Metric icon="↗">{trail.elevationGain}</Metric>
              <Metric icon="⏱️">{trail.estimatedDuration || '2-3h'}</Metric>
              {trail.surface && <Metric icon="🛤️">{trail.surface}</Metric>}
              {trail.dogPolicy && <Metric icon="🐾">{trail.dogPolicy}</Metric>}
              {trail.parking && <Metric icon="🚗">{trail.parking}</Metric>}
              {distanceFromUser != null && <Metric icon="⌖">{distanceFromUser} mi from you · straight-line</Metric>}
              {trail.routeType && <span className="text-[var(--app-muted)]">{trail.routeType}</span>}
            </div>
            
            {/* Weather */}
            {trail.weather && (
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-300">
                <span aria-hidden="true">{trail.weather.icon}</span>
                <span>{trail.weather.condition} · {trail.weather.temp}°F</span>
                <span className="text-[var(--app-muted)]">({trail.weather.forecast})</span>
              </div>
            )}
            
            {/* Accessibility */}
            {trail.accessibility && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {trail.accessibility.wheelchair && <span className="rounded-full bg-emerald-400/10 border border-emerald-400/30 px-2 py-0.5 text-[10px] text-emerald-300">♿ Wheelchair</span>}
                {trail.accessibility.stroller && <span className="rounded-full bg-emerald-400/10 border border-emerald-400/30 px-2 py-0.5 text-[10px] text-emerald-300">👶 Stroller</span>}
                {trail.accessibility.paved && <span className="rounded-full bg-emerald-400/10 border border-emerald-400/30 px-2 py-0.5 text-[10px] text-emerald-300">🛤️ Paved</span>}
              </div>
            )}
            
            {/* Offline status */}
            {trail.offlineAvailable !== undefined && (
              <div className="mt-2 flex items-center gap-1.5 text-xs">
                <span className={`h-2 w-2 rounded-full ${trail.offlineAvailable ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                <span className={trail.offlineAvailable ? 'text-emerald-300' : 'text-slate-400'}>
                  {trail.offlineAvailable ? 'Offline available' : 'Requires connection'}
                </span>
              </div>
            )}
            <p className="mt-2 text-[11px] text-[var(--app-muted)]">
              {hasVerifiedReviews ? `★ ${rating.toFixed(1)} · ${reviewCount.toLocaleString()} verified ${reviewCount === 1 ? 'review' : 'reviews'}` : 'No verified reviews available'}
            </p>
          </div>
        </div>

        <button
          type="button"
          aria-expanded={isSelected}
          aria-controls={detailsId}
          onClick={onSelect}
          className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--app-border)] px-3 text-sm font-semibold text-[var(--app-text)] transition-colors hover:border-[var(--app-primary)] hover:text-[var(--app-primary)]"
        >
          {isSelected ? 'Hide details' : 'View details'}
          <span aria-hidden="true">{isSelected ? '↑' : '↓'}</span>
        </button>

        {isSelected && (
          <div id={detailsId} className="mt-4 border-t border-[var(--app-border)] pt-4">
            {/* AI Recommendation Explanation */}
            {trail.recommendationReason && (
              <div className="mb-4 rounded-xl border border-indigo-400/20 bg-indigo-400/5 px-4 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-indigo-300">Why Odyssey recommends this</span>
                  <span className="text-xs text-indigo-400/70">AI-analyzed</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-300">{trail.recommendationReason}</p>
                {trail.matchFactors && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {trail.matchFactors.map(factor => (
                      <span key={factor} className="rounded-full bg-indigo-400/10 border border-indigo-400/30 px-2 py-0.5 text-[10px] text-indigo-300">
                        ✓ {factor}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {trail.features?.length > 0 && (
              <div className="flex flex-wrap gap-1.5" aria-label="Trail highlights">
                {trail.features.map(feature => (
                  <span key={feature} className="rounded-full bg-[var(--app-raised)] px-2.5 py-1 text-[11px] font-medium text-slate-300">
                    <span aria-hidden="true">{FEATURE_ICONS[feature] || '•'}</span> {feature}
                  </span>
                ))}
              </div>
            )}

            {trail.difficultyMethod?.startsWith('odyssey-') && (
              <p className="mt-3 text-xs leading-relaxed text-amber-200/80">Difficulty is estimated from official route facts.</p>
            )}
            {!trail.difficulty && (
              <p className="mt-3 rounded-xl border border-amber-500/20 bg-amber-950/20 px-3 py-2 text-xs leading-relaxed text-amber-100/80">
                Difficulty and trailhead access are not confirmed. Review the source before starting.
              </p>
            )}
            {routeStatus === 'loading' && <p role="status" className="mt-3 text-xs text-sky-300">Loading route…</p>}
            {routeStatus === 'error' && <p role="status" className="mt-3 text-xs text-amber-300">The route line is temporarily unavailable.</p>}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onViewMap}
                className="min-h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-raised)] px-3 text-sm font-bold text-[var(--app-text)] hover:border-[var(--app-primary)]"
              >
                <span aria-hidden="true">🗺️</span> View map
              </button>
              <button
                type="button"
                onClick={onStartHike}
                className="min-h-11 rounded-xl bg-[var(--app-primary)] px-3 text-sm font-bold text-white hover:opacity-90"
              >
                <span aria-hidden="true">🥾</span> Start hike
              </button>
            </div>

            <button
              type="button"
              onClick={onSave}
              className="mt-2 min-h-10 w-full rounded-xl px-3 text-sm font-semibold text-[var(--app-muted)] hover:bg-[var(--app-raised)] hover:text-[var(--app-text)]"
            >
              <span aria-hidden="true">{isSaved ? '✓' : '🔖'}</span> {isSaved ? 'Saved' : 'Save trail'}
            </button>

            <button
              type="button"
              onClick={onDownloadOffline}
              className="mt-2 min-h-11 w-full rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3 text-sm font-bold text-emerald-200 hover:border-emerald-300/50 hover:bg-emerald-400/15"
            >
              <span aria-hidden="true">↓</span> Download offline
            </button>

            {trail.sourceKind !== 'community' && trail.placeId && (
              <TrailGuidePanel trailId={trail.placeId} trailName={trail.name} />
            )}

            {(trail.sourceAttribution || trail.sourceUrl || trail.geometrySource || trail.access) && (
              <details className="mt-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)]/40 px-3 py-2" onClick={event => event.stopPropagation()}>
                <summary className="cursor-pointer text-xs font-semibold text-[var(--app-muted)]">Source &amp; access</summary>
                <div className="mt-3 flex flex-col gap-1.5 text-xs leading-relaxed text-[var(--app-muted)]">
                  {trail.sourceAttribution && <p>{trail.sourceAttribution}</p>}
                  {trail.geometrySource && <p>Route geometry: {geometryProviderName(trail.geometrySource)}</p>}
                  {trail.access?.permitRequired && <p className="text-amber-300">Permit required</p>}
                  {trail.access?.status && <p>{trail.access.status === 'Unknown' ? 'Current access not listed' : `Access: ${trail.access.status}`}</p>}
                  {trail.sourceUrl && (
                    <a href={trail.sourceUrl} target="_blank" rel="noreferrer" className="font-semibold text-sky-300 underline underline-offset-2">
                      {trail.sourceKind === 'community' ? 'View map record' : 'View official source'}
                    </a>
                  )}
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
