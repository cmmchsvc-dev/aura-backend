"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatRateLimiter = void 0;
exports.createRateLimiter = createRateLimiter;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
function createRateLimiter() {
    return (0, express_rate_limit_1.default)({
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
        max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
        message: { error: 'Too many requests. Please try again later.' },
        standardHeaders: true,
        legacyHeaders: false,
    });
}
/** Stricter limiter for AI chat (expensive calls) */
exports.chatRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60000,
    max: 10,
    message: { error: 'Chat rate limit reached. Please wait a moment.' },
});
//# sourceMappingURL=rateLimiter.js.map