interface Pattern {
    id: string;
    type: 'time_of_day' | 'day_of_week' | 'pre_event' | 'correlation';
    description: string;
    confidence: number;
    metric: string;
    trigger?: string;
    dayOfWeek?: number;
    hourOfDay?: number;
    discoveredAt: Date;
    occurrences: number;
}
interface Prediction {
    description: string;
    type: string;
    confidence: number;
    suggestedAction: string;
    expiresAt: Date;
}
/**
 * Main analysis function — run periodically for each user
 */
export declare function analyzeUserPatterns(userId: string): Promise<{
    patterns: Pattern[];
    predictions: Prediction[];
}>;
/**
 * Build the user's Wellness Profile summary
 */
export declare function getWellnessProfile(userId: string): Promise<{
    patterns: Pattern[];
    predictions: Prediction[];
    summary: string;
    dataPoints: number;
    profileStrength: 'building' | 'emerging' | 'established' | 'strong';
}>;
export {};
//# sourceMappingURL=patternDetection.d.ts.map