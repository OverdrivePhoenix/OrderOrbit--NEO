import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { User } from "@/data/db";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "default-super-secret-key-that-is-very-long"
);

export async function signToken(user: User) {
  const token = await new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    department: user.department,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(JWT_SECRET);
  return token;
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as {
      id: string;
      email: string;
      name: string;
      role: "student" | "staff" | "admin";
      department: string;
    };
  } catch (error) {
    return null;
  }
}

export async function getSessionUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return null;
    const verified = await verifyToken(token);
    if (!verified) return null;

    // Real-time suspension and status check
    const { Database } = require("@/data/db");
    const db = await Database.read();
    const user = db.users.find((u: any) => u.id === verified.id);
    if (!user || user.status !== "active") {
      return null;
    }

    return verified;
  } catch (error) {
    return null;
  }
}

export async function signOrders(orders: any[]) {
  const token = await new SignJWT({ orders })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
  return token;
}

export async function verifyOrders(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.orders as any[];
  } catch (error) {
    return [];
  }
}

/**
 * Normalizes an email address to a canonical format.
 * For Gmail addresses, this removes all dots and any "+" suffix from the local part.
 */
export function normalizeEmail(email: string): string {
  const normalized = email.toLowerCase().trim();
  if (normalized.endsWith("@gmail.com")) {
    const [localPart, domain] = normalized.split("@");
    // Remove dots and everything after '+'
    const cleanLocal = localPart.split("+")[0].replace(/\./g, "");
    return `${cleanLocal}@${domain}`;
  }
  return normalized;
}


