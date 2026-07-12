// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { getTrailsByParkId } from '../src/lib/trails/catalog.js';
import { catalogCompleteness, findDuplicateCandidates } from '../src/lib/trails/catalog-quality.js';
import { evaluateSearchBenchmarks } from '../src/lib/trails/evaluate-search.js';
import { SEARCH_BENCHMARKS } from '../src/lib/trails/search-benchmarks.js';

describe('catalog operational quality', () => {
  const trails = getTrailsByParkId('nps-yose');

  it('has no obvious duplicate Yosemite records', () => {
    expect(findDuplicateCandidates(trails)).toEqual([]);
  });

  it('meets the pilot completeness floor', () => {
    expect(trails.every(trail => catalogCompleteness(trail) >= 0.8)).toBe(true);
  });

  it('passes supported Yosemite benchmark expectations', () => {
    const yosemiteBenchmarks = SEARCH_BENCHMARKS.filter(item => /yosemite|half-dome/.test(item.id));
    const report = evaluateSearchBenchmarks(yosemiteBenchmarks);
    expect(report.metrics.unsupportedCases).toBe(0);
    expect(report.passesInitialTargets).toBe(true);
  });
});

