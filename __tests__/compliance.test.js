// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { MAP_CONFIG } from '../src/lib/map-style.js';

const root = resolve(import.meta.dirname, '..');

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.(js|jsx|mjs)$/.test(entry.name) ? [path] : [];
  });
}

describe('provider and licensing guardrails', () => {
  it('does not contain removed provider endpoints or fabricated metrics in runtime source', () => {
    const runtime = sourceFiles(join(root, 'src')).map(path => readFileSync(path, 'utf8')).join('\n');
    for (const forbidden of [
      'maps.googleapis.com/maps/api/place',
      'maps.googleapis.com/maps/api/geocode',
      'maps.googleapis.com/maps/api/elevation',
      'maps.googleapis.com/maps/api/staticmap',
      'basemaps.cartocdn.com',
      'elevation-tiles-prod',
      'api.open-meteo.com',
      'estimatedWeeklyVisitors',
    ]) expect(runtime).not.toContain(forbidden);
  });

  it('uses the hosted Stadia style without a public OSM tile fallback', () => {
    expect(MAP_CONFIG).toMatchObject({ provider: 'stadia', providerName: 'Stadia Maps' });
    expect(MAP_CONFIG.styleUrl).toBe('https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json');
    const worker = readFileSync(join(root, 'src/app/sw.js'), 'utf8');
    expect(worker).not.toContain('tile.openstreetmap.org');
    expect(worker).toContain("url.hostname.endsWith('.stadiamaps.com')");
    expect(worker).toContain('new NetworkOnly()');
    expect(readFileSync(join(root, 'src/lib/map-style.js'), 'utf8')).not.toContain('tile.openstreetmap.org');
  });

  it('ships public legal pages and generated third-party notices', () => {
    for (const route of ['terms', 'privacy', 'data-sources', 'licenses', 'copyright']) {
      expect(existsSync(join(root, `src/app/legal/${route}/page.js`))).toBe(true);
    }
    expect(readFileSync(join(root, 'src/app/layout.js'), 'utf8')).toContain('<LegalFooter />');
    expect(readFileSync(join(root, 'THIRD_PARTY_NOTICES.md'), 'utf8')).toContain('# Odyssey Third-Party Notices');
    expect(readFileSync(join(root, 'public/THIRD_PARTY_NOTICES.txt'), 'utf8')).toBe(readFileSync(join(root, 'THIRD_PARTY_NOTICES.md'), 'utf8'));
  });

  it('keeps California-first privacy and launch gates explicit', () => {
    const privacy = readFileSync(join(root, 'src/app/legal/privacy/page.js'), 'utf8');
    const terms = readFileSync(join(root, 'src/app/legal/terms/page.js'), 'utf8');
    const readiness = readFileSync(join(root, 'docs/legal/US_CALIFORNIA_LAUNCH_READINESS.md'), 'utf8');
    for (const disclosure of ['Do Not Track', 'Global Privacy Control', 'Location choice', 'Access, correction, and deletion', 'Changes to this notice']) {
      expect(privacy).toContain(disclosure);
    }
    expect(terms).toContain('not directed to children under 13');
    expect(readiness).toContain('Strongly recommended counsel review');
    expect(readiness).toContain('There is no general rule that a software publisher must hire an attorney');
    expect(readiness).toContain('Required engineering and operator decisions before production');
  });

  it('gates precise location and exposes scoped local-data controls', () => {
    const search = readFileSync(join(root, 'src/app/search/page.js'), 'utf8');
    const saved = readFileSync(join(root, 'src/app/saved/page.js'), 'utf8');
    const theme = readFileSync(join(root, 'src/components/ThemeProvider.jsx'), 'utf8');
    const controls = readFileSync(join(root, 'src/components/privacy/LocalDataControls.jsx'), 'utf8');
    expect(search).toContain("setStatus('location')");
    expect(search).toContain('Allow location &amp; start');
    expect(saved).toContain('locationAllowed');
    expect(theme).toContain('hasLocationAccess()');
    expect(controls).toContain('Clear all local data');
    expect(controls).not.toContain('localStorage.clear()');
  });

  it('keeps secrets out of the browser-facing environment template', () => {
    const template = readFileSync(join(root, '.env.example'), 'utf8');
    expect(template).not.toContain('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY');
    expect(template).not.toMatch(/=[A-Za-z0-9_-]{12,}/);
  });

  it('does not present generated trail guidance as firsthand or current knowledge', () => {
    const chatRoute = readFileSync(join(root, 'src/app/api/trail-chat/route.js'), 'utf8');
    const searchPage = readFileSync(join(root, 'src/app/search/page.js'), 'utf8');
    expect(chatRoute).toContain('Never claim personal experience or current local knowledge');
    expect(chatRoute).not.toContain('advice from experience');
    expect(searchPage).not.toContain('I know ${trail.name} well');
  });
});
