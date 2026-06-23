import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";

/**
 * Derives a secure 32-byte key from environment encryption secrets.
 * Ensures compatibility with AES-256-CBC regardless of the secret length.
 */
function getEncryptionKey(): Buffer {
  const secret =
    process.env.CREDENTIALS_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    "default-fallback-encryption-key-extremely-long-and-secure-123";
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts cleartext using AES-256-CBC.
 * Returns the format `ivHex:encryptedHex`.
 */
export function encrypt(text: string): string {
  if (!text) return "";
  const iv = crypto.randomBytes(16);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

/**
 * Decrypts a ciphertext in the format `ivHex:encryptedHex` using AES-256-CBC.
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return "";
  try {
    const parts = encryptedText.split(":");
    if (parts.length !== 2) {
      throw new Error("Invalid encrypted format: missing IV or ciphertext segment");
    }
    const iv = Buffer.from(parts[0], "hex");
    const encrypted = parts[1];
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error: any) {
    console.error("Decryption failed:", error.message || error);
    throw new Error("Failed to decrypt credentials");
  }
}
