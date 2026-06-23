import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import KitchenDashboard from "@/components/kitchen/KitchenDashboard";

export const metadata = {
  title: "Kitchen Dashboard - OrderOrbit",
  description: "Canteen operational order prep queue and stock management.",
};

export default async function KitchenPage() {
  const user = await getSessionUser();

  if (!user || (user.role !== "staff" && user.role !== "admin")) {
    if (user && user.role === "student") {
      redirect("/menu");
    } else {
      redirect("/login");
    }
  }

  return <KitchenDashboard />;
}
