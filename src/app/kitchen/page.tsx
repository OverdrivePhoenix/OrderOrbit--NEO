import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import KitchenDashboard from "@/components/kitchen/KitchenDashboard";

export const metadata = {
  title: "Kitchen Dashboard - OrderOrbit",
  description: "Canteen operational order prep queue and stock management.",
};

export default async function KitchenPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    redirect("/login");
  }

  const user = await verifyToken(token);

  if (!user || (user.role !== "staff" && user.role !== "admin")) {
    if (user && user.role === "student") {
      redirect("/menu");
    } else {
      redirect("/login");
    }
  }

  return <KitchenDashboard />;
}
