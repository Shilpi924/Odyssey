import LegalPage from '@/components/legal/LegalPage';

export const metadata = { title: 'Terms of Use — Odyssey' };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use" description="The conditions for using this early-stage trail discovery and local GPS tool.">
      <section><h2>Use of Odyssey</h2><p>Odyssey provides informational trail discovery, planning, saved trail facts, and local device tracking. You may use it only lawfully and must not interfere with the service, bypass access controls, overload data providers, or use automated collection against the app or its providers.</p></section>
      <section><h2>Outdoor safety</h2><p>Odyssey is not an emergency, rescue, navigation, medical, weather, or official park service. Trail access, permits, hazards, closures, weather, fire, water, and route conditions can change after data is published. Check the National Park Service and other responsible authorities, carry appropriate navigation and emergency equipment, and use your own judgment. Call local emergency services when needed.</p></section>
      <section><h2>Coverage and recommendations</h2><p>Verified catalog coverage is currently limited to Yosemite National Park. Rankings and filters help organize sourced records; they do not guarantee suitability, safety, accessibility, or availability for a particular person or group. Unknown or unavailable facts are intentionally left unknown rather than estimated.</p></section>
      <section><h2>Accounts and saved information</h2><p>Some account and preference functions require third-party authentication. Saved trails and active GPS records are stored locally in the browser unless a future feature clearly asks for permission to upload them. You are responsible for access to your device and account.</p></section>
      <section><h2>Third-party services and rights</h2><p>Maps, park data, route geometry, authentication, and optional AI features may rely on third parties under their own terms. Attribution and license details are listed on the Data Sources and Licenses pages. Odyssey does not grant rights in third-party material, U.S. government works, trademarks, or earlier code releases beyond the rights their owners or applicable licenses provide.</p></section>
      <section><h2>Availability and liability</h2><p>The service is provided as available and may change, be suspended, contain errors, or lose network access. To the maximum extent allowed by applicable law, the operator disclaims implied warranties and is not liable for indirect or consequential loss. Nothing here excludes rights or liability that cannot legally be excluded.</p></section>
      <section><h2>Changes and contact</h2><p>Material changes will be dated on this page. Questions can be submitted through <a href="https://github.com/Shilpi924">the operator’s GitHub profile</a>.</p></section>
    </LegalPage>
  );
}
