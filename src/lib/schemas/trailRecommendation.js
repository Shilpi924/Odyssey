import { z } from 'zod';

export const TrailRecommendationSchema = z.object({
  placeId: z.string(),
  score: z.number().min(0).max(100),
  summary: z.string().min(1).max(500),
  matchingFactors: z.array(z.string()).max(10),
  concerns: z.array(z.string()).max(10),
  missingInformation: z.array(z.string()).max(10),
  weatherImpact: z.enum(['good', 'caution', 'poor', 'unknown']),
  accessibilityConfidence: z.enum(['confirmed', 'reported', 'estimated', 'unknown']),
});

export const TrailQuerySchema = z.object({
  location: z.string().min(1),
  difficulty: z.enum(['Easy', 'Moderate', 'Strenuous', 'Expert', 'Any']).optional(),
  features: z.array(z.string()).optional(),
  maxLength: z.number().positive().optional(),
  groupDynamics: z.string().optional(),
});

export const SafetyResponseSchema = z.object({
  isSafe: z.boolean(),
  warnings: z.array(z.string()),
  recommendations: z.array(z.string()),
  emergencyContacts: z.array(z.object({
    name: z.string(),
    phone: z.string(),
  })).optional(),
});

export function validateTrailRecommendation(data) {
  try {
    return TrailRecommendationSchema.parse(data);
  } catch (error) {
    console.error('Validation error:', error.errors);
    throw new Error('Invalid trail recommendation format');
  }
}

export function validateTrailQuery(data) {
  try {
    return TrailQuerySchema.parse(data);
  } catch (error) {
    console.error('Validation error:', error.errors);
    throw new Error('Invalid trail query format');
  }
}

export function validateSafetyResponse(data) {
  try {
    return SafetyResponseSchema.parse(data);
  } catch (error) {
    console.error('Validation error:', error.errors);
    throw new Error('Invalid safety response format');
  }
}
