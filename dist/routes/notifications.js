"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const validation_1 = require("../middleware/validation");
const firebase_1 = require("../services/firebase");
exports.notificationsRouter = (0, express_1.Router)();
const tokenSchema = zod_1.z.object({
    token: zod_1.z.string().min(1),
    platform: zod_1.z.enum(['ios', 'android']),
});
// Register push notification token
exports.notificationsRouter.post('/token', (0, validation_1.validate)(tokenSchema), async (req, res) => {
    try {
        const db = (0, firebase_1.getFirestore)();
        await db.collection('users').doc(req.userId).set({
            pushToken: req.body.token,
            pushPlatform: req.body.platform,
        }, { merge: true });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to register token' });
    }
});
// Get notification preferences
exports.notificationsRouter.get('/preferences', async (req, res) => {
    try {
        const db = (0, firebase_1.getFirestore)();
        const doc = await db.collection('users').doc(req.userId).get();
        const prefs = doc.data()?.notificationPreferences || {
            dailyCheckIn: true,
            patternAlerts: true,
            crisisAlerts: true,
            weeklySummary: true,
            quietHoursStart: 22,
            quietHoursEnd: 7,
        };
        res.json(prefs);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch preferences' });
    }
});
// Update notification preferences
exports.notificationsRouter.put('/preferences', async (req, res) => {
    try {
        const db = (0, firebase_1.getFirestore)();
        await db.collection('users').doc(req.userId).set({
            notificationPreferences: req.body,
        }, { merge: true });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update preferences' });
    }
});
//# sourceMappingURL=notifications.js.map