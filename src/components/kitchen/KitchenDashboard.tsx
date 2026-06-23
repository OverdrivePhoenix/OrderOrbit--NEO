"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { MenuItem, Order } from "@/data/db";
import ThemeToggle from "@/components/ThemeToggle";

export default function KitchenDashboard() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [activeTab, setActiveTab] = useState<"prep" | "stock">("prep");
  const [loading, setLoading] = useState(true);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  
  // Track previous order count to detect new orders and play notification
  const prevOrderCountRef = useRef<number>(0);

  const fetchKitchenData = async () => {
    try {
      const ordersRes = await fetch("/api/orders");
      if (ordersRes.status === 403 || ordersRes.status === 401) {
        router.push("/login");
        return;
      }
      const ordersData = await ordersRes.json();
      const fetchedOrders = ordersData.orders || [];
      setOrders(fetchedOrders);

      // Check if new orders arrived (only when not initial load)
      if (prevOrderCountRef.current > 0) {
        const currentActiveCount = fetchedOrders.filter(
          (o: Order) => o.status === "Pending"
        ).length;
        const prevActiveCount = prevOrderCountRef.current;
        if (currentActiveCount > prevActiveCount) {
          // Play subtle notification sound if browser allows
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 note
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5 note
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.4);
          } catch (e) {}
        }
      }
      prevOrderCountRef.current = fetchedOrders.filter(
        (o: Order) => o.status === "Pending"
      ).length;

      const menuRes = await fetch("/api/menu");
      const menuData = await menuRes.json();
      setMenu(menuData.menu || []);
    } catch (err) {
      console.error("Kitchen fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKitchenData();
    const interval = setInterval(fetchKitchenData, 5000); // 5s kitchen polling
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth", { method: "DELETE" });
      if (res.ok) {
        router.push("/login");
      }
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, nextStatus: string) => {
    try {
      const res = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId, status: nextStatus }),
      });
      if (res.ok) {
        fetchKitchenData();
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
        fetchKitchenData();
      }
    } catch (err) {
      console.error("Failed to update item status", err);
    }
  };

  const handleStockAdjust = async (item: MenuItem, change: number) => {
    const nextStock = Math.max(0, item.stock + change);
    setUpdatingItemId(item.id);
    try {
      const res = await fetch("/api/menu", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          stock: nextStock,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setMenu((prev) => prev.map((m) => (m.id === item.id ? data.item : m)));
      }
    } catch (err) {
      console.error("Stock adjustment failed", err);
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleToggleAvailable = async (item: MenuItem) => {
    const nextAvailability = !item.available;
    const nextStock = nextAvailability ? Math.max(item.stock, 10) : 0;
    setUpdatingItemId(item.id);
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
        const data = await res.json();
        setMenu((prev) => prev.map((m) => (m.id === item.id ? data.item : m)));
      }
    } catch (err) {
      console.error("Toggle availability failed", err);
    } finally {
      setUpdatingItemId(null);
    }
  };

  // Group active orders
  const prepOrders = orders
    .filter((o) => o.status === "Pending" || o.status === "Preparing")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); // FIFO sorting

  const readyOrders = orders
    .filter((o) => o.status === "Ready")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      {/* Premium Header */}
      <header className="bg-card border-b border-border px-6 py-4 relative z-10 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-md">
            <span className="material-symbols-outlined text-white text-2xl font-fill">restaurant</span>
          </div>
          <div>
            <h1 className="font-black text-xl tracking-tight bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
              OrderOrbit Kitchen
            </h1>
            <p className="text-muted-foreground text-xs font-semibold">Live Operational Dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-sm font-bold text-foreground">Kitchen Staff Panel</span>
            <span className="text-xs text-amber-500 flex items-center justify-end gap-1 font-semibold animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span> Live Connection
            </span>
          </div>
          
          <ThemeToggle />

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-4 py-2 bg-card hover:bg-muted text-foreground hover:text-primary rounded-xl text-sm font-bold border border-border transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">logout</span>
            Logout
          </button>
        </div>
      </header>

      {/* Tabs Bar */}
      <div className="flex border-b border-border bg-card px-6">
        <button
          onClick={() => setActiveTab("prep")}
          className={`py-4 px-6 font-bold text-sm flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === "prep"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="material-symbols-outlined text-lg">queue_play_next</span>
          FIFO Prep Queue & Pickup ({prepOrders.length + readyOrders.length})
        </button>
        <button
          onClick={() => setActiveTab("stock")}
          className={`py-4 px-6 font-bold text-sm flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === "stock"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="material-symbols-outlined text-lg">inventory</span>
          Stock & Availability ({menu.length})
        </button>
      </div>

      {/* Main Panel Content */}
      <main className="flex-grow p-6">
        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
            <p className="text-muted-foreground text-sm font-semibold">Loading kitchen console...</p>
          </div>
        ) : activeTab === "prep" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full items-start">
            {/* Prep Queue Panel */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between bg-muted/40 p-4 rounded-2xl border border-border">
                <h2 className="text-base font-extrabold flex items-center gap-2 text-primary">
                  <span className="material-symbols-outlined text-xl">soup_kitchen</span>
                  PREPARATION QUEUE (FIFO)
                </h2>
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                  {prepOrders.length} Cooking
                </span>
              </div>

              {prepOrders.length === 0 ? (
                <div className="bg-muted/20 border border-border rounded-2xl p-12 text-center flex flex-col items-center justify-center">
                  <span className="material-symbols-outlined text-muted-foreground text-5xl mb-3">cooking</span>
                  <h3 className="text-foreground font-bold text-lg mb-1">Queue is empty!</h3>
                  <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">
                    Fresh orders will appear here automatically with a sound alert. Time to relax!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {prepOrders.map((order) => {
                    const elapsed = Math.round(
                      (new Date().getTime() - new Date(order.createdAt).getTime()) / 60000
                    );
                    const isUrgent = elapsed > 10;

                    return (
                      <div
                        key={order.id}
                        className={`bg-card border rounded-2xl p-5 shadow-md flex flex-col justify-between transition-all hover:border-primary/50 ${
                          isUrgent ? "border-rose-500/40 ring-1 ring-rose-500/20 bg-rose-500/5" : "border-border"
                        }`}
                      >
                        {/* Order Header */}
                        <div>
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <span className="text-lg font-black text-foreground tracking-wider">
                                {order.token || "#NO-TOKEN"}
                              </span>
                              <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                ID: {order.id.slice(6)}
                              </div>
                            </div>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${
                                order.status === "Pending"
                                  ? "bg-primary/10 text-primary border-primary/20 animate-pulse"
                                  : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                              }`}
                            >
                              {order.status}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 mb-4 text-xs font-semibold text-muted-foreground">
                            <span className="material-symbols-outlined text-sm">schedule</span>
                            <span className={isUrgent ? "text-rose-400 font-bold" : ""}>
                              {elapsed === 0 ? "Just now" : `${elapsed} mins ago`}
                            </span>
                            {isUrgent && (
                              <span className="text-[10px] font-black uppercase text-rose-500 animate-bounce">
                                LATE
                              </span>
                            )}
                          </div>

                          {/* Items List */}
                          <div className="space-y-2 border-t border-b border-border py-3 mb-4">
                            {order.items.map((item) => (
                              <div
                                key={item.id}
                                className="flex justify-between items-center text-sm"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-amber-500 bg-amber-500/10 h-6 w-6 rounded flex items-center justify-center text-xs">
                                    {item.quantity}x
                                  </span>
                                  <span className="font-bold text-foreground">{item.name}</span>
                                </div>

                                {/* Parallel Prep Item controls */}
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() =>
                                      handleUpdateItemStatus(
                                        order.id,
                                        item.id,
                                        item.prepStatus === "Pending"
                                          ? "Preparing"
                                          : item.prepStatus === "Preparing"
                                          ? "Completed"
                                          : "Pending"
                                      )
                                    }
                                    className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                                      item.prepStatus === "Completed"
                                        ? "bg-green-500/20 text-green-500 border border-green-500/30"
                                        : item.prepStatus === "Preparing"
                                        ? "bg-amber-500/20 text-amber-500 border border-amber-500/30"
                                        : "bg-muted text-muted-foreground hover:text-foreground border border-border"
                                    }`}
                                  >
                                    {item.prepStatus || "Pending"}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Order Controls */}
                        <div className="flex gap-2 mt-2">
                          {order.status === "Pending" ? (
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, "Preparing")}
                              className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-900 dark:text-slate-950 text-xs font-black rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-base">restaurant</span>
                              Start Cooking
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, "Ready")}
                              className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-slate-900 dark:text-slate-950 text-xs font-black rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-base">notifications_active</span>
                              Mark Ready
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pickup Desk Panel */}
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-muted/40 p-4 rounded-2xl border border-border">
                <h2 className="text-base font-extrabold flex items-center gap-2 text-secondary">
                  <span className="material-symbols-outlined text-xl">countertops</span>
                  PICKUP DESK
                </h2>
                <span className="px-3 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-bold border border-secondary/20">
                  {readyOrders.length} Ready
                </span>
              </div>

              {readyOrders.length === 0 ? (
                <div className="bg-muted/20 border border-border rounded-2xl p-8 text-center flex flex-col items-center justify-center text-muted-foreground">
                  <span className="material-symbols-outlined text-muted-foreground text-4xl mb-2">hail</span>
                  <h4 className="text-foreground font-bold text-sm">No items ready for pickup</h4>
                  <p className="text-xs text-muted-foreground max-w-xs mt-1 leading-relaxed">
                    Finish cooking orders in the preparation queue to move them here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {readyOrders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-card border border-secondary/20 rounded-2xl p-4 shadow-md flex items-center justify-between hover:border-secondary/40 transition-colors"
                    >
                      <div className="space-y-1">
                        <span className="text-base font-black text-secondary tracking-wider">
                          {order.token || "#T-XXXX"}
                        </span>
                        <div className="text-xs text-muted-foreground font-bold">
                          {order.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                        </div>
                      </div>

                      <button
                        onClick={() => handleUpdateOrderStatus(order.id, "Fulfilled")}
                        className="px-4 py-2.5 bg-green-500 hover:bg-green-600 text-slate-900 dark:text-slate-950 text-xs font-black rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        Deliver
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Stock Control Panel */
          <div className="space-y-6">
            <div className="bg-muted/40 p-4 rounded-2xl border border-border flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold flex items-center gap-2 text-primary">
                  <span className="material-symbols-outlined text-xl">inventory_2</span>
                  STOCK & AVAILABILITY CONTROL
                </h2>
                <p className="text-muted-foreground text-xs mt-0.5">Toggle sold-out statuses and update servings remaining.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {menu.map((item) => (
                <div
                  key={item.id}
                  className={`bg-card border rounded-2xl p-5 shadow-md flex flex-col justify-between transition-all hover:border-border/80 ${
                    item.available ? "border-border" : "border-border/40 bg-muted/20 opacity-75"
                  }`}
                >
                  <div className="flex gap-4">
                    {/* Item Image */}
                    {item.image && (
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted flex-shrink-0 border border-border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-foreground text-sm leading-tight">{item.name}</h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border tracking-wider ${
                            item.available
                              ? "bg-green-500/10 text-green-500 border-green-500/20"
                              : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                          }`}
                        >
                          {item.available ? "In Stock" : "Sold Out"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground font-semibold">{item.category}</p>
                      <p className="text-xs font-bold text-primary">₹{(item.price / 100).toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Stock adjust & Kill-switch */}
                  <div className="mt-5 border-t border-border pt-4 flex items-center justify-between gap-4">
                    {/* Stock Counter */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Stock:</span>
                      <div className="flex items-center bg-muted rounded-xl border border-border p-1">
                        <button
                          disabled={updatingItemId === item.id || item.stock === 0}
                          onClick={() => handleStockAdjust(item, -1)}
                          className="w-7 h-7 bg-card hover:bg-muted rounded-lg text-foreground font-extrabold flex items-center justify-center transition-all disabled:opacity-50 text-sm cursor-pointer"
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-xs font-mono font-bold text-foreground">
                          {item.stock}
                        </span>
                        <button
                          disabled={updatingItemId === item.id}
                          onClick={() => handleStockAdjust(item, 1)}
                          className="w-7 h-7 bg-card hover:bg-muted rounded-lg text-foreground font-extrabold flex items-center justify-center transition-all disabled:opacity-50 text-sm cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Available toggle */}
                    <button
                      onClick={() => handleToggleAvailable(item)}
                      disabled={updatingItemId === item.id}
                      className={`px-3 py-2 rounded-xl text-xs font-black uppercase transition-all shadow-sm cursor-pointer ${
                        item.available
                          ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20"
                          : "bg-green-500 hover:bg-green-600 text-slate-900 dark:text-slate-950"
                      }`}
                    >
                      {item.available ? "Mark Sold Out" : "Mark Available"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
