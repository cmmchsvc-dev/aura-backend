"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const firebase_1 = require("./services/firebase");
const auth_1 = require("./routes/auth");
const chat_1 = require("./routes/chat");
const health_1 = require("./routes/health");
const insights_1 = require("./routes/insights");
const notifications_1 = require("./routes/notifications");
const crisis_1 = require("./routes/crisis");
const auth_2 = require("./middleware/auth");
const rateLimiter_1 = require("./middleware/rateLimiter");
const logger_1 = require("./services/logger");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Initialize Firebase Admin
(0, firebase_1.initializeFirebase)();
// Global middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '1mb' }));
app.use((0, rateLimiter_1.createRateLimiter)());
// Health check (no auth)
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'aura-api', timestamp: new Date().toISOString() });
});
// Protected routes
app.use('/api/auth', auth_1.authRouter);
app.use('/api/chat', auth_2.authMiddleware, chat_1.chatRouter);
app.use('/api/health', auth_2.authMiddleware, health_1.healthRouter);
app.use('/api/insights', auth_2.authMiddleware, insights_1.insightsRouter);
app.use('/api/notifications', auth_2.authMiddleware, notifications_1.notificationsRouter);
app.use('/api/crisis', auth_2.authMiddleware, crisis_1.crisisRouter);
// Error handler
app.use((err, _req, res, _next) => {
    logger_1.logger.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});
app.listen(PORT, () => {
    logger_1.logger.info(`🌌 Aura API running on port ${PORT}`);
});
exports.default = app;
//# sourceMappingURL=index.js.map