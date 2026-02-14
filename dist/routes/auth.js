"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const firebase_1 = require("../services/firebase");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
exports.authRouter = (0, express_1.Router)();
const profileSchema = zod_1.z.object({
    displayName: zod_1.z.string().min(1).max(50),
    personality: zod_1.z.enum(['warm', 'direct', 'playful', 'zen']),
    goals: zod_1.z.array(zod_1.z.enum(['reduce_stress', 'better_sleep', 'more_active', 'emotional_support'])),
});
// Create/update user profile (called after Firebase Auth sign-up)
exports.authRouter.post('/profile', auth_1.authMiddleware, (0, validation_1.validate)(profileSchema), async (req, res) => {
    try {
        const db = (0, firebase_1.getFirestore)();
        await db.collection('users').doc(req.userId).set({
            ...req.body,
            createdAt: new Date(),
            subscription: 'free',
            onboardingComplete: true,
        }, { merge: true });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create profile' });
    }
});
// Get user profile
exports.authRouter.get('/profile', auth_1.authMiddleware, async (req, res) => {
    try {
        const db = (0, firebase_1.getFirestore)();
        const doc = await db.collection('users').doc(req.userId).get();
        if (!doc.exists) {
            res.status(404).json({ error: 'Profile not found' });
            return;
        }
        res.json(doc.data());
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});
// Delete account and all data
exports.authRouter.delete('/account', auth_1.authMiddleware, async (req, res) => {
    try {
        const db = (0, firebase_1.getFirestore)();
        // Delete user document and subcollections
        const userRef = db.collection('users').doc(req.userId);
        const subcollections = ['conversations', 'healthData', 'biometrics', 'patterns', 'predictions', 'crisisContacts', 'crisisEvents'];
        for (const sub of subcollections) {
            const snap = await userRef.collection(sub).get();
            const batch = db.batch();
            snap.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }
        await userRef.delete();
        res.json({ success: true, message: 'Account and all data deleted' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete account' });
    }
});
//# sourceMappingURL=auth.js.map