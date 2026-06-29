import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, deleteDoc, collection, getDocs, writeBatch } from "firebase/firestore";
import fs from "fs";
import path from "path";
import { encrypt, decrypt } from "./encryption";

const FALLBACK_FILE_PATH = path.join(process.cwd(), "src", "data", "credentials_local.json");

// Firebase Web Configuration provided by user
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

let app;
export let firestoreDb: any = null;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  // Force long polling to avoid gRPC connection timeouts in serverless functions
  const { initializeFirestore } = require("firebase/firestore");
  try {
    firestoreDb = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });
  } catch (e) {
    firestoreDb = getFirestore(app);
  }
  console.log("Firebase App initialized successfully with projectId:", firebaseConfig.projectId);
} catch (error: any) {
  console.error("Failed to initialize Firebase App SDK:", error.message || error);
  console.warn("Falling back to local credentials file:", FALLBACK_FILE_PATH);
}

// Local file helper functions for fallback mode
function readLocalFallback(): Record<string, { passwordHash: string | null; activationToken: string | null }> {
  try {
    if (!fs.existsSync(FALLBACK_FILE_PATH)) {
      return {};
    }
    const data = fs.readFileSync(FALLBACK_FILE_PATH, "utf8");
    return JSON.parse(data || "{}");
  } catch (error) {
    console.error("Failed to read local credentials fallback:", error);
    return {};
  }
}

