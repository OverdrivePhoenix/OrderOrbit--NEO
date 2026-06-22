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
      role: "student" | "admin";
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
    return await verifyToken(token);
  } catch (error) {
    return null;
  }
}
