import LegalPage from '@/components/legal/LegalPage';

export const metadata = { title: 'Data Sources — Odyssey' };

export default function DataSourcesPage() {
  return (
    <LegalPage title="Data Sources & Attribution" description="Where trail facts, conditions, geometry, and maps come from—and what Odyssey does not infer.">
      <section><h2>National Park Service</h2><p>Yosemite trail facts, access notes, park alerts, and boundaries are sourced from the <a href="https://www.nps.gov/subjects/digital/nps-data-api.htm">U.S. National Park Service</a> and linked official NPS pages. U.S. federal government works are generally not copyrighted in the United States, but NPS pages can contain third-party material, trademarks, or other restrictions. Source: National Park Service. Always verify the current official page.</p></section>
      <section><h2>OpenStreetMap</h2><p>Interactive basemap data and available trail relation geometry are © OpenStreetMap contributors and offered under the <a href="https://www.openstreetmap.org/copyright">Open Database License (ODbL)</a>. The app requests identified OSM relations rather than treating an arbitrary nearby path as a trail route. Odyssey’s source records retain the OSM relation identifier where geometry is available.</p></section>
      <section><h2>Tile-use boundary</h2><p>The current interactive prototype uses OpenStreetMap Standard Tiles with visible attribution and a network-only service-worker rule. It does not bulk download or prefetch tiles for offline use. Before substantial commercial traffic, the operator must use self-hosted tiles or a provider whose service agreement fits the expected traffic and product use.</p></section>
      <section><h2>Odyssey classifications</h2><p>Odyssey may add first-party aliases, entity links, completeness scoring, or normalized difficulty labels. The catalog records the method and source. Ratings, review counts, crowd estimates, air quality, pollen, route geometry, closures, and access status are not manufactured when unavailable.</p></section>
      <section><h2>Current exclusions</h2><p>Google Places, Google Geocoding, Google Elevation, CARTO basemaps, Mapzen terrain, and Open-Meteo weather are not used in the current displayed trail-search flow. AllTrails content is not scraped, copied, or used as a result provider.</p></section>
    </LegalPage>
  );
}
