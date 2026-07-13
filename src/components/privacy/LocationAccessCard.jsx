export default function LocationAccessCard({
  title = 'Use your location?',
  description = 'Odyssey uses your current position for nearby results. GPS trail history is recorded only after you start a hike and stays on this device.',
  allowLabel = 'Allow location',
  onAllow,
  alternativeLabel,
  onAlternative,
  compact = false,
}) {
  return (
    <div className={`rounded-2xl border border-emerald-400/30 bg-slate-950/95 text-left shadow-2xl ${compact ? 'p-4' : 'p-6'}`}>
      <p className="text-xs font-semibold uppercase tracking-[.16em] text-emerald-300">Location choice</p>
      <h2 className={`${compact ? 'mt-1 text-base' : 'mt-2 text-xl'} font-bold text-white`}>{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">{description}</p>
      <p className="mt-2 text-xs text-slate-500">You can forget this choice later in Profile. Browser-level permission is controlled separately in browser settings.</p>
      <div className={`mt-4 flex ${compact ? 'flex-wrap' : 'flex-col sm:flex-row'} gap-2`}>
        <button type="button" onClick={onAllow} className="rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-bold text-emerald-950 hover:bg-emerald-300">
          {allowLabel}
        </button>
        {alternativeLabel && onAlternative && (
          <button type="button" onClick={onAlternative} className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800">
            {alternativeLabel}
          </button>
        )}
      </div>
    </div>
  );
}
