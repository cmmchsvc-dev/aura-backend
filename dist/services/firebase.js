"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.admin = void 0;
exports.initializeFirebase = initializeFirebase;
exports.getFirestore = getFirestore;
exports.getAuth = getAuth;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
exports.admin = firebase_admin_1.default;
let db;
let auth;
function initializeFirebase() {
    if (firebase_admin_1.default.apps.length > 0)
        return;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    firebase_admin_1.default.initializeApp({
        credential: firebase_admin_1.default.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            privateKey,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        }),
    });
    db = firebase_admin_1.default.firestore();
    auth = firebase_admin_1.default.auth();
}
function getFirestore() {
    if (!db)
        throw new Error('Firebase not initialized');
    return db;
}
function getAuth() {
    if (!auth)
        throw new Error('Firebase not initialized');
    return auth;
}
//# sourceMappingURL=firebase.js.map