function writeLocalFallback(data: Record<string, { passwordHash: string | null; activationToken: string | null }>) {
  try {
    const parentDir = path.dirname(FALLBACK_FILE_PATH);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(FALLBACK_FILE_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error("Failed to write to local credentials fallback:", error);
  }
}

export interface UserCredentials {
  passwordHash: string | null;
  activationToken: string | null;
}

/**
 * Retrieves user credentials (password hash and activation token).
 * Automatically decrypts the values before returning.
 */
export async function getCredentials(userId: string): Promise<UserCredentials | null> {
  if (firestoreDb) {
    try {
      const docRef = doc(firestoreDb, "credentials", userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() || {};
        return {
          passwordHash: data.passwordHash ? decrypt(data.passwordHash) : null,
          activationToken: data.activationToken ? decrypt(data.activationToken) : null,
        };
      }
    } catch (error) {
      console.error("Error reading credentials from Firestore:", error);
    }
  }

  // Fallback mode
  const localDb = readLocalFallback();
  const creds = localDb[userId];
  if (!creds) return null;

  return {
    passwordHash: creds.passwordHash ? decrypt(creds.passwordHash) : null,
    activationToken: creds.activationToken ? decrypt(creds.activationToken) : null,
  };
}

/**
 * Saves user credentials.
 * Automatically encrypts the password hash and activation token before storing them.
 */
export async function saveCredentials(
  userId: string,
  data: { passwordHash?: string | null; activationToken?: string | null }
): Promise<void> {
  const encryptedData: Record<string, any> = {};
  if (data.passwordHash !== undefined) {
    encryptedData.passwordHash = data.passwordHash ? encrypt(data.passwordHash) : null;
  }
  if (data.activationToken !== undefined) {
    encryptedData.activationToken = data.activationToken ? encrypt(data.activationToken) : null;
  }

  if (firestoreDb) {
    try {
      const docRef = doc(firestoreDb, "credentials", userId);
      await setDoc(docRef, encryptedData, { merge: true });
      return;
    } catch (error) {
      console.error("Error writing credentials to Firestore:", error);
    }
  }

  // Fallback mode
  const localDb = readLocalFallback();
  const existing = localDb[userId] || { passwordHash: null, activationToken: null };
  localDb[userId] = {
    passwordHash: data.passwordHash !== undefined ? encryptedData.passwordHash : existing.passwordHash,
    activationToken: data.activationToken !== undefined ? encryptedData.activationToken : existing.activationToken,
  };
  writeLocalFallback(localDb);
}

/**
 * Deletes user credentials.
 */
export async function deleteCredentials(userId: string): Promise<void> {
  if (firestoreDb) {
    try {
      const docRef = doc(firestoreDb, "credentials", userId);
      await deleteDoc(docRef);
      return;
    } catch (error) {
      console.error("Error deleting credentials from Firestore:", error);
    }
  }

  // Fallback mode
  const localDb = readLocalFallback();
  if (localDb[userId]) {
    delete localDb[userId];
    writeLocalFallback(localDb);
  }
}

/**
 * Fetches all documents from a Firestore collection.
 */
export async function getFirestoreCollection(colName: string): Promise<any[]> {
  if (!firestoreDb) return [];
  try {
    const colRef = collection(firestoreDb, colName);
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
  } catch (error) {
    console.error(`Error reading collection ${colName} from Firestore:`, error);
    return [];
  }
}

/**
 * Sanitizes an object recursively to be compatible with Firestore.
 * Removes any undefined values or replaces them with null.
 */
export function sanitizeForFirestore(val: any): any {
  if (val === undefined || val === null) {
    return null;
  }
  if (Array.isArray(val)) {
    return val.map(sanitizeForFirestore);
  }
  if (typeof val === "object") {
    const clean: Record<string, any> = {};
    for (const key of Object.keys(val)) {
      if (val[key] !== undefined) {
        clean[key] = sanitizeForFirestore(val[key]);
      }
    }
    return clean;
  }
  return val;
}

/**
 * Syncs an array of items to a Firestore collection, handling additions, updates, and deletions.
 */
export async function syncCollectionToFirestore(colName: string, items: any[]): Promise<void> {
  if (!firestoreDb) return;
  try {
    const colRef = collection(firestoreDb, colName);
    const snapshot = await getDocs(colRef);
    const existingIds = new Set(snapshot.docs.map((d) => d.id));
    const currentIds = new Set(items.map((i) => i.id));

    const batch = writeBatch(firestoreDb);

    // Set/update current items (sanitized of undefined properties)
    for (const item of items) {
      const docRef = doc(firestoreDb, colName, item.id);
      batch.set(docRef, sanitizeForFirestore(item));
    }

    // Delete items no longer present
    for (const id of existingIds) {
      if (!currentIds.has(id)) {
        const docRef = doc(firestoreDb, colName, id);
        batch.delete(docRef);
      }
    }

    await batch.commit();
  } catch (error) {
    console.error(`Error syncing collection ${colName} to Firestore:`, error);
  }
}

interface OtpEntry {
  otp: string;
  expiresAt: number;
}

// Module-level in-memory store (only reliable within the same serverless instance)
const localOtps = new Map<string, OtpEntry>();

/**
 * Saves a 6-digit OTP for an email, expiring in 5 minutes.
 * Always uses the lowercase-trimmed email as the key for consistency.
 */
export async function saveOtp(email: string, otp: string): Promise<void> {
  // CRITICAL: key must always be identical between save and verify
  const key = email.toLowerCase().trim();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  // Always also store in memory as a same-instance fallback
  localOtps.set(key, { otp, expiresAt });

  if (firestoreDb) {
    try {
      const docRef = doc(firestoreDb, "otps", key);
      await setDoc(docRef, { otp, expiresAt });
    } catch (error) {
      console.error("Error saving OTP to Firestore (memory fallback active):", error);
    }
  }
}

/**
 * Verifies and consumes the OTP for an email.
 * Checks Firestore first, then falls back to in-memory Map.
 * Returns true if valid, false otherwise.
 */
export async function verifyOtp(email: string, otp: string): Promise<boolean> {
  // CRITICAL: must use same normalization as saveOtp
  const key = email.toLowerCase().trim();
  const now = Date.now();

  if (firestoreDb) {
    try {
      const docRef = doc(firestoreDb, "otps", key);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && data.otp === otp && data.expiresAt > now) {
          await deleteDoc(docRef); // consume
          localOtps.delete(key);  // also clear memory
          return true;
        }
        // Found but wrong code or expired
        return false;
      }
      // Not in Firestore — fall through to memory (same-instance request)
    } catch (error) {
      console.error("Error verifying OTP from Firestore (trying memory fallback):", error);
    }
  }

  // In-memory fallback (works when save and verify hit the same serverless instance)
  const entry = localOtps.get(key);
  if (entry && entry.otp === otp && entry.expiresAt > now) {
    localOtps.delete(key);
    return true;
  }

  return false;
}
