import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import AdminDashboard from "@/components/admin/AdminDashboard";

export const metadata = {
  title: "Admin Dashboard - OrderOrbit",
  description: "Canteen management and pre-order fulfillment queue.",
};

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    redirect("/login");
  }

  // Decrypt and verify JWT token server-side before sending any HTML/JS payload
  const user = await verifyToken(token);

  if (!user || user.role !== "admin") {
    // If authenticated as student, send them to the menu; if staff, send to kitchen; otherwise login
    if (user) {
      if (user.role === "student") {
        redirect("/menu");
      } else if (user.role === "staff") {
        redirect("/kitchen");
      }
    }
    redirect("/login");
  }

  // Safe to render Admin interface since role is verified as admin server-side
  return <AdminDashboard />;
}
