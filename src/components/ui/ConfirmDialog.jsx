'use client';

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  busy = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  const confirmStyle = tone === 'danger'
    ? 'bg-rose-500 text-white hover:bg-rose-400'
    : 'bg-[var(--app-primary)] text-[var(--app-bg)] hover:opacity-90';

  return (
    <div className="fixed inset-0 z-[1300] grid place-items-center bg-slate-950/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-description">
      <div className="w-full max-w-md rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 text-[var(--app-text)] shadow-2xl sm:p-7">
        <div className={`grid h-11 w-11 place-items-center rounded-2xl text-xl ${tone === 'danger' ? 'bg-rose-500/15 text-rose-300' : 'bg-[var(--app-primary)]/15 text-[var(--app-primary)]'}`} aria-hidden="true">
          {tone === 'danger' ? '!' : '✓'}
        </div>
        <h2 id="confirm-dialog-title" className="mt-4 text-2xl font-semibold tracking-tight">{title}</h2>
        <p id="confirm-dialog-description" className="mt-2 text-sm leading-relaxed text-[var(--app-muted)]">{description}</p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" disabled={busy} onClick={onCancel} className="rounded-xl border border-[var(--app-border)] px-4 py-2.5 text-sm font-semibold hover:bg-[var(--app-surface-raised)] disabled:opacity-50">
            {cancelLabel}
          </button>
          <button type="button" disabled={busy} onClick={onConfirm} className={`rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50 ${confirmStyle}`}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
