"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insightsRouter = void 0;
const express_1 = require("express");
const patternDetection_1 = require("../services/patternDetection");
exports.insightsRouter = (0, express_1.Router)();
// Get wellness profile
exports.insightsRouter.get('/profile', async (req, res) => {
    try {
        const profile = await (0, patternDetection_1.getWellnessProfile)(req.userId);
        res.json(profile);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch wellness profile' });
    }
});
// Trigger pattern analysis
exports.insightsRouter.post('/analyze', async (req, res) => {
    try {
        const result = await (0, patternDetection_1.analyzeUserPatterns)(req.userId);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to analyze patterns' });
    }
});
//# sourceMappingURL=insights.js.map