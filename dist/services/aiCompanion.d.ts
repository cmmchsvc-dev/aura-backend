export declare function detectCrisisLanguage(message: string): boolean;
/**
 * Main chat function — orchestrates context gathering and AI response
 */
export declare function chat(userId: string, message: string, conversationId: string): Promise<{
    response: string;
    isCrisis: boolean;
    conversationId: string;
}>;
/**
 * Get guided exercise content
 */
export declare function getGuidedExercise(type: 'breathing' | 'grounding' | 'body_scan' | 'gratitude'): string;
//# sourceMappingURL=aiCompanion.d.ts.map