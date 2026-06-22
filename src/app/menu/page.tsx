import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import StudentMenu from "@/components/menu/StudentMenu";

export const metadata = {
  title: "Student Menu - OrderOrbit",
  description: "Browse menu items and submit canteen pre-orders.",
};

export default async function MenuPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    redirect("/login");
  }

  // Verify token server-side prior to sending page content or code bundle to client
  const user = await verifyToken(token);

  if (!user || user.role !== "student") {
    // If user is admin, redirect to admin panel, otherwise to login
    if (user && user.role === "admin") {
      redirect("/admin");
    } else {
      redirect("/login");
    }
  }

  return <StudentMenu />;
}
