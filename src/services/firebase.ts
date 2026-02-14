import admin from 'firebase-admin';

let db: admin.firestore.Firestore;
let auth: admin.auth.Auth;

export function initializeFirebase(): void {
  if (admin.apps.length > 0) return;

  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });

  db = admin.firestore();
  auth = admin.auth();
}

export function getFirestore(): admin.firestore.Firestore {
  if (!db) throw new Error('Firebase not initialized');
  return db;
}

export function getAuth(): admin.auth.Auth {
  if (!auth) throw new Error('Firebase not initialized');
  return auth;
}

export { admin };
