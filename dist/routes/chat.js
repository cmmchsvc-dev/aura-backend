"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const uuid_1 = require("uuid");
const validation_1 = require("../middleware/validation");
const rateLimiter_1 = require("../middleware/rateLimiter");
const aiCompanion_1 = require("../services/aiCompanion");
const crisisDetection_1 = require("../services/crisisDetection");
const firebase_1 = require("../services/firebase");
exports.chatRouter = (0, express_1.Router)();
const chatSchema = zod_1.z.object({
    message: zod_1.z.string().min(1).max(2000),
    conversationId: zod_1.z.string().optional(),
});
const exerciseSchema = zod_1.z.object({
    type: zod_1.z.enum(['breathing', 'grounding', 'body_scan', 'gratitude']),
});
// Send a chat message
exports.chatRouter.post('/message', rateLimiter_1.chatRateLimiter, (0, validation_1.validate)(chatSchema), async (req, res) => {
    try {
        const { message, conversationId } = req.body;
        const convId = conversationId || (0, uuid_1.v4)();
        // Check subscription limits for free tier
        const db = (0, firebase_1.getFirestore)();
        const userDoc = await db.collection('users').doc(req.userId).get();
        const subscription = userDoc.data()?.subscription || 'free';
        if (subscription === 'free') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const msgCount = await db
                .collection('users').doc(req.userId)
                .collection('conversations').doc(convId)
                .collection('messages')
                .where('role', '==', 'user')
                .where('timestamp', '>', today)
                .count()
                .get();
            if (msgCount.data().count >= 5) {
                res.status(429).json({
                    error: 'Daily message limit reached',
                    upgrade: true,
                    message: "You've used your 5 free messages today. Upgrade to Plus for unlimited conversations. 💜",
                });
                return;
            }
        }
        const result = await (0, aiCompanion_1.chat)(req.userId, message, convId);
        // If crisis detected in chat, also trigger crisis circle
        if (result.isCrisis) {
            await (0, crisisDetection_1.triggerCrisisCircle)(req.userId, {
                userId: req.userId,
                type: 'chat',
                severity: 'critical',
                description: 'Crisis language detected in chat',
                timestamp: new Date(),
                notifiedContacts: false,
            });
        }
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to process message' });
    }
});
// Get conversation history
exports.chatRouter.get('/history/:conversationId', async (req, res) => {
    try {
        const db = (0, firebase_1.getFirestore)();
        const snap = await db
            .collection('users').doc(req.userId)
            .collection('conversations').doc(req.params.conversationId)
            .collection('messages')
            .orderBy('timestamp', 'asc')
            .limit(100)
            .get();
        const messages = snap.docs.map(d => ({
            id: d.id,
            ...d.data(),
            timestamp: d.data().timestamp?.toDate?.()?.toISOString(),
        }));
        res.json({ messages });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});
// List conversations
exports.chatRouter.get('/conversations', async (req, res) => {
    try {
        const db = (0, firebase_1.getFirestore)();
        const snap = await db
            .collection('users').doc(req.userId)
            .collection('conversations')
            .orderBy('updatedAt', 'desc')
            .limit(20)
            .get();
        const conversations = snap.docs.map(d => ({
            id: d.id,
            ...d.data(),
            updatedAt: d.data().updatedAt?.toDate?.()?.toISOString(),
        }));
        res.json({ conversations });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});
// Get guided exercise
exports.chatRouter.post('/exercise', (0, validation_1.validate)(exerciseSchema), async (req, res) => {
    const content = (0, aiCompanion_1.getGuidedExercise)(req.body.type);
    res.json({ content, type: req.body.type });
});
//# sourceMappingURL=chat.js.map