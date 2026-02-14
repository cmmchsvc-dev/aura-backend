interface CrisisEvent {
    userId: string;
    type: 'biometric' | 'chat' | 'manual' | 'sleep';
    severity: 'warning' | 'alert' | 'critical';
    description: string;
    timestamp: Date;
    notifiedContacts: boolean;
}
/**
 * Check biometric data for crisis indicators
 */
export declare function checkBiometricCrisis(userId: string, heartRate: number, isExercising: boolean): Promise<CrisisEvent | null>;
/**
 * Check for severe sleep disruption
 */
export declare function checkSleepCrisis(userId: string): Promise<CrisisEvent | null>;
/**
 * Trigger Crisis Circle notifications
 */
export declare function triggerCrisisCircle(userId: string, event: CrisisEvent): Promise<void>;
/**
 * Manual "I need help" trigger
 */
export declare function manualCrisisTrigger(userId: string): Promise<void>;
export declare const CRISIS_RESOURCES: {
    lifeline: {
        name: string;
        number: string;
        type: string;
    };
    textLine: {
        name: string;
        number: string;
        type: string;
        keyword: string;
    };
    emergency: {
        name: string;
        number: string;
        type: string;
    };
    trevorProject: {
        name: string;
        number: string;
        type: string;
    };
    samhsa: {
        name: string;
        number: string;
        type: string;
    };
};
export {};
//# sourceMappingURL=crisisDetection.d.ts.map