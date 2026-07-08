// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildUserContext, distanceMiles } from '../src/app/api/smart-search/route.js';

describe('Smart Search API Helpers', () => {
  describe('distanceMiles', () => {
    it('calculates the correct distance between two points', () => {
      // New York City to Los Angeles (approx 2445 miles)
      const dist = distanceMiles(40.7128, -74.0060, 34.0522, -118.2437);
      expect(dist).toBeCloseTo(2445, -1);
    });

    it('returns 0 for the same point', () => {
      const dist = distanceMiles(40.7128, -74.0060, 40.7128, -74.0060);
      expect(dist).toBe(0);
    });
  });

  describe('buildUserContext', () => {
    it('returns empty string if no preferences', () => {
      expect(buildUserContext({})).toBe('');
    });

    it('formats hiking difficulty correctly', () => {
      const context = buildUserContext({
        hiking: { difficulty: ['Easy', 'Moderate'] }
      });
      expect(context).toContain('Preferred difficulty: Easy, Moderate');
    });

    it('formats accessibility and group dynamics correctly', () => {
      const context = buildUserContext({
        groupDynamics: 'My 80-year-old mom',
        accessibility: ['Wheelchair Accessible', 'Paved Paths']
      });
      expect(context).toContain('Group Dynamics: My 80-year-old mom');
      expect(context).toContain('Accessibility Needs: Wheelchair Accessible, Paved Paths');
    });

    it('handles a complete profile', () => {
      const context = buildUserContext({
        hiking: { difficulty: ['Strenuous'], features: ['Shaded', 'Water'], length: 'long', elevation: 'steep' },
        activityLevel: 'Extreme',
        travelWith: 'Solo',
        groupDynamics: 'Just me pushing limits',
        interests: ['Hiking', 'Nature'],
        accessibility: []
      });
      expect(context).toContain('Preferred difficulty: Strenuous');
      expect(context).toContain('Features: shaded, water');
      expect(context).toContain('Length: 5–10 miles');
      expect(context).toContain('Elevation: steep');
      expect(context).toContain('Fitness: Extreme');
      expect(context).toContain('With: Solo');
      expect(context).toContain('Group Dynamics: Just me pushing limits');
      expect(context).toContain('Interests: Hiking, Nature');
    });
  });
});
