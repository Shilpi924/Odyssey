import LegalPage from '@/components/legal/LegalPage';

export const metadata = { title: 'Software Licenses — Odyssey' };

export default function LicensesPage() {
  return (
    <LegalPage title="Software & License Notices" description="Odyssey’s code terms do not replace the licenses of its dependencies, data, or earlier releases.">
      <section><h2>Odyssey code</h2><p>The current repository states proprietary terms for original Odyssey code. Earlier repository revisions were published under the MIT License; permissions already granted for those revisions remain governed by that license. The current notice does not claim exclusive rights in third-party software, data, template assets, or U.S. government works.</p></section>
      <section><h2>Dependencies</h2><p>Production dependencies retain their own copyright and license notices. The generated <a href="/THIRD_PARTY_NOTICES.txt">Third-Party Notices file</a> lists installed production packages and includes discovered license and notice text. Regenerate it after dependency changes with the repository’s license script.</p></section>
      <section><h2>Data licenses</h2><p>OpenStreetMap data is licensed separately under ODbL 1.0. National Park Service materials must be evaluated per item because official pages may include third-party content. See Data Sources for direct links and attribution.</p></section>
    </LegalPage>
  );
}
