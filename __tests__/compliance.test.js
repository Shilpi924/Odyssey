// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { OSM_MAP_STYLE } from '../src/lib/map-style.js';

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

  it('uses attributed OpenStreetMap tiles and keeps them network-only', () => {
    expect(OSM_MAP_STYLE.sources.osm.tiles).toEqual(['https://tile.openstreetmap.org/{z}/{x}/{y}.png']);
    expect(OSM_MAP_STYLE.sources.osm.attribution).toContain('OpenStreetMap contributors');
    const worker = readFileSync(join(root, 'src/app/sw.js'), 'utf8');
    expect(worker).toContain("url.hostname === 'tile.openstreetmap.org'");
    expect(worker).toContain('new NetworkOnly()');
  });

  it('ships public legal pages and generated third-party notices', () => {
    for (const route of ['terms', 'privacy', 'data-sources', 'licenses', 'copyright']) {
      expect(existsSync(join(root, `src/app/legal/${route}/page.js`))).toBe(true);
    }
    expect(readFileSync(join(root, 'src/app/layout.js'), 'utf8')).toContain('<LegalFooter />');
    expect(readFileSync(join(root, 'THIRD_PARTY_NOTICES.md'), 'utf8')).toContain('# Odyssey Third-Party Notices');
    expect(readFileSync(join(root, 'public/THIRD_PARTY_NOTICES.txt'), 'utf8')).toBe(readFileSync(join(root, 'THIRD_PARTY_NOTICES.md'), 'utf8'));
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
