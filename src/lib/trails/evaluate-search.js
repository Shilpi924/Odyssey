import { SEARCH_QUALITY_TARGETS } from './search-benchmarks';
import { searchCatalog } from './search-engine';

export function evaluateSearchBenchmarks(benchmarks) {
  const cases = benchmarks.map(benchmark => {
    const search = searchCatalog({ query: benchmark.query });
    if (!search) return { id: benchmark.id, supported: false, passed: false, resultIds: [] };
    const resultIds = search.results.map(result => result.trail.id);
    const required = benchmark.mustIncludeTop3 || benchmark.mustIncludeAny || [];
    const relevantHits = required.filter(id => resultIds.slice(0, benchmark.mustIncludeTop3 ? 3 : 10).includes(id)).length;
    const passed = required.length === 0 || relevantHits > 0;
    return { id: benchmark.id, supported: true, passed, resultIds, relevantHits, relevantExpected: required.length };
  });
  const supported = cases.filter(item => item.supported);
  const famousCases = supported.filter(item => item.relevantExpected > 0);
  const famousHits = famousCases.filter(item => item.passed).length;
  const zeroResultCases = supported.filter(item => item.resultIds.length === 0).length;
  const metrics = {
    supportedCases: supported.length,
    unsupportedCases: cases.length - supported.length,
    famousTrailRecall: famousCases.length ? famousHits / famousCases.length : 1,
    zeroResultRate: supported.length ? zeroResultCases / supported.length : 0,
  };
  return {
    cases,
    metrics,
    passesInitialTargets: metrics.famousTrailRecall >= SEARCH_QUALITY_TARGETS.famousTrailRecall
      && metrics.zeroResultRate <= SEARCH_QUALITY_TARGETS.zeroResultRate,
  };
}

