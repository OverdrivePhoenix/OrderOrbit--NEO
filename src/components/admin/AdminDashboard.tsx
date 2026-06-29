"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MenuItem, Order, Review, DailySummary, User } from "@/data/db";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import ThemeToggle from "@/components/ThemeToggle";

export default function AdminDashboard() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<"orders" | "inventory" | "users" | "ai" | "analytics">("orders");

  // AI loading state
  const [generatingAI, setGeneratingAI] = useState(false);
  
  // CRUD modal states
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedVerificationOrder, setSelectedVerificationOrder] = useState<Order | null>(null);
  const [newItemData, setNewItemData] = useState({
    name: "",
    price: 0,
    prepTime: 10,
    stock: 20,
    category: "Snacks",
    image: "",
  });

  const [editItemData, setEditItemData] = useState({
    id: "",
    name: "",
    price: 0,
    prepTime: 10,
    stock: 20,
    category: "Snacks",
    image: "",
    available: true,
  });

  // Analytics Metrics
  const [analytics, setAnalytics] = useState<any[]>([]);

  const fetchAllData = async () => {
    try {
      const ordersRes = await fetch("/api/orders");
      if (ordersRes.status === 403 || ordersRes.status === 401) {
        router.push("/login");
        return;
      }
      const ordersData = await ordersRes.json();
      setOrders(ordersData.orders || []);

      const menuRes = await fetch("/api/menu");
      const menuData = await menuRes.json();
      setMenu(menuData.menu || []);

      const reviewsRes = await fetch("/api/reviews");
      const reviewsData = await reviewsRes.json();
      setReviews(reviewsData.reviews || []);

      const summariesRes = await fetch("/api/ai");
      if (summariesRes.ok) {
        const summariesData = await summariesRes.json();
        setSummaries(summariesData.summaries || []);
      }

      const usersRes = await fetch("/api/admin/users");
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users || []);
      }
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    }
  };

  const handleUserAction = async (userId: string, action: "approve" | "reject" | "suspend" | "unsuspend" | "revoke") => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });
      if (res.ok) {
        fetchAllData();
      } else {
        const data = await res.json();
        alert(data.error || "Action failed");
      }
    } catch (err) {
      console.error(`Failed to ${action} user`, err);
    }
  };

  useEffect(() => {
    fetchAllData();

    // Poll data every 8 seconds for real-time dashboard feel
    const interval = setInterval(fetchAllData, 8000);
    return () => clearInterval(interval);
  }, [router]);

  // Compute telemetry metrics when menu, orders, or reviews change
  useEffect(() => {
    if (menu.length === 0) return;

    const itemsStats = menu.map((item) => {
      const itemOrders = orders.filter(
        (o) => o.status === "Fulfilled" || o.status === "Pending" || o.status === "Preparing" || o.status === "Ready"
      );
      const salesCount = itemOrders.reduce((sum, order) => {
        const orderItem = order.items.find((i) => i.id === item.id);
        return sum + (orderItem ? orderItem.quantity : 0);
      }, 0);

      const itemReviews = reviews.filter((r) => r.itemId === item.id);
      const avgRating =
        itemReviews.length > 0
          ? itemReviews.reduce((sum, r) => sum + r.rating, 0) / itemReviews.length
          : 0;

      return {
        ...item,
        salesCount,
        avgRating: Number(avgRating.toFixed(1)),
        reviewCount: itemReviews.length,
      };
    });

    const avgSales = itemsStats.reduce((sum, i) => sum + i.salesCount, 0) / itemsStats.length || 1;
    const ratingThreshold = 4.0;

    const classified = itemsStats.map((item) => {
      let quadrant = "Underperformer";
      let colorClass = "bg-gray-100 text-gray-800 border-gray-300";
      let recommendation = "";

      if (item.salesCount >= avgSales && item.avgRating >= ratingThreshold) {
        quadrant = "Crowd Pleaser";
        colorClass = "bg-secondary/15 text-secondary border-secondary/30";
        recommendation = "🌟 High sales & high ratings! Prominently feature on top of the menu.";
      } else if (item.salesCount >= avgSales && item.avgRating < ratingThreshold) {
        quadrant = "Needs Quality Attention";
        colorClass = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-300";
        recommendation = "⚠️ High sales but low ratings. Inspect recipe quality (less salt, fresher ingredients).";
      } else if (item.salesCount < avgSales && item.avgRating >= ratingThreshold) {
        quadrant = "High Potential";
        colorClass = "bg-primary/10 text-primary border-primary/30";
        recommendation = "📈 Loved by buyers but low sales. Launch a promotion or discount to boost visibility.";
      } else {
        quadrant = "Underperformer";
        colorClass = "bg-destructive/10 text-destructive border-destructive/30";
        recommendation = "❌ Low sales & low ratings. Adapt recipe or consider replacing with a new item.";
      }

      if (item.reviewCount === 0 && item.salesCount >= avgSales) {
        quadrant = "Crowd Pleaser";
        colorClass = "bg-secondary/15 text-secondary border-secondary/30";
        recommendation = "🌟 High sales. Encourage students to leave reviews.";
      }

      return {
        ...item,
        quadrant,
        colorClass,
        recommendation,
      };
    });

    setAnalytics(classified);
  }, [menu, orders, reviews]);

  const handleUpdateOrderStatus = async (orderId: string, nextStatus: string) => {
    try {
      const res = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId, status: nextStatus }),
      });

      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus as any } : o))
        );
      }
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const handleUpdateItemStatus = async (orderId: string, itemId: string, nextStatus: string) => {
    try {
      const res = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId, itemId, itemStatus: nextStatus }),
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch (err) {
      console.error("Failed to update item status", err);
    }
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    const nextAvailability = !item.available;
    const nextStock = nextAvailability ? Math.max(item.stock, 10) : 0;

    try {
      const res = await fetch("/api/menu", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          available: nextAvailability,
          stock: nextStock,
        }),
      });

      if (res.ok) {
        setMenu((prev) =>
          prev.map((m) =>
            m.id === item.id ? { ...m, available: nextAvailability, stock: nextStock } : m
          )
        );
      }
    } catch (err) {
      console.error("Failed to toggle availability", err);
    }
  };

  const handleDeleteMenuItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to permanently delete this menu item?")) {
      return;
    }
    try {
      const res = await fetch(`/api/menu?id=${itemId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchAllData();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete item");
      }
    } catch (err) {
      console.error("Failed to delete menu item", err);
    }
  };

  const handleAddMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...newItemData,
        price: Math.round(newItemData.price * 100),
      };

      const res = await fetch("/api/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowAddModal(false);
        setNewItemData({
          name: "",
          price: 0,
          prepTime: 10,
          stock: 20,
          category: "Snacks",
          image: "",
        });
        fetchAllData();
      }
    } catch (err) {
      console.error("Failed to add menu item", err);
    }
  };

  const handleEditMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...editItemData,
        price: Math.round(editItemData.price * 100),
      };

      const res = await fetch("/api/menu", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setEditingItem(null);
        fetchAllData();
      }
    } catch (err) {
      console.error("Failed to edit menu item", err);
    }
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setEditItemData({
      id: item.id,
      name: item.name,
      price: item.price / 100,
      prepTime: item.prepTime,
      stock: item.stock,
      category: item.category,
      image: item.image,
      available: item.available,
    });
  };

  const handleGenerateAIInsights = async () => {
    setGeneratingAI(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        const data = await res.json();
        setSummaries((prev) => [data.summary, ...prev]);
        fetchAllData();
      }
    } catch (e) {
      console.error("Failed compiling AI insights", e);
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
  };

  const getPrepItems = (categoryType: "drinks" | "snacks" | "meals") => {
    const list: { orderId: string; token: string; item: any; orderCreatedAt: string }[] = [];
    orders
      .filter((o) => o.status === "Pending" || o.status === "Preparing")
      .forEach((o) => {
        o.items.forEach((item) => {
          const cat = (item.category || "").toLowerCase();
          let targetBoard: "drinks" | "snacks" | "meals" = "meals";
          if (cat === "beverages") {
            targetBoard = "drinks";
          } else if (cat === "snacks" || cat === "breakfast") {
            targetBoard = "snacks";
          }
          if (targetBoard === categoryType) {
            list.push({
              orderId: o.id,
              token: o.token || "N/A",
              item,
              orderCreatedAt: o.createdAt,
            });
          }
        });
      });
    return list.sort((a, b) => new Date(a.orderCreatedAt).getTime() - new Date(b.orderCreatedAt).getTime());
  };

  const pendingCount = orders.filter((o) => o.status === "Pending").length;
  const preparingCount = orders.filter((o) => o.status === "Preparing").length;
  const dailyTotalCents = orders
    .filter((o) => o.status === "Fulfilled" || o.status === "Ready" || o.status === "Preparing")
    .reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="min-h-screen pb-24 md:pb-8 bg-background">
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-card shadow-sm border-b border-border text-foreground">
        <div className="flex items-center gap-4">
          <span className="font-extrabold text-2xl text-primary tracking-tight">OrderOrbit</span>
          <span className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-xs font-bold border border-border hidden sm:block">
            Admin Portal
          </span>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="text-muted-foreground hover:text-primary transition-colors text-sm font-semibold flex items-center gap-1 border border-border px-3 py-1.5 rounded-full hover:bg-muted cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">logout</span> Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-24">
        <div className="flex border-b border-border/20 mb-8 overflow-x-auto scrollbar-none">
          {[
            { id: "orders", label: "Fulfillment Queue", icon: "receipt_long" },
            { id: "inventory", label: "Manage Inventory", icon: "inventory_2" },
            { id: "users", label: "User Onboarding", icon: "group_add" },
            { id: "analytics", label: "Telemetry & Analytics", icon: "monitoring" },
            { id: "ai", label: "AI Kitchen Insights", icon: "psychology" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 font-bold text-sm whitespace-nowrap border-b-2 transition-all ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/50"
              }`}
            >
              <span className="material-symbols-outlined text-lg">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "orders" && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="font-extrabold text-2xl">Active Orders Queue</h2>
                <p className="text-muted-foreground text-sm mt-1">Process pre-ordered tokens in real time.</p>
              </div>
              <div className="flex gap-4">
                <div className="bg-card text-foreground px-4 py-2 rounded-xl shadow-sm border border-border/20 text-center">
                  <div className="text-xs text-muted-foreground">Pending Orders</div>
                  <div className="text-lg font-extrabold text-primary">{pendingCount}</div>
                </div>
                <div className="bg-card text-foreground px-4 py-2 rounded-xl shadow-sm border border-border/20 text-center">
                  <div className="text-xs text-muted-foreground">In Preparation</div>
                  <div className="text-lg font-extrabold text-foreground">{preparingCount}</div>
                </div>
                <div className="bg-card text-foreground px-4 py-2 rounded-xl shadow-sm border border-border/20 text-center">
                  <div className="text-xs text-muted-foreground">Daily Revenue</div>
                  <div className="text-lg font-extrabold text-primary">
                    ₹{(dailyTotalCents / 100).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Warning banner for Pending Verification */}
            {orders.filter((o) => o.status === "Pending Verification").length > 0 && (
              <div className="bg-amber-500/10 border border-amber-200 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex items-start sm:items-center gap-3">
                  <span className="material-symbols-outlined text-amber-600 text-3xl">warning</span>
                  <div>
                    <h4 className="font-extrabold text-amber-600 dark:text-amber-400 text-sm sm:text-base">Action Required: UPI Receipts Pending Manual Review</h4>
                    <p className="text-amber-700 text-xs mt-0.5">
                      {orders.filter((o) => o.status === "Pending Verification").length} order(s) failed AI auto-verification. Please review and approve them manually.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Category Parallel Prep Queues */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Drinks Board */}
              <div className="bg-card text-foreground rounded-2xl p-5 border border-border/20 shadow-sm flex flex-col min-h-[350px]">
                <div className="flex justify-between items-center border-b border-border/10 pb-3 mb-4">
                  <h3 className="font-extrabold text-base flex items-center gap-2 text-foreground">
                    <span>🍹</span> Drinks Board
                  </h3>
                  <span className="bg-primary/5 text-primary text-xs font-bold px-2.5 py-0.5 rounded-full border border-border/20">
                    {getPrepItems("drinks").filter(x => x.item.prepStatus !== "Completed").length} active
                  </span>
                </div>
                <div className="flex-grow space-y-3 overflow-y-auto max-h-[350px] pr-1">
                  {getPrepItems("drinks").length === 0 ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-xs italic py-12">
                      No beverages in prep
                    </div>
                  ) : (
                    getPrepItems("drinks").map(({ orderId, token, item }) => (
                      <div
                        key={`${orderId}-${item.id}`}
                        className={`p-3 rounded-xl border transition-all text-xs font-semibold ${
                          item.prepStatus === "Completed"
                            ? "bg-secondary/15 border-secondary/20 opacity-60"
                            : item.prepStatus === "Preparing"
                            ? "bg-primary/10 border-primary/25"
                            : "bg-background border-border/15"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-extrabold text-primary text-sm">{token}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              item.prepStatus === "Completed"
                                ? "border-secondary/30 text-secondary bg-secondary/15"
                                : item.prepStatus === "Preparing"
                                ? "border-primary/30 text-primary bg-primary/10"
                                : "border-amber-300 text-amber-600 dark:text-amber-400 bg-amber-500/10"
                            }`}
                          >
                            {item.prepStatus || "Pending"}
                          </span>
                        </div>
                        <div className="text-foreground text-sm font-bold mb-3">
                          {item.quantity}x {item.name}
                        </div>
                        <div className="flex justify-end gap-2">
                          {item.prepStatus === "Pending" && (
                            <button
                              onClick={() => handleUpdateItemStatus(orderId, item.id, "Preparing")}
                              className="bg-primary hover:bg-surface-tint text-white font-bold px-3 py-1.5 rounded-lg text-[10px] transition-colors"
                            >
                              Start Prep
                            </button>
                          )}
                          {item.prepStatus === "Preparing" && (
                            <button
                              onClick={() => handleUpdateItemStatus(orderId, item.id, "Completed")}
                              className="bg-primary hover:bg-[#00504a] text-white font-bold px-3 py-1.5 rounded-lg text-[10px] transition-colors"
                            >
                              Mark Done
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Snacks Board */}
              <div className="bg-card text-foreground rounded-2xl p-5 border border-border/20 shadow-sm flex flex-col min-h-[350px]">
                <div className="flex justify-between items-center border-b border-border/10 pb-3 mb-4">
                  <h3 className="font-extrabold text-base flex items-center gap-2 text-foreground">
                    <span>🥪</span> Snacks Board
                  </h3>
                  <span className="bg-primary/5 text-primary text-xs font-bold px-2.5 py-0.5 rounded-full border border-border/20">
                    {getPrepItems("snacks").filter(x => x.item.prepStatus !== "Completed").length} active
                  </span>
                </div>
                <div className="flex-grow space-y-3 overflow-y-auto max-h-[350px] pr-1">
                  {getPrepItems("snacks").length === 0 ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-xs italic py-12">
                      No snacks in prep
                    </div>
                  ) : (
                    getPrepItems("snacks").map(({ orderId, token, item }) => (
                      <div
                        key={`${orderId}-${item.id}`}
                        className={`p-3 rounded-xl border transition-all text-xs font-semibold ${
                          item.prepStatus === "Completed"
                            ? "bg-secondary/15 border-secondary/20 opacity-60"
                            : item.prepStatus === "Preparing"
                            ? "bg-primary/10 border-primary/25"
                            : "bg-[#f7f9ff] border-border/15"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-extrabold text-primary text-sm">{token}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              item.prepStatus === "Completed"
                                ? "border-secondary/30 text-secondary bg-secondary/15"
                                : item.prepStatus === "Preparing"
                                ? "border-primary/30 text-primary bg-primary/10"
                                : "border-amber-300 text-amber-600 dark:text-amber-400 bg-amber-500/10"
                            }`}
                          >
                            {item.prepStatus || "Pending"}
                          </span>
                        </div>
                        <div className="text-foreground text-sm font-bold mb-3">
                          {item.quantity}x {item.name}
                        </div>
                        <div className="flex justify-end gap-2">
                          {item.prepStatus === "Pending" && (
                            <button
                              onClick={() => handleUpdateItemStatus(orderId, item.id, "Preparing")}
                              className="bg-primary hover:bg-surface-tint text-white font-bold px-3 py-1.5 rounded-lg text-[10px] transition-colors"
                            >
                              Start Prep
                            </button>
                          )}
                          {item.prepStatus === "Preparing" && (
                            <button
                              onClick={() => handleUpdateItemStatus(orderId, item.id, "Completed")}
                              className="bg-[#006a62] hover:bg-[#00504a] text-white font-bold px-3 py-1.5 rounded-lg text-[10px] transition-colors"
                            >
                              Mark Done
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Meals Board */}
              <div className="bg-card text-foreground rounded-2xl p-5 border border-border/20 shadow-sm flex flex-col min-h-[350px]">
                <div className="flex justify-between items-center border-b border-border/10 pb-3 mb-4">
                  <h3 className="font-extrabold text-base flex items-center gap-2 text-foreground">
                    <span>🍲</span> Meals Board
                  </h3>
                  <span className="bg-primary/5 text-primary text-xs font-bold px-2.5 py-0.5 rounded-full border border-border/20">
                    {getPrepItems("meals").filter(x => x.item.prepStatus !== "Completed").length} active
                  </span>
                </div>
                <div className="flex-grow space-y-3 overflow-y-auto max-h-[350px] pr-1">
                  {getPrepItems("meals").length === 0 ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-xs italic py-12">
                      No meals in prep
                    </div>
                  ) : (
                    getPrepItems("meals").map(({ orderId, token, item }) => (
                      <div
                        key={`${orderId}-${item.id}`}
                        className={`p-3 rounded-xl border transition-all text-xs font-semibold ${
                          item.prepStatus === "Completed"
                            ? "bg-secondary/15 border-secondary/20 opacity-60"
                            : item.prepStatus === "Preparing"
                            ? "bg-primary/10 border-primary/25"
                            : "bg-[#f7f9ff] border-border/15"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-extrabold text-primary text-sm">{token}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              item.prepStatus === "Completed"
                                ? "border-secondary/30 text-secondary bg-secondary/15"
                                : item.prepStatus === "Preparing"
                                ? "border-primary/30 text-primary bg-primary/10"
                                : "border-amber-300 text-amber-600 dark:text-amber-400 bg-amber-500/10"
                            }`}
                          >
                            {item.prepStatus || "Pending"}
                          </span>
                        </div>
                        <div className="text-foreground text-sm font-bold mb-3">
                          {item.quantity}x {item.name}
                        </div>
                        <div className="flex justify-end gap-2">
                          {item.prepStatus === "Pending" && (
                            <button
                              onClick={() => handleUpdateItemStatus(orderId, item.id, "Preparing")}
                              className="bg-primary hover:bg-surface-tint text-white font-bold px-3 py-1.5 rounded-lg text-[10px] transition-colors"
                            >
                              Start Prep
                            </button>
                          )}
                          {item.prepStatus === "Preparing" && (
                            <button
                              onClick={() => handleUpdateItemStatus(orderId, item.id, "Completed")}
                              className="bg-[#006a62] hover:bg-[#00504a] text-white font-bold px-3 py-1.5 rounded-lg text-[10px] transition-colors"
                            >
                              Mark Done
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Verification & Pickup Desk Table */}
            <div className="bg-card text-foreground rounded-2xl border border-border/20 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-border/10">
                <h3 className="font-extrabold text-lg text-foreground">Verification & Pickup Desk</h3>
                <p className="text-muted-foreground text-xs mt-0.5">Manage receipt validations and ready order collections.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-background text-muted-foreground text-xs font-bold uppercase tracking-wider border-b border-border/20">
                      <th className="p-4">Token # / Ref</th>
                      <th className="p-4">Time Placed</th>
                      <th className="p-4">Items Ordered</th>
                      <th className="p-4">Total Amount</th>
                      <th className="p-4">Desk Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-outline-variant/10">
                    {orders
                      .filter((o) => o.status === "Pending Verification" || o.status === "Ready" || o.status === "Fulfilled")
                      .sort((a, b) => {
                        const score = (status: string) => {
                          if (status === "Pending Verification") return 0;
                          if (status === "Ready") return 1;
                          return 2;
                        };
                        return score(a.status) - score(b.status);
                      })
                      .map((order) => {
                        const isReady = order.status === "Ready";
                        const isFulfilled = order.status === "Fulfilled";
                        const isPendingVerification = order.status === "Pending Verification";

                        return (
                          <tr key={order.id} className="hover:bg-muted/20 transition-colors">
                            <td className="p-4 font-extrabold text-primary text-base">
                              {order.token || (
                                <span className="px-2.5 py-1 bg-amber-100 text-amber-600 dark:text-amber-400 text-[10px] rounded-full font-bold uppercase border border-amber-200">
                                  Verify Pay
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-muted-foreground">
                              {new Date(order.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            <td className="p-4">
                              <div className="space-y-1">
                                {order.items.map((i, index) => (
                                  <div key={index} className="font-semibold text-xs text-foreground font-sans">
                                    {i.quantity}x {i.name}
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="p-4 font-bold text-secondary">
                              ₹{(order.total / 100).toFixed(2)}
                            </td>
                            <td className="p-4">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-extrabold border ${
                                  isReady
                                    ? "border-secondary text-secondary bg-secondary/5"
                                    : isPendingVerification
                                    ? "border-amber-500 text-amber-700 bg-amber-500/10"
                                    : "border-border text-foreground bg-primary/5"
                                }`}
                              >
                                {order.status}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              {isPendingVerification && (
                                <button
                                  onClick={() => setSelectedVerificationOrder(order)}
                                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-colors active:scale-95 shadow-sm flex items-center gap-1 ml-auto"
                                >
                                  <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
                                  Review Pay
                                </button>
                              )}
                              {isReady && (
                                <button
                                  onClick={() => handleUpdateOrderStatus(order.id, "Fulfilled")}
                                  className="bg-[#1e3244] hover:bg-[#071d2e] text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors active:scale-95 shadow-sm ml-auto"
                                >
                                  Mark Fulfilled
                                </button>
                              )}
                              {isFulfilled && (
                                <span className="text-xs text-muted-foreground font-semibold">
                                  Token Collected
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}

                    {orders.filter((o) => o.status === "Pending Verification" || o.status === "Ready" || o.status === "Fulfilled").length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">
                          No orders at Verification or Pickup desk.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {activeTab === "users" && (
          <section className="space-y-6">
            <div>
              <h2 className="font-extrabold text-2xl">User Onboarding & RBAC Management</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Review registration requests, approve new accounts, and retrieve activation tokens.
              </p>
            </div>

            {/* Pending Requests */}
            <div className="bg-card text-foreground rounded-2xl border border-border/20 overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="px-6 py-4 border-b border-border/10 bg-amber-500/100/5">
                <h3 className="font-extrabold text-lg text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-700">pending_actions</span>
                  Pending Registration Requests ({users.filter(u => u.status === "pending").length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-background text-muted-foreground text-xs font-bold uppercase tracking-wider border-b border-border/20">
                      <th className="p-4">Name</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Department</th>
                      <th className="p-4">Student ID</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-outline-variant/10">
                    {users.filter(u => u.status === "pending").map((user) => (
                      <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-4 font-bold">{user.name}</td>
                        <td className="p-4">{user.email}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                            user.role === "admin" ? "bg-red-100 text-red-800 border border-red-200" : user.role === "staff" ? "bg-amber-100 text-amber-600 dark:text-amber-400 border border-amber-200" : "bg-blue-100 text-blue-800 border border-blue-200"
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="p-4">{user.department}</td>
                        <td className="p-4 font-mono text-xs">{user.studentId || "N/A"}</td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => handleUserAction(user.id, "approve")}
                            className="bg-primary hover:bg-surface-tint text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-transform active:scale-95 shadow-sm"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleUserAction(user.id, "reject")}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-transform active:scale-95 shadow-sm"
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                    {users.filter(u => u.status === "pending").length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-muted-foreground text-sm italic">
                          No pending registration requests.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Approved & Awaiting Activation */}
            <div className="bg-card text-foreground rounded-2xl border border-border/20 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-border/10 bg-blue-50/20">
                <h3 className="font-extrabold text-lg text-blue-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-700">vpn_key</span>
                  Approved Accounts (Awaiting Activation - Share Tokens) ({users.filter(u => u.status === "approved").length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-background text-muted-foreground text-xs font-bold uppercase tracking-wider border-b border-border/20">
                      <th className="p-4">Name</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Department</th>
                      <th className="p-4">Activation Token</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-outline-variant/10">
                    {users.filter(u => u.status === "approved").map((user) => (
                      <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-4 font-bold">{user.name}</td>
                        <td className="p-4">{user.email}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                            user.role === "admin" ? "bg-red-100 text-red-800 border border-red-200" : user.role === "staff" ? "bg-amber-100 text-amber-600 dark:text-amber-400 border border-amber-200" : "bg-blue-100 text-blue-800 border border-blue-200"
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="p-4">{user.department}</td>
                        <td className="p-4 font-mono text-xs">
                          <div className="flex items-center gap-2">
                            <code className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded border border-slate-200 font-mono font-bold text-xs select-all">
                              {user.activationToken}
                            </code>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(user.activationToken || "");
                              }}
                              className="text-primary hover:underline text-xs flex items-center gap-0.5 font-bold"
                            >
                              <span className="material-symbols-outlined text-xs">content_copy</span> Copy
                            </button>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleUserAction(user.id, "reject")}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-transform active:scale-95 shadow-sm"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                    {users.filter(u => u.status === "approved").length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-muted-foreground text-sm italic">
                          No approved users waiting for activation.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Active Users */}
            {/* Active Users */}
            <div className="bg-card text-foreground rounded-2xl border border-border/20 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-border/10 bg-green-50/20">
                <h3 className="font-extrabold text-lg text-green-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-700">group</span>
                  Active Users ({users.filter(u => u.status === "active").length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#f7f9ff] text-muted-foreground text-xs font-bold uppercase tracking-wider border-b border-border/20">
                      <th className="p-4">Name</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Department</th>
                      <th className="p-4">Student ID</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-outline-variant/10">
                    {users.filter(u => u.status === "active").map((user) => (
                      <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-4 font-bold">{user.name}</td>
                        <td className="p-4">{user.email}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                            user.role === "admin" ? "bg-red-100 text-red-800 border border-red-200" : user.role === "staff" ? "bg-amber-100 text-amber-600 dark:text-amber-400 border border-amber-200" : "bg-blue-100 text-blue-800 border border-blue-200"
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="p-4">{user.department}</td>
                        <td className="p-4 font-mono text-xs">{user.studentId || "N/A"}</td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => handleUserAction(user.id, "suspend")}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-transform active:scale-95 shadow-sm"
                          >
                            Suspend
                          </button>
                          <button
                            onClick={() => handleUserAction(user.id, "revoke")}
                            className="bg-zinc-600 hover:bg-zinc-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-transform active:scale-95 shadow-sm"
                          >
                            Revoke
                          </button>
                        </td>
                      </tr>
                    ))}
                    {users.filter(u => u.status === "active").length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-muted-foreground text-sm italic">
                          No active users.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Suspended Users */}
            <div className="bg-card text-foreground rounded-2xl border border-border/20 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-border/10 bg-red-50/20">
                <h3 className="font-extrabold text-lg text-red-600 dark:text-red-400 flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-700">block</span>
                  Suspended Users ({users.filter(u => u.status === "suspended").length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#f7f9ff] text-muted-foreground text-xs font-bold uppercase tracking-wider border-b border-border/20">
                      <th className="p-4">Name</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Department</th>
                      <th className="p-4">Student ID</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-outline-variant/10">
                    {users.filter(u => u.status === "suspended").map((user) => (
                      <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-4 font-bold">{user.name}</td>
                        <td className="p-4">{user.email}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                            user.role === "admin" ? "bg-red-100 text-red-800 border border-red-200" : user.role === "staff" ? "bg-amber-100 text-amber-600 dark:text-amber-400 border border-amber-200" : "bg-blue-100 text-blue-800 border border-blue-200"
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="p-4">{user.department}</td>
                        <td className="p-4 font-mono text-xs">{user.studentId || "N/A"}</td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleUserAction(user.id, "unsuspend")}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-transform active:scale-95 shadow-sm"
                          >
                            Reactivate
                          </button>
                        </td>
                      </tr>
                    ))}
                    {users.filter(u => u.status === "suspended").length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-muted-foreground text-sm italic">
                          No suspended users.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {activeTab === "inventory" && (
          <section className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-extrabold text-2xl">Item Database Control</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Adjust pricing, stock levels, or instantly toggle item availability.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-primary hover:bg-surface-tint text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all flex items-center gap-1 hover:scale-105 active:scale-95 shadow-sm"
              >
                <span className="material-symbols-outlined text-lg">add</span> Add New Item
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {menu.map((item) => (
                <div
                  key={item.id}
                  className={`bg-card rounded-2xl p-5 border border-border/20 shadow-sm flex flex-col justify-between ${
                    !item.available ? "bg-red-50/20 border-red-200" : ""
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <div>
                        <h4 className="font-bold text-lg leading-tight">{item.name}</h4>
                        <span className="text-xs font-semibold text-muted-foreground bg-primary/5 px-2.5 py-1 rounded-full border border-border/10">
                          {item.category}
                        </span>
                      </div>
                      <span className="text-secondary font-bold text-base">
                        ₹{(item.price / 100).toFixed(2)}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground mb-4">
                      Stock: <span className="font-bold">{item.stock}</span> | Prep Time:{" "}
                      <span className="font-bold">{item.prepTime}m</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-border/10 pt-4 mt-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleAvailability(item)}
                        className={`px-3 py-1.5 rounded-full text-xs font-extrabold border transition-all ${
                          item.available
                            ? "bg-secondary/15 border-secondary/30 text-secondary hover:bg-emerald-100"
                            : "bg-destructive/10 border-destructive/30 text-destructive hover:bg-rose-100"
                        }`}
                      >
                        {item.available ? "🟢 Active Menu" : "🔴 Sold Out"}
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openEditModal(item)}
                        className="text-primary font-bold text-xs hover:underline flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteMenuItem(item.id)}
                        className="text-rose-600 hover:text-rose-800 font-bold text-xs hover:underline flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === "analytics" && (
          <section className="space-y-6">
            <div>
              <h2 className="font-extrabold text-2xl">Structural Item Analytics Matrix</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Quadrant matrix analyzing item sales telemetry and student satisfaction scores.
              </p>
            </div>

            <div className="bg-card text-foreground rounded-2xl p-6 border border-border/20 shadow-sm space-y-6">
              <h3 className="font-bold text-lg mb-2">Item Quadrants & Operational Actions</h3>
              <div className="space-y-4">
                {analytics.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-3 mb-1.5">
                        <h4 className="font-bold text-base text-foreground">{item.name}</h4>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-extrabold border ${item.colorClass}`}
                        >
                          {item.quadrant}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Sales count: <span className="font-bold text-foreground">{item.salesCount} servings</span> |
                        Avg rating: <span className="font-bold text-foreground">{item.avgRating} ★</span> ({item.reviewCount} reviews)
                      </p>
                      <p className="text-sm font-semibold text-secondary">{item.recommendation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeTab === "ai" && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="font-extrabold text-2xl">End-of-Day Kitchen Insights Compilation</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Compile daily text comments using Gemini Flash to adjust kitchen workflows.
                </p>
              </div>
              <button
                onClick={handleGenerateAIInsights}
                disabled={generatingAI}
                className="bg-primary hover:bg-surface-tint text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center gap-2 shadow-sm"
              >
                <span className="material-symbols-outlined text-lg">psychology</span>
                {generatingAI ? "Running Model..." : "Generate AI Insights Brief"}
              </button>
            </div>

            {summaries.length === 0 ? (
              <div className="bg-card text-foreground rounded-2xl p-8 text-center border border-border/20">
                <span className="material-symbols-outlined text-muted-foreground text-5xl mb-2">psychology</span>
                <p className="text-muted-foreground text-sm">No insights briefs compiled yet. Click the button to analyze daily reviews.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {summaries.map((summary) => (
                  <div
                    key={summary.id}
                    className="bg-card text-foreground rounded-2xl p-6 border border-border/20 shadow-sm space-y-4"
                  >
                    <div className="flex justify-between items-center border-b border-border/10 pb-3">
                      <span className="text-xs text-muted-foreground font-bold">Brief Date: {summary.date}</span>
                      <span className="bg-primary/5 text-primary text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-border/20">
                        Gemini Compiled
                      </span>
                    </div>

                    <div className="prose prose-sm text-xs font-semibold text-muted-foreground leading-relaxed whitespace-pre-line">
                      {summary.summary}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-card text-foreground rounded-2xl max-w-md w-full border border-border/20 p-6 shadow-xl relative animate-in fade-in zoom-in duration-150">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h3 className="font-extrabold text-xl mb-4">Add Menu Item</h3>
            <form onSubmit={handleAddMenuItem} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  value={newItemData.name}
                  onChange={(e) => setNewItemData({ ...newItemData, name: e.target.value })}
                  className="w-full rounded-xl border border-border/40 p-2.5 text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-1">Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newItemData.price || ""}
                    onChange={(e) => setNewItemData({ ...newItemData, price: Number(e.target.value) })}
                    className="w-full rounded-xl border border-border/40 p-2.5 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Prep Time (m)</label>
                  <input
                    type="number"
                    required
                    value={newItemData.prepTime}
                    onChange={(e) => setNewItemData({ ...newItemData, prepTime: Number(e.target.value) })}
                    className="w-full rounded-xl border border-border/40 p-2.5 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-1">Initial Stock</label>
                  <input
                    type="number"
                    required
                    value={newItemData.stock}
                    onChange={(e) => setNewItemData({ ...newItemData, stock: Number(e.target.value) })}
                    className="w-full rounded-xl border border-border/40 p-2.5 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Category</label>
                  <select
                    value={newItemData.category}
                    onChange={(e) => setNewItemData({ ...newItemData, category: e.target.value })}
                    className="w-full rounded-xl border border-border/40 p-2.5 text-sm focus:outline-none focus:border-primary"
                  >
                    <option>Breakfast</option>
                    <option>Lunch</option>
                    <option>Snacks</option>
                    <option>Beverages</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">Item Image (Device Upload)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setNewItemData({ ...newItemData, image: reader.result as string });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full rounded-xl border border-border/40 p-2 text-sm focus:outline-none focus:border-primary bg-background text-foreground"
                />
                {newItemData.image && (
                  <div className="mt-2 relative w-20 h-20 rounded-xl overflow-hidden border border-border/40">
                    <Image src={newItemData.image} alt="Preview" width={80} height={80} className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-primary hover:bg-surface-tint text-white font-extrabold py-3 rounded-xl shadow-sm transition-all"
              >
                Create Menu Item
              </button>
            </form>
          </div>
        </div>
      )}

      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-card text-foreground rounded-2xl max-w-md w-full border border-border/20 p-6 shadow-xl relative animate-in fade-in zoom-in duration-150">
            <button
              onClick={() => setEditingItem(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h3 className="font-extrabold text-xl mb-4">Edit {editingItem.name}</h3>
            <form onSubmit={handleEditMenuItem} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  value={editItemData.name}
                  onChange={(e) => setEditItemData({ ...editItemData, name: e.target.value })}
                  className="w-full rounded-xl border border-border/40 p-2.5 text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-1">Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editItemData.price || ""}
                    onChange={(e) => setEditItemData({ ...editItemData, price: Number(e.target.value) })}
                    className="w-full rounded-xl border border-border/40 p-2.5 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Prep Time (m)</label>
                  <input
                    type="number"
                    required
                    value={editItemData.prepTime}
                    onChange={(e) => setEditItemData({ ...editItemData, prepTime: Number(e.target.value) })}
                    className="w-full rounded-xl border border-border/40 p-2.5 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-1">Live Stock</label>
                  <input
                    type="number"
                    required
                    value={editItemData.stock}
                    onChange={(e) => setEditItemData({ ...editItemData, stock: Number(e.target.value) })}
                    className="w-full rounded-xl border border-border/40 p-2.5 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Category</label>
                  <select
                    value={editItemData.category}
                    onChange={(e) => setEditItemData({ ...editItemData, category: e.target.value })}
                    className="w-full rounded-xl border border-border/40 p-2.5 text-sm focus:outline-none focus:border-primary"
                  >
                    <option>Breakfast</option>
                    <option>Lunch</option>
                    <option>Snacks</option>
                    <option>Beverages</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">Item Image (Device Upload)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setEditItemData({ ...editItemData, image: reader.result as string });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full rounded-xl border border-border/40 p-2 text-sm focus:outline-none focus:border-primary bg-background text-foreground"
                />
                {editItemData.image && (
                  <div className="mt-2 relative w-20 h-20 rounded-xl overflow-hidden border border-border/40">
                    <Image src={editItemData.image} alt="Preview" width={80} height={80} className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-available"
                  checked={editItemData.available}
                  onChange={(e) => setEditItemData({ ...editItemData, available: e.target.checked })}
                  className="rounded text-primary focus:ring-primary h-4 w-4"
                />
                <label htmlFor="edit-available" className="text-sm font-bold text-foreground">
                  Item is Available for Pre-Order
                </label>
              </div>

              <button
                type="submit"
                className="w-full bg-primary hover:bg-surface-tint text-white font-extrabold py-3 rounded-xl shadow-sm transition-all"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {selectedVerificationOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card text-foreground rounded-2xl max-w-lg w-full border border-border/20 p-6 shadow-xl relative animate-in fade-in zoom-in duration-150 flex flex-col max-h-[90vh]">
            <button
              onClick={() => setSelectedVerificationOrder(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1.5 hover:bg-muted rounded-full transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h3 className="font-extrabold text-xl mb-2 flex items-center gap-2 text-foreground">
              <span className="material-symbols-outlined text-amber-500">receipt_long</span>
              Review UPI Transaction Receipt
            </h3>
            <p className="text-muted-foreground text-xs mb-4">
              Inspect the screenshot and verify if the payment was successfully credited to the canteen UPI account.
            </p>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
              {/* Order Info Grid */}
              <div className="grid grid-cols-2 gap-4 bg-muted/45 p-4 rounded-xl border border-border/15 text-xs font-semibold text-muted-foreground">
                <div>
                  <span className="text-[10px] uppercase text-muted-foreground/70 block">Student Reference</span>
                  <span className="text-foreground font-bold">{selectedVerificationOrder.userId}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-muted-foreground/70 block">Submitted UTR</span>
                  <span className="text-foreground font-bold tracking-wider">{selectedVerificationOrder.utr || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-muted-foreground/70 block">Expected Price</span>
                  <span className="text-secondary font-extrabold text-sm">₹{(selectedVerificationOrder.total / 100).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-muted-foreground/70 block">Items Detail</span>
                  <span className="text-foreground font-bold">
                    {selectedVerificationOrder.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                  </span>
                </div>
              </div>

              {/* Receipt Image */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-muted-foreground/70 block">Uploaded Receipt Screenshot</span>
                <div className="bg-muted border border-border/20 rounded-xl overflow-hidden p-2 flex justify-center max-h-[350px]">
                  {selectedVerificationOrder.screenshotUrl ? (
                    <Image
                      src={selectedVerificationOrder.screenshotUrl}
                      alt="UPI Payment Screenshot"
                      width={400}
                      height={400}
                      className="max-h-[330px] w-auto object-contain rounded-lg shadow-sm"
                    />
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground text-xs italic">
                      No screenshot provided.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="grid grid-cols-2 gap-3 border-t border-border/10 pt-4 mt-4">
              <button
                onClick={async () => {
                  await handleUpdateOrderStatus(selectedVerificationOrder.id, "Cancelled");
                  setSelectedVerificationOrder(null);
                }}
                className="border border-rose-200 text-rose-700 bg-destructive/10 hover:bg-rose-100 font-extrabold py-2.5 rounded-xl transition-all text-sm active:scale-95 flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">close</span>
                Reject & Cancel
              </button>
              <button
                onClick={async () => {
                  await handleUpdateOrderStatus(selectedVerificationOrder.id, "Pending");
                  setSelectedVerificationOrder(null);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 rounded-xl transition-all text-sm active:scale-95 flex items-center justify-center gap-1 shadow-sm"
              >
                <span className="material-symbols-outlined text-sm">check</span>
                Approve Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
