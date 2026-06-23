import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import AdminDashboard from "@/components/admin/AdminDashboard";

export const metadata = {
  title: "Admin Dashboard - OrderOrbit",
  description: "Canteen management and pre-order fulfillment queue.",
};

export default async function AdminPage() {
  // Decrypt, verify user and check active status in real-time server-side
  const user = await getSessionUser();

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
