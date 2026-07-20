/**
 * AI Evaluation Suite
 * Tests and validates AI recommendations for quality and accuracy
 */

export class AIEvaluationSuite {
  constructor() {
    this.testCases = this.generateTestCases();
    this.results = [];
    this.metrics = {
      totalTests: 0,
      passed: 0,
      failed: 0,
      averageScore: 0,
      byCategory: {},
    };
  }

  /**
   * Generate test cases for AI evaluation
   */
  generateTestCases() {
    return [
      // Difficulty matching tests
      {
        id: 'diff-1',
        category: 'difficulty',
        description: 'Easy hike for beginners',
        input: {
          location: 'San Francisco',
          difficulty: 'Easy',
          groupDynamics: 'Beginners',
        },
        expected: {
          maxDifficulty: 'Easy',
          minDifficulty: 'Easy',
          features: ['EasyParking', 'Shaded'],
        },
      },
      {
        id: 'diff-2',
        category: 'difficulty',
        description: 'Expert scramble for experienced hikers',
        input: {
          location: 'Yosemite',
          difficulty: 'Expert',
          groupDynamics: 'Experienced hikers',
        },
        expected: {
          maxDifficulty: 'Expert',
          minDifficulty: 'Strenuous',
          features: ['Summit', 'Alpine'],
        },
      },

      // Feature matching tests
      {
        id: 'feat-1',
        category: 'features',
        description: 'Dog-friendly trail',
        input: {
          location: 'Portland',
          features: ['DogFriendly'],
        },
        expected: {
          mustInclude: ['DogFriendly'],
          shouldInclude: ['EasyParking'],
        },
      },
      {
        id: 'feat-2',
        category: 'features',
        description: 'Waterfall trail',
        input: {
          location: 'Columbia River Gorge',
          features: ['Water'],
        },
        expected: {
          mustInclude: ['Water'],
          shouldInclude: ['Scenic'],
        },
      },

      // Accessibility tests
      {
        id: 'acc-1',
        category: 'accessibility',
        description: 'Wheelchair accessible trail',
        input: {
          location: 'Seattle',
          accessibility: ['Wheelchair Accessible', 'Paved Paths'],
        },
        expected: {
          maxIncline: '5%',
          surface: 'Paved',
          width: 'Wide',
        },
      },
      {
        id: 'acc-2',
        category: 'accessibility',
        description: 'Stroller friendly trail',
        input: {
          location: 'Denver',
          accessibility: ['Stroller Friendly', 'No Stairs'],
        },
        expected: {
          maxIncline: '10%',
          surface: 'Paved or Gravel',
          features: ['EasyParking'],
        },
      },

      // Distance tests
      {
        id: 'dist-1',
        category: 'distance',
        description: 'Short hike under 2 miles',
        input: {
          location: 'Austin',
          maxLength: 2,
        },
        expected: {
          maxLength: 2.5, // Allow some margin
          minLength: 0.5,
        },
      },
      {
        id: 'dist-2',
        category: 'distance',
        description: 'Long hike 10+ miles',
        input: {
          location: 'Grand Canyon',
          maxLength: 15,
          minLength: 10,
        },
        expected: {
          maxLength: 20,
          minLength: 8,
        },
      },

      // Group dynamics tests
      {
        id: 'group-1',
        category: 'group',
        description: 'Family with young children',
        input: {
          location: 'San Diego',
          groupDynamics: 'Family with children ages 5-8',
        },
        expected: {
          maxDifficulty: 'Moderate',
          features: ['Shaded', 'EasyParking'],
          length: 'short to medium',
        },
      },
      {
        id: 'group-2',
        category: 'group',
        description: 'Older adults group',
        input: {
          location: 'Phoenix',
          groupDynamics: 'Older adults 65+',
        },
        expected: {
          maxDifficulty: 'Easy',
          features: ['Shaded', 'EasyParking'],
          elevation: 'flat to gentle',
        },
      },

      // Safety tests
      {
        id: 'safety-1',
        category: 'safety',
        description: 'Safety warnings for extreme weather',
        input: {
          location: 'Death Valley',
          weather: 'Extreme heat',
        },
        expected: {
          mustIncludeWarning: true,
          warningType: 'heat',
        },
      },
      {
        id: 'safety-2',
        category: 'safety',
        description: 'Safety warnings for steep terrain',
        input: {
          location: 'Mount Rainier',
          difficulty: 'Expert',
        },
        expected: {
          mustIncludeWarning: true,
          warningType: 'terrain',
        },
      },
    ];
  }

  /**
   * Run a single test case
   */
  async runTest(testCase, aiFunction) {
    try {
      const result = await aiFunction(testCase.input);
      const evaluation = this.evaluateResult(result, testCase.expected);
      
      return {
        testCaseId: testCase.id,
        category: testCase.category,
        description: testCase.description,
        passed: evaluation.passed,
        score: evaluation.score,
        details: evaluation.details,
        result,
      };
    } catch (error) {
      return {
        testCaseId: testCase.id,
        category: testCase.category,
        description: testCase.description,
        passed: false,
        score: 0,
        details: { error: error.message },
        result: null,
      };
    }
  }

