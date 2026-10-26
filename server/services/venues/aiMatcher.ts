import { z } from "zod";

/**
 * Venue record structure for AI matching
 */
export interface VenueRecordForAI {
  name: string;
  locale?: string;
  tel?: string;
  website?: string;
  address?: {
    street?: string;
    city?: string;
    zip?: string;
    countryCode?: string;
  };
  lat?: number;
  lng?: number;
}

/**
 * Match result from AI matcher
 */
export const matchResultSchema = z.object({
  sameVenue: z.boolean(),
  confidence: z.number().min(0).max(1),
  reasons: z.string().optional(),
});

export type MatchResult = z.infer<typeof matchResultSchema>;

/**
 * AI Matcher interface
 */
export interface AIMatcher {
  matchVenues(
    sourceVenue: VenueRecordForAI,
    candidate: VenueRecordForAI
  ): Promise<MatchResult>;
}

/**
 * Stub implementation of AI matcher
 * This will be replaced with a Gemini-based implementation
 */
class StubAIMatcher implements AIMatcher {
  async matchVenues(
    sourceVenue: VenueRecordForAI,
    candidate: VenueRecordForAI
  ): Promise<MatchResult> {
    // Simple heuristic fallback
    const nameSimilarity = this.calculateNameSimilarity(
      sourceVenue.name,
      candidate.name
    );
    const telMatch = sourceVenue.tel && candidate.tel && sourceVenue.tel === candidate.tel;
    const websiteMatch =
      sourceVenue.website && candidate.website && sourceVenue.website === candidate.website;

    let confidence = 0;
    if (telMatch && websiteMatch) {
      confidence = 0.9;
    } else if (telMatch || websiteMatch) {
      confidence = 0.7;
    } else if (nameSimilarity > 0.8) {
      confidence = 0.5;
    }

    return {
      sameVenue: confidence >= 0.7,
      confidence,
      reasons: `Name similarity: ${nameSimilarity}, Tel match: ${telMatch}, Website match: ${websiteMatch}`,
    };
  }

  private calculateNameSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    if (s1 === s2) return 1;
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;
    // Simple Levenshtein-like approximation
    const longer = s1.length > s2.length ? s1 : s2;
    const editDistance = this.levenshteinDistance(s1, s2);
    return 1 - editDistance / (longer.length || 1);
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  }
}

/**
 * Gemini-based AI matcher implementation
 * TODO: Implement with AI SDK when available
 */
class GeminiAIMatcher implements AIMatcher {
  async matchVenues(
    sourceVenue: VenueRecordForAI,
    candidate: VenueRecordForAI
  ): Promise<MatchResult> {
    // Check if Gemini API key is configured
    const apiKey = process.env.AI_GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("AI_GEMINI_API_KEY not configured, falling back to stub matcher");
      const stub = new StubAIMatcher();
      return stub.matchVenues(sourceVenue, candidate);
    }

    try {
      // TODO: Implement actual Gemini API call using AI SDK
      // For now, use stub implementation
      const stub = new StubAIMatcher();
      return stub.matchVenues(sourceVenue, candidate);
    } catch (error) {
      console.error("AI matching error:", error);
      // Fallback to stub on error
      const stub = new StubAIMatcher();
      return stub.matchVenues(sourceVenue, candidate);
    }
  }
}

// Export singleton instance
let matcherInstance: AIMatcher | null = null;

export function getAIMatcher(): AIMatcher {
  if (!matcherInstance) {
    const useGemini = !!process.env.AI_GEMINI_API_KEY;
    matcherInstance = useGemini
      ? new GeminiAIMatcher()
      : new StubAIMatcher();
  }
  return matcherInstance;
}

