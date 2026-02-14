"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crisisRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const validation_1 = require("../middleware/validation");
const firebase_1 = require("../services/firebase");
const crisisDetection_1 = require("../services/crisisDetection");
exports.crisisRouter = (0, express_1.Router)();
const contactSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    phone: zod_1.z.string().regex(/^\+?[\d\s-()]+$/, 'Invalid phone number'),
    email: zod_1.z.string().email(),
    relationship: zod_1.z.string().max(50).optional(),
});
// Add crisis contact
exports.crisisRouter.post('/contacts', (0, validation_1.validate)(contactSchema), async (req, res) => {
    try {
        const db = (0, firebase_1.getFirestore)();
        const contactsSnap = await db
            .collection('users').doc(req.userId)
            .collection('crisisContacts')
            .count()
            .get();
        if (contactsSnap.data().count >= 3) {
            res.status(400).json({ error: 'Maximum 3 crisis contacts allowed' });
            return;
        }
        const ref = await db
            .collection('users').doc(req.userId)
            .collection('crisisContacts')
            .add({ ...req.body, addedAt: new Date() });
        res.json({ id: ref.id, success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to add contact' });
    }
});
// Get crisis contacts
exports.crisisRouter.get('/contacts', async (req, res) => {
    try {
        const db = (0, firebase_1.getFirestore)();
        const snap = await db
            .collection('users').doc(req.userId)
            .collection('crisisContacts')
            .get();
        const contacts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        res.json({ contacts });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch contacts' });
    }
});
// Remove crisis contact
exports.crisisRouter.delete('/contacts/:contactId', async (req, res) => {
    try {
        const db = (0, firebase_1.getFirestore)();
        await db
            .collection('users').doc(req.userId)
            .collection('crisisContacts')
            .doc(req.params.contactId)
            .delete();
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to remove contact' });
    }
});
// Manual "I need help" button
exports.crisisRouter.post('/help', async (req, res) => {
    try {
        await (0, crisisDetection_1.manualCrisisTrigger)(req.userId);
        res.json({
            success: true,
            message: 'Your Crisis Circle has been notified. Help is on the way.',
            resources: crisisDetection_1.CRISIS_RESOURCES,
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to trigger alert' });
    }
});
// Get crisis resources
exports.crisisRouter.get('/resources', async (_req, res) => {
    res.json({ resources: crisisDetection_1.CRISIS_RESOURCES });
});
//# sourceMappingURL=crisis.js.map