  /**
   * Evaluate AI result against expected output
   */
  evaluateResult(result, expected) {
    let passed = true;
    let score = 0;
    let details = {};

    // Check if result has recommendations
    if (!result || !result.recommendations || result.recommendations.length === 0) {
      return {
        passed: false,
        score: 0,
        details: { error: 'No recommendations returned' },
      };
    }

    const recommendations = result.recommendations;
    const firstRec = recommendations[0];

    // Evaluate based on expected criteria
    if (expected.maxDifficulty) {
      const difficultyMatch = this.checkDifficulty(firstRec, expected.maxDifficulty);
      details.difficultyMatch = difficultyMatch;
      score += difficultyMatch ? 20 : 0;
      passed = passed && difficultyMatch;
    }

    if (expected.mustInclude) {
      const hasFeatures = expected.mustInclude.every(f => 
        firstRec.features?.includes(f) || 
        firstRec.matchFactors?.includes(f)
      );
      details.featureMatch = hasFeatures;
      score += hasFeatures ? 20 : 0;
      passed = passed && hasFeatures;
    }

    if (expected.maxLength) {
      const lengthMatch = firstRec.length <= expected.maxLength;
      details.lengthMatch = lengthMatch;
      score += lengthMatch ? 20 : 0;
      passed = passed && lengthMatch;
    }

    if (expected.mustIncludeWarning) {
      const hasWarning = result.warnings?.length > 0;
      details.warningMatch = hasWarning;
      score += hasWarning ? 20 : 0;
      passed = passed && hasWarning;
    }

    // Check for explanation/transparency
    const hasExplanation = firstRec.summary || firstRec.recommendationReason;
    details.hasExplanation = hasExplanation;
    score += hasExplanation ? 10 : 0;

    // Check for source citations
    const hasSource = firstRec.sourceUrl || firstRec.sourceAttribution;
    details.hasSource = hasSource;
    score += hasSource ? 10 : 0;

    return {
      passed,
      score,
      details,
    };
  }

  /**
   * Check if difficulty matches expected
   */
  checkDifficulty(trail, maxDifficulty) {
    const difficultyOrder = ['Easy', 'Moderate', 'Strenuous', 'Expert'];
    const trailIndex = difficultyOrder.indexOf(trail.difficulty);
    const maxIndex = difficultyOrder.indexOf(maxDifficulty);
    
    return trailIndex <= maxIndex;
  }

  /**
   * Run all test cases
   */
  async runAllTests(aiFunction) {
    this.results = [];
    this.metrics = {
      totalTests: this.testCases.length,
      passed: 0,
      failed: 0,
      averageScore: 0,
      byCategory: {},
    };

    for (const testCase of this.testCases) {
      const result = await this.runTest(testCase, aiFunction);
      this.results.push(result);

      // Update metrics
      if (result.passed) {
        this.metrics.passed++;
      } else {
        this.metrics.failed++;
      }

      // Category metrics
      if (!this.metrics.byCategory[result.category]) {
        this.metrics.byCategory[result.category] = {
          total: 0,
          passed: 0,
          failed: 0,
          averageScore: 0,
        };
      }
      this.metrics.byCategory[result.category].total++;
      if (result.passed) {
        this.metrics.byCategory[result.category].passed++;
      } else {
        this.metrics.byCategory[result.category].failed++;
      }
    }

    // Calculate average scores
    const totalScore = this.results.reduce((sum, r) => sum + r.score, 0);
    this.metrics.averageScore = totalScore / this.results.length;

    Object.keys(this.metrics.byCategory).forEach(category => {
      const categoryResults = this.results.filter(r => r.category === category);
      const categoryScore = categoryResults.reduce((sum, r) => sum + r.score, 0);
      this.metrics.byCategory[category].averageScore = categoryScore / categoryResults.length;
    });

    return this.metrics;
  }

  /**
   * Generate evaluation report
   */
  generateReport() {
    const report = {
      summary: this.metrics,
      testResults: this.results,
      recommendations: this.generateRecommendations(),
      timestamp: new Date().toISOString(),
    };

    return report;
  }

  /**
   * Generate recommendations based on test results
   */
  generateRecommendations() {
    const recommendations = [];

    if (this.metrics.averageScore < 70) {
      recommendations.push('Overall AI performance needs improvement');
    }

    Object.keys(this.metrics.byCategory).forEach(category => {
      const catMetrics = this.metrics.byCategory[category];
      if (catMetrics.averageScore < 60) {
        recommendations.push(`${category} category needs attention`);
      }
    });

    const failedTests = this.results.filter(r => !r.passed);
    if (failedTests.length > 0) {
      recommendations.push(`${failedTests.length} test cases failed. Review details.`);
    }

    return recommendations;
  }

  /**
   * Save report to file (for debugging)
   */
  saveReport() {
    const report = this.generateReport();
    console.log('=== AI Evaluation Report ===');
    console.log(JSON.stringify(report, null, 2));
    return report;
  }
}

// Singleton instance
export const aiEvaluationSuite = new AIEvaluationSuite();

/**
 * Quick evaluation function
 */
export async function quickEvaluate(aiFunction) {
  const suite = new AIEvaluationSuite();
  const metrics = await suite.runAllTests(aiFunction);
  suite.saveReport();
  return metrics;
}
