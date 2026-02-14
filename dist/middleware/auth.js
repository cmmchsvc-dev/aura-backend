"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const firebase_1 = require("../services/firebase");
const logger_1 = require("../services/logger");
/**
 * Firebase Auth middleware — validates Bearer token
 */
async function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Missing or invalid authorization header' });
        return;
    }
    const token = authHeader.split('Bearer ')[1];
    try {
        const decoded = await (0, firebase_1.getAuth)().verifyIdToken(token);
        req.userId = decoded.uid;
        req.userEmail = decoded.email;
        next();
    }
    catch (error) {
        logger_1.logger.warn('Auth token verification failed:', error);
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}
//# sourceMappingURL=auth.js.map