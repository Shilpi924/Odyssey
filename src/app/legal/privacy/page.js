import LegalPage from '@/components/legal/LegalPage';

export const metadata = { title: 'Privacy — Odyssey' };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Notice" description="What Odyssey processes today, where it stays, and which providers may receive it.">
      <section><h2>Information processed</h2><p>Odyssey may process search terms, trail preferences, theme and accessibility settings, saved trail records, approximate or precise device location, and GPS points recorded during an active hike. If you sign in, the authentication provider may return basic account information such as name, email address, profile image, and an account identifier.</p></section>
      <section><h2>Local device storage</h2><p>Saved trail facts, active hike records, GPS points, search history, display preferences, and short-lived verified search results may be stored in localStorage, sessionStorage, cookies, IndexedDB, or the service worker cache on your device. Interactive basemap resources may use ordinary browser and provider caching but are not intentionally packaged for offline use. Browser controls or clearing site data can remove local records.</p></section>
      <section><h2>Server processing</h2><p>Account preferences may be stored in Odyssey’s database when an authenticated user chooses to save them. Anonymous hike routes and community reviews are not accepted by the current production routes. Server logs may temporarily contain ordinary request and error metadata needed for security and reliability.</p></section>
      <section><h2>Third parties</h2><ul><li>Google may process sign-in information when Google authentication is enabled. Opening an external Google Maps directions link sends the selected coordinates and normal network information to Google.</li><li>National Park Service APIs provide official park alerts and boundary data.</li><li>Stadia Maps provides the interactive basemap and receives ordinary network metadata such as IP address, user agent, origin, and referrer. OpenStreetMap infrastructure may receive ordinary network metadata when identified route relation geometry is requested.</li><li>Anthropic may receive the selected trail facts, a question, and conversation context only when the optional Trail Guide or refinement feature is used and configured.</li></ul></section>
      <section><h2>Purpose, retention, and choices</h2><p>Information is used to provide search, preferences, saved trails, local tracking, optional assistance, security, and troubleshooting. Local information remains until you remove it or clear browser data. Account preferences remain until deleted or the service is retired. Do not submit sensitive personal information in free-text search or AI fields.</p></section>
      <section><h2>Contact</h2><p>To request access, correction, or deletion of server-side account information, contact the operator through <a href="https://github.com/Shilpi924">GitHub</a>. Identity verification may be required. This notice should be reviewed again before collecting community content, payments, analytics, advertising identifiers, or cloud GPS histories.</p></section>
    </LegalPage>
  );
}
