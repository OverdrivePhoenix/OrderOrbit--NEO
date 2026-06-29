/**
 * Firebase Admin SDK — server-side only.
 * Uses a service account key so it bypasses ALL Firestore Security Rules.
 * Never import this in client components.
 */
import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

const DB_FILE_PATH = path.join(process.cwd(), "src", "data", "db.json");

function readLocalDbJson(): any {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const data = fs.readFileSync(DB_FILE_PATH, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Failed to read local db.json:", error);
  }
  return {};
}

function writeLocalDbJson(data: any): void {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error("Failed to write local db.json:", error);
  }
}

const isAdminFirebaseConfigured = !!(
  process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
  process.env.FIREBASE_ADMIN_PRIVATE_KEY &&
  process.env.FIREBASE_ADMIN_CLIENT_EMAIL !== "undefined" &&
  process.env.FIREBASE_ADMIN_PRIVATE_KEY !== "undefined"
);

function getAdminApp() {
  if (getApps().length > 0) {
    return getApp();
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
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  }

  // Fallback: unauthenticated (will fail on protected collections, but at least won't crash at init)
  return initializeApp({ projectId });
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}

/**
 * Fetch all documents from a Firestore collection (Admin SDK — no rules).
 */
export async function adminGetCollection(colName: string): Promise<any[]> {
  if (!isAdminFirebaseConfigured) {
    const db = readLocalDbJson();
    return db[colName] || [];
  }
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
  if (!isAdminFirebaseConfigured) {
    const db = readLocalDbJson();
    const list = db[colName] || [];
    return list.find((item: any) => item.id === docId) || null;
  }
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
  if (!isAdminFirebaseConfigured) {
    const db = readLocalDbJson();
    if (!db[colName]) db[colName] = [];
    const idx = db[colName].findIndex((item: any) => item.id === docId);
    const sanitized = sanitize(data);
    if (idx !== -1) {
      if (merge) {
        db[colName][idx] = { ...db[colName][idx], ...sanitized };
      } else {
        db[colName][idx] = { id: docId, ...sanitized };
      }
    } else {
      db[colName].push({ id: docId, ...sanitized });
    }
    writeLocalDbJson(db);
    return;
  }
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
  if (!isAdminFirebaseConfigured) {
    const db = readLocalDbJson();
    if (!db[colName]) db[colName] = [];
    const idx = db[colName].findIndex((item: any) => item.id === docId);
    if (idx !== -1) {
      db[colName][idx] = { ...db[colName][idx], ...sanitize(data) };
      writeLocalDbJson(db);
    }
    return;
  }
  const db = getAdminDb();
  await db.collection(colName).doc(docId).update(sanitize(data));
}

/**
 * Delete a document (Admin SDK).
 */
export async function adminDeleteDoc(colName: string, docId: string): Promise<void> {
  if (!isAdminFirebaseConfigured) {
    const db = readLocalDbJson();
    if (db[colName]) {
      db[colName] = db[colName].filter((item: any) => item.id !== docId);
      writeLocalDbJson(db);
    }
    return;
  }
  const db = getAdminDb();
  await db.collection(colName).doc(docId).delete();
}

/** Strip undefined values — Firestore Admin SDK doesn't accept them */
function sanitize(obj: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      clean[k] =
        v === null
          ? null
          : typeof v === "object" && !Array.isArray(v)
          ? sanitize(v)
          : v;
    }
  }
  return clean;
}
