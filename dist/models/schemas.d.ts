/**
 * Firestore document schemas — TypeScript interfaces
 * These mirror the Firestore document structure.
 */
export interface UserProfile {
    displayName: string;
    email: string;
    personality: 'warm' | 'direct' | 'playful' | 'zen';
    goals: ('reduce_stress' | 'better_sleep' | 'more_active' | 'emotional_support')[];
    subscription: 'free' | 'plus' | 'pro';
    onboardingComplete: boolean;
    pushToken?: string;
    pushPlatform?: 'ios' | 'android';
    createdAt: Date;
    notificationPreferences?: NotificationPreferences;
}
export interface NotificationPreferences {
    dailyCheckIn: boolean;
    patternAlerts: boolean;
    crisisAlerts: boolean;
    weeklySummary: boolean;
    quietHoursStart: number;
    quietHoursEnd: number;
}
export interface HealthDataPoint {
    heartRate?: number;
    steps?: number;
    stressLevel?: number;
    sleepQuality?: number;
    sleepDuration?: number;
    mood?: number;
    isExercising?: boolean;
    source: 'apple_health' | 'google_fit' | 'manual';
    timestamp: Date;
}
export interface BiometricSnapshot {
    heartRate?: number;
    stressLevel?: 'low' | 'moderate' | 'high' | 'very_high';
    sleepQuality?: 'poor' | 'fair' | 'good' | 'excellent';
    steps?: number;
    timestamp: Date;
}
export interface Conversation {
    lastMessage: string;
    updatedAt: Date;
}
export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}
export interface WellnessPattern {
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
export interface Prediction {
    description: string;
    type: string;
    confidence: number;
    suggestedAction: string;
    expiresAt: Date;
    createdAt: Date;
}
export interface CrisisContact {
    name: string;
    phone: string;
    email: string;
    relationship?: string;
    addedAt: Date;
}
export interface CrisisEvent {
    userId: string;
    type: 'biometric' | 'chat' | 'manual' | 'sleep';
    severity: 'warning' | 'alert' | 'critical';
    description: string;
    timestamp: Date;
    notifiedContacts: boolean;
    contactsNotified?: string[];
}
//# sourceMappingURL=schemas.d.ts.map