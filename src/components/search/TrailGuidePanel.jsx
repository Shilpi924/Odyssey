'use client';

import { useState } from 'react';

export default function TrailGuidePanel({ trailId, trailName }) {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const ask = async event => {
    event.preventDefault();
    const value = question.trim();
    if (!value || status === 'loading') return;
    setStatus('loading');
    setError('');
    try {
      const response = await fetch('/api/trail-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trailId, question: value }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Trail Guide is unavailable');
      setResult(body);
      setStatus('done');
    } catch (requestError) {
      setError(requestError.message || 'Trail Guide is unavailable');
      setStatus('error');
    }
  };

  return (
    <section className="mt-4 rounded-xl border border-sky-400/20 bg-sky-950/15 p-3" aria-labelledby={`trail-guide-${trailId}`}>
      <h4 id={`trail-guide-${trailId}`} className="text-sm font-bold text-sky-200">Ask the grounded Trail Guide</h4>
      <p className="mt-1 text-xs leading-relaxed text-[var(--app-muted)]">
        Answers use Odyssey&apos;s verified record and available official sources. Always confirm current conditions.
      </p>
      <form onSubmit={ask} className="mt-3 flex gap-2">
        <label className="sr-only" htmlFor={`trail-question-${trailId}`}>Question about {trailName}</label>
        <input
          id={`trail-question-${trailId}`}
          value={question}
          onChange={event => setQuestion(event.target.value)}
          maxLength={1200}
          placeholder="Permits, access, or suitability?"
          className="min-w-0 flex-1 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)] focus:border-sky-400"
        />
        <button
          type="submit"
          disabled={!question.trim() || status === 'loading'}
          className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {status === 'loading' ? 'Checking…' : 'Ask'}
        </button>
      </form>

      {error && <p role="alert" className="mt-3 text-xs text-amber-300">{error}</p>}
      {result && (
        <div className="mt-3 border-t border-sky-400/15 pt-3" aria-live="polite">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--app-text)]">{result.answer}</p>
          {result.grounding === 'insufficient' && (
            <p className="mt-2 text-xs text-amber-300">Official evidence was insufficient for a fully grounded answer.</p>
          )}
          {result.citations?.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--app-muted)]">Sources</p>
              <ul className="mt-1 space-y-1">
                {result.citations.map(citation => (
                  <li key={citation.id} className="text-xs">
                    <a href={citation.url} target="_blank" rel="noreferrer" className="font-semibold text-sky-300 underline underline-offset-2">
                      [{citation.id}] {citation.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.alerts?.length > 0 && (
            <p className="mt-3 text-xs font-semibold text-amber-300">
              {result.alerts.length} current park {result.alerts.length === 1 ? 'alert was' : 'alerts were'} included.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
