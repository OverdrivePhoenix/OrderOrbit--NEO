/**
 * Firebase Admin SDK — server-side only.
 * Uses a service account key so it bypasses ALL Firestore Security Rules.
 * Never import this in client components.
 */
import * as admin from "firebase-admin";
import { getApps } from "firebase-admin/app";

function getAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    "rder-orbit";

  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY
    ? process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n")
    : undefined;

  if (clientEmail && privateKey) {
    // Full service account — bypasses all Firestore Security Rules
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  // Fallback: application default credentials (works on GCP/Firebase Hosting)
  return admin.initializeApp({ projectId });
}

export function getAdminDb() {
  const app = getAdminApp();
  return admin.firestore(app);
}

/**
 * Fetch all documents from a Firestore collection (Admin SDK — no rules).
 */
export async function adminGetCollection(colName: string): Promise<any[]> {
  try {
    const db = getAdminDb();
    const snapshot = await db.collection(colName).get();
    return snapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
  } catch (error) {
    console.error(`Admin: Error reading collection ${colName}:`, error);
    return [];
  }
}

/**
 * Get a single document (Admin SDK).
 */
export async function adminGetDoc(colName: string, docId: string): Promise<any | null> {
  try {
    const db = getAdminDb();
    const snap = await db.collection(colName).doc(docId).get();
    if (!snap.exists) return null;
    return { ...snap.data(), id: snap.id };
  } catch (error) {
    console.error(`Admin: Error reading doc ${colName}/${docId}:`, error);
    return null;
  }
}

/**
 * Set/overwrite a document (Admin SDK).
 */
export async function adminSetDoc(
  colName: string,
  docId: string,
  data: Record<string, any>,
  merge = false
): Promise<void> {
  const db = getAdminDb();
  await db.collection(colName).doc(docId).set(sanitize(data), { merge });
}

/**
 * Update specific fields on a document (Admin SDK).
 */
export async function adminUpdateDoc(
  colName: string,
  docId: string,
  data: Record<string, any>
): Promise<void> {
  const db = getAdminDb();
  await db.collection(colName).doc(docId).update(sanitize(data));
}

/**
 * Delete a document (Admin SDK).
 */
export async function adminDeleteDoc(colName: string, docId: string): Promise<void> {
  const db = getAdminDb();
  await db.collection(colName).doc(docId).delete();
}

/** Strip undefined values — Firestore Admin SDK doesn't accept them */
function sanitize(obj: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) clean[k] = v === null ? null : typeof v === "object" && !Array.isArray(v) ? sanitize(v) : v;
  }
  return clean;
}
