import LegalPage from '@/components/legal/LegalPage';

export const metadata = { title: 'Copyright — Odyssey' };

export default function CopyrightPage() {
  return (
    <LegalPage title="Copyright & Takedown" description="How to report material that you believe should not appear in Odyssey.">
      <section><h2>Report a concern</h2><p>Send the operator a report through <a href="https://github.com/Shilpi924">GitHub</a> containing your contact information, the exact Odyssey URL or repository path, identification of the protected work, the reason you believe the use is unauthorized, and any supporting source or ownership information.</p></section>
      <section><h2>Review process</h2><p>The operator will review sufficiently detailed reports, preserve relevant records, and remove or restrict material when appropriate. False or incomplete claims may delay review. This process is not a representation that a statutory DMCA agent has been designated; that designation and a dedicated legal contact must be completed before accepting public uploads at scale.</p></section>
      <section><h2>Community uploads</h2><p>Public community review and photo uploads are disabled until contributor terms, moderation, reporting, consent, retention, and repeat-infringer processes are implemented.</p></section>
    </LegalPage>
  );
}
