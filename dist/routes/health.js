"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const validation_1 = require("../middleware/validation");
const firebase_1 = require("../services/firebase");
const crisisDetection_1 = require("../services/crisisDetection");
exports.healthRouter = (0, express_1.Router)();
const healthDataSchema = zod_1.z.object({
    heartRate: zod_1.z.number().min(30).max(250).optional(),
    steps: zod_1.z.number().min(0).optional(),
    stressLevel: zod_1.z.number().min(0).max(100).optional(),
    sleepQuality: zod_1.z.number().min(0).max(100).optional(),
    sleepDuration: zod_1.z.number().min(0).max(24).optional(),
    mood: zod_1.z.number().min(1).max(10).optional(),
    isExercising: zod_1.z.boolean().optional(),
    source: zod_1.z.enum(['apple_health', 'google_fit', 'manual']).default('manual'),
    timestamp: zod_1.z.string().datetime().optional(),
});
const batchSchema = zod_1.z.object({
    data: zod_1.z.array(healthDataSchema).max(100),
});
// Submit single health data point
exports.healthRouter.post('/data', (0, validation_1.validate)(healthDataSchema), async (req, res) => {
    try {
        const db = (0, firebase_1.getFirestore)();
        const data = {
            ...req.body,
            timestamp: req.body.timestamp ? new Date(req.body.timestamp) : new Date(),
        };
        await db.collection('users').doc(req.userId).collection('healthData').add(data);
        // Also update latest biometrics
        if (data.heartRate || data.stressLevel) {
            await db.collection('users').doc(req.userId).collection('biometrics').add({
                heartRate: data.heartRate,
                stressLevel: data.stressLevel ? getStressLabel(data.stressLevel) : undefined,
                sleepQuality: data.sleepQuality ? getSleepLabel(data.sleepQuality) : undefined,
                steps: data.steps,
                timestamp: data.timestamp,
            });
        }
        // Check for crisis
        if (data.heartRate) {
            const crisis = await (0, crisisDetection_1.checkBiometricCrisis)(req.userId, data.heartRate, data.isExercising || false);
            if (crisis) {
                await (0, crisisDetection_1.triggerCrisisCircle)(req.userId, crisis);
                res.json({ saved: true, crisis: true, message: 'Crisis alert triggered' });
                return;
            }
        }
        res.json({ saved: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to save health data' });
    }
});
// Batch submit health data
exports.healthRouter.post('/batch', (0, validation_1.validate)(batchSchema), async (req, res) => {
    try {
        const db = (0, firebase_1.getFirestore)();
        const batch = db.batch();
        for (const item of req.body.data) {
            const ref = db.collection('users').doc(req.userId).collection('healthData').doc();
            batch.set(ref, {
                ...item,
                timestamp: item.timestamp ? new Date(item.timestamp) : new Date(),
            });
        }
        await batch.commit();
        res.json({ saved: true, count: req.body.data.length });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to save batch data' });
    }
});
// Get health data for a time range
exports.healthRouter.get('/data', async (req, res) => {
    try {
        const db = (0, firebase_1.getFirestore)();
        const days = parseInt(req.query.days) || 7;
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const snap = await db
            .collection('users').doc(req.userId)
            .collection('healthData')
            .where('timestamp', '>', since)
            .orderBy('timestamp', 'desc')
            .limit(500)
            .get();
        const data = snap.docs.map(d => ({
            id: d.id,
            ...d.data(),
            timestamp: d.data().timestamp?.toDate?.()?.toISOString(),
        }));
        res.json({ data, count: data.length });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch health data' });
    }
});
// Get latest biometrics summary
exports.healthRouter.get('/latest', async (req, res) => {
    try {
        const db = (0, firebase_1.getFirestore)();
        const snap = await db
            .collection('users').doc(req.userId)
            .collection('biometrics')
            .orderBy('timestamp', 'desc')
            .limit(1)
            .get();
        if (snap.empty) {
            res.json({ data: null });
            return;
        }
        res.json({ data: snap.docs[0].data() });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch latest biometrics' });
    }
});
function getStressLabel(level) {
    if (level < 25)
        return 'low';
    if (level < 50)
        return 'moderate';
    if (level < 75)
        return 'high';
    return 'very_high';
}
function getSleepLabel(quality) {
    if (quality < 25)
        return 'poor';
    if (quality < 50)
        return 'fair';
    if (quality < 75)
        return 'good';
    return 'excellent';
}
//# sourceMappingURL=health.js.map