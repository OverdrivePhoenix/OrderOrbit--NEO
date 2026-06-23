import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import fs from "fs";
import path from "path";
import { encrypt, decrypt } from "./encryption";

const FALLBACK_FILE_PATH = path.join(process.cwd(), "src", "data", "credentials_local.json");

// Firebase Web Configuration provided by user
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAPxZpS9itwOnZUyuPKmqB2ShMEcam7vgk",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "rder-orbit.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "rder-orbit",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "rder-orbit.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "154930310663",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:154930310663:web:edacea2fc2e8861f3704a2",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-T8SJ004R76"
};

let app;
let firestoreDb: any = null;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  firestoreDb = getFirestore(app);
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
      // Fallback to local file if Firestore read fails
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
      // Fallback to local file if Firestore write fails
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
