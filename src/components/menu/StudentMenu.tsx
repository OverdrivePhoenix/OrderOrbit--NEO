"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MenuItem, Order, Review } from "@/data/db";

export default function StudentMenu() {
  const router = useRouter();
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<{ item: MenuItem; quantity: number }[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Items");
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [activeSection, setActiveSection] = useState<"menu" | "orders">("menu");
  const [clearingOrders, setClearingOrders] = useState(false);

  // Wallet is removed, we default to upi payment method
  const [paymentMethod] = useState<"wallet" | "upi">("upi");

  // Stock flashing animation state
  const [flashingItems, setFlashingItems] = useState<Record<string, boolean>>({});

  // Review states
  const [reviewItem, setReviewItem] = useState<MenuItem | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/menu");
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        const sessionRes = await fetch("/api/orders");
        if (sessionRes.ok) {
          const orderData = await sessionRes.json();
          setOrders(orderData.orders || []);
        }

        const menuData = await res.json();
        setMenu(menuData.menu || []);
      } catch (err) {
        console.error("Auth check or loading failed", err);
      }
    };

    checkAuth();

    const interval = setInterval(async () => {
      try {
        const menuRes = await fetch("/api/menu");
        if (menuRes.ok) {
          const menuData = await menuRes.json();
          const nextMenu: MenuItem[] = menuData.menu || [];
          setMenu((prevMenu) => {
            if (prevMenu.length > 0) {
              const changes: Record<string, boolean> = {};
              let hasChanges = false;
              nextMenu.forEach((newItem) => {
                const oldItem = prevMenu.find((m) => m.id === newItem.id);
                if (oldItem && oldItem.stock !== newItem.stock) {
                  changes[newItem.id] = true;
                  hasChanges = true;
                }
              });
              if (hasChanges) {
                setFlashingItems((prev) => ({ ...prev, ...changes }));
                setTimeout(() => {
                  setFlashingItems((prev) => {
                    const next = { ...prev };
                    Object.keys(changes).forEach((id) => {
                      delete next[id];
                    });
                    return next;
                  });
                }, 1500);
              }
            }
            return nextMenu;
          });
        }
        const orderRes = await fetch("/api/orders");
        if (orderRes.ok) {
          const orderData = await orderRes.json();
          setOrders(orderData.orders || []);
        }
      } catch (e) {
        console.error("Failed polling updates", e);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [router]);

  const addToCart = (item: MenuItem) => {
    if (item.stock === 0 || !item.available) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.item.id === item.id);
      if (existing) {
        const newQty = Math.min(existing.quantity + 1, item.stock);
        return prev.map((i) => (i.item.id === item.id ? { ...i, quantity: newQty } : i));
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((i) => {
          if (i.item.id === itemId) {
            const newQty = i.quantity + delta;
            if (newQty <= 0) return null;
            return { ...i, quantity: Math.min(newQty, i.item.stock) };
          }
          return i;
        })
        .filter((i): i is { item: MenuItem; quantity: number } => i !== null);
    });
  };

  const totalCartPrice = cart.reduce((sum, item) => sum + item.item.price * item.quantity, 0);
  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleClearHistory = async () => {
    setClearingOrders(true);
    try {
      const res = await fetch("/api/orders", { method: "DELETE" });
      if (res.ok) {
        setOrders((prev) => prev.filter((o) => o.status !== "Fulfilled" && o.status !== "Cancelled"));
      }
    } catch (err) {
      console.error("Failed to clear history", err);
    } finally {
      setClearingOrders(false);
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setLoadingCheckout(true);
    setCheckoutError("");

    try {
      const payload = {
        cart: cart.map((c) => ({ id: c.item.id, quantity: c.quantity, version: c.item.version })),
        paymentMethod,
      };

      const res = await fetch("/api/checkout/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Checkout failed");
      }

      setCart([]);
      window.location.href = data.url;
    } catch (err: any) {
      setCheckoutError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoadingCheckout(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewItem) return;
    setReviewLoading(true);
    setReviewError("");
    setReviewSuccess(false);

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: reviewItem.id,
          rating,
          comment,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Review submission failed");
      }

      setReviewSuccess(true);
      setComment("");
      setRating(5);
      setTimeout(() => {
        setReviewItem(null);
        setReviewSuccess(false);
      }, 1500);
    } catch (err: any) {
      setReviewError(err.message || "Failed to submit review");
    } finally {
      setReviewLoading(false);
    }
  };

  const filteredMenu = menu.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "All Items" || item.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen pb-24 md:pb-8 bg-background text-foreground">
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-card border-b border-border shadow-sm">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-3xl font-fill">restaurant_menu</span>
          <span className="font-extrabold text-2xl text-primary tracking-tight">OrderOrbit</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleLogout}
            className="text-muted-foreground hover:text-primary transition-colors text-sm font-semibold flex items-center gap-1 border border-border px-3 py-1.5 rounded-full hover:bg-muted cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">logout</span> Logout
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 pt-24">
        {/* Navigation Tabs */}
        <div className="flex gap-6 mb-6 border-b border-border">
          <button
            onClick={() => setActiveSection("menu")}
            className={`pb-3 px-1 font-bold text-sm flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeSection === "menu"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="material-symbols-outlined text-lg">restaurant_menu</span>
            Browse Canteen Menu
          </button>
          <button
            onClick={() => setActiveSection("orders")}
            className={`pb-3 px-1 font-bold text-sm flex items-center gap-1.5 border-b-2 transition-all relative cursor-pointer ${
              activeSection === "orders"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="material-symbols-outlined text-lg">receipt_long</span>
            My Orders
            {orders.filter(o => ["Pending", "Preparing", "Ready", "Pending Verification"].includes(o.status)).length > 0 && (
              <span className="absolute -top-1.5 -right-3 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                {orders.filter(o => ["Pending", "Preparing", "Ready", "Pending Verification"].includes(o.status)).length}
              </span>
            )}
          </button>
        </div>

        {activeSection === "menu" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <main className="lg:col-span-8">
              {/* Search and Category Filter */}
              <div className="mb-8">
                <div className="relative max-w-2xl w-full mb-6 group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                    search
                  </span>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-full border border-border bg-card text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm shadow-sm transition-all"
                    placeholder="Search for tasty bites..."
                  />
                </div>

                <div className="flex overflow-x-auto pb-2 gap-3 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-none">
                  {["All Items", "Breakfast", "Lunch", "Snacks", "Beverages"].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`px-5 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-all shadow-sm cursor-pointer ${
                        category === cat
                          ? "bg-primary text-primary-foreground"
                          : "bg-card text-muted-foreground hover:bg-muted border border-border"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <h2 className="font-extrabold text-2xl mb-6 text-foreground">Today's Menu</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
                {filteredMenu.map((item) => {
                  const inCart = cart.find((c) => c.item.id === item.id);
                  const isAvailable = item.available && item.stock > 0;

                  return (
                    <div
                      key={item.id}
                      className={`bg-card text-foreground rounded-2xl overflow-hidden border shadow-sm flex flex-col transition-all duration-300 hover:shadow-md ${
                        flashingItems[item.id]
                          ? "border-amber-400 scale-102 bg-amber-50/15 duration-1500 animate-pulse"
                          : "border-border"
                      } ${!isAvailable ? "opacity-75" : ""}`}
                    >
                      <div className="relative h-44 w-full overflow-hidden bg-muted">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                        />
                        <div className="absolute top-3 left-3 bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                          Ready in {item.prepTime}m
                        </div>
                        {!isAvailable && (
                          <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] flex items-center justify-center">
                            <span className="bg-card px-4 py-2 rounded-full text-sm font-extrabold text-foreground border border-border">
                              Sold Out
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="p-5 flex flex-col flex-grow">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-lg leading-tight text-foreground">{item.name}</h3>
                          <span className="text-primary font-bold text-lg">₹{(item.price / 100).toFixed(2)}</span>
                        </div>

                        <p className="text-muted-foreground text-xs mb-4 flex-grow">
                          Category: {item.category} | Remaining Servings: {item.stock}
                        </p>

                        <div className="mt-auto">
                          {inCart ? (
                            <div className="flex items-center justify-between border border-border rounded-xl h-11 px-2 bg-card">
                              <button
                                onClick={() => updateQuantity(item.id, -1)}
                                className="w-8 h-8 flex items-center justify-center text-primary rounded-lg hover:bg-muted"
                              >
                                <span className="material-symbols-outlined text-lg">remove</span>
                              </button>
                              <span className="font-bold text-sm w-8 text-center text-foreground">{inCart.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.id, 1)}
                                className="w-8 h-8 flex items-center justify-center text-primary rounded-lg hover:bg-muted"
                              >
                                <span className="material-symbols-outlined text-lg">add</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addToCart(item)}
                              disabled={!isAvailable}
                              className={`w-full font-bold text-sm py-3 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer ${
                                isAvailable
                                  ? "bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm"
                                  : "bg-muted text-muted-foreground cursor-not-allowed"
                              }`}
                            >
                              <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                              Add to Cart
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </main>

            <aside className="lg:col-span-4 sticky top-24 space-y-6">
              {/* Basket List */}
              <div className="bg-card text-foreground rounded-2xl p-6 border border-border shadow-sm">
                <h3 className="font-extrabold text-xl mb-4 flex items-center gap-2 text-foreground">
                  <span className="material-symbols-outlined text-primary">shopping_basket</span>
                  Your Basket
                </h3>

                {cart.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="material-symbols-outlined text-muted-foreground text-4xl mb-2">shopping_cart</span>
                    <p className="text-muted-foreground text-sm">Add items to configure your cart.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="divide-y divide-border max-h-72 overflow-y-auto pr-1">
                      {cart.map((c) => (
                        <div key={c.item.id} className="py-3 flex justify-between items-center gap-2">
                          <div className="flex-1">
                            <p className="font-bold text-sm text-foreground">{c.item.name}</p>
                            <p className="text-xs text-muted-foreground">₹{(c.item.price / 100).toFixed(2)} each</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(c.item.id, -1)}
                              className="w-7 h-7 bg-muted hover:bg-muted/80 rounded-full flex items-center justify-center text-primary"
                            >
                              <span className="material-symbols-outlined text-sm">remove</span>
                            </button>
                            <span className="font-semibold text-sm w-4 text-center text-foreground">{c.quantity}</span>
                            <button
                              onClick={() => updateQuantity(c.item.id, 1)}
                              className="w-7 h-7 bg-muted hover:bg-muted/80 rounded-full flex items-center justify-center text-primary"
                            >
                              <span className="material-symbols-outlined text-sm">add</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-border pt-4 mt-2">
                      <div className="flex justify-between font-bold text-sm mb-2 text-muted-foreground">
                        <span>Est. Prep Time</span>
                        <span>~{cart.reduce((max, c) => Math.max(max, c.item.prepTime), 0)} min</span>
                      </div>
                      <div className="flex justify-between font-extrabold text-lg mb-4">
                        <span className="text-foreground">Total Amount</span>
                        <span className="text-primary">₹{(totalCartPrice / 100).toFixed(2)}</span>
                      </div>

                      {checkoutError && (
                        <div className="p-3 mb-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold text-center leading-tight">
                          {checkoutError}
                        </div>
                      )}

                      <button
                        onClick={handleCheckout}
                        disabled={loadingCheckout}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold py-3.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[20px]">qr_code</span>
                        {loadingCheckout ? "Generating UPI QR..." : "Proceed to UPI Checkout"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </aside>
          </div>
        ) : (
          /* DEDICATED ORDERS SECTION */
          <div className="bg-card text-foreground rounded-2xl p-6 border border-border shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-border pb-4">
              <div>
                <h2 className="font-extrabold text-2xl text-foreground">Your Orders</h2>
                <p className="text-xs text-muted-foreground mt-1">Track active pre-orders and view historical transactions.</p>
              </div>
              {orders.some((o) => o.status === "Fulfilled" || o.status === "Cancelled") && (
                <button
                  onClick={handleClearHistory}
                  disabled={clearingOrders}
                  className="bg-muted hover:bg-muted/80 text-foreground font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">delete_sweep</span>
                  {clearingOrders ? "Clearing History..." : "Clear Order History"}
                </button>
              )}
            </div>

            {/* Active Orders Sub-section */}
            <div className="space-y-6 mb-8">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-xl">pending_actions</span>
                Active Orders
              </h3>
              {orders.filter((o) => ["Pending", "Preparing", "Ready", "Pending Verification"].includes(o.status)).length === 0 ? (
                <div className="border border-dashed border-border rounded-xl p-8 text-center text-muted-foreground text-sm bg-muted/20">
                  No active orders in progress right now. Place one from the menu!
                </div>
              ) : (
                <div className="space-y-4">
                  {orders
                    .filter((o) => ["Pending", "Preparing", "Ready", "Pending Verification"].includes(o.status))
                    .map((order) => {
                      const statusColors: Record<string, string> = {
                        Pending: "border-primary text-primary bg-primary/5",
                        Preparing: "border-amber-400 text-amber-500 bg-amber-50/5",
                        Ready: "border-secondary text-secondary bg-secondary/5",
                        "Pending Verification": "border-amber-600 text-amber-600 bg-amber-50/10",
                      };

                      return (
                        <div
                          key={order.id}
                          className="bg-card text-foreground rounded-2xl p-5 border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <span className="font-extrabold text-lg text-primary">{order.token || "#T-PENDING"}</span>
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-extrabold border ${
                                  statusColors[order.status] || "border-border"
                                }`}
                              >
                                {order.status}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Ordered on: {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <div className="mt-2 text-xs font-semibold text-foreground">
                              {order.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 justify-between md:justify-end">
                            <span className="font-bold text-primary">₹{(order.total / 100).toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* History Orders Sub-section */}
            <div className="space-y-6">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-1.5">
                <span className="material-symbols-outlined text-muted-foreground text-xl">history</span>
                Order History
              </h3>
              {orders.filter((o) => ["Fulfilled", "Cancelled"].includes(o.status)).length === 0 ? (
                <div className="border border-dashed border-border rounded-xl p-8 text-center text-muted-foreground text-sm bg-muted/20">
                  No historical orders found.
                </div>
              ) : (
                <div className="space-y-4">
                  {orders
                    .filter((o) => ["Fulfilled", "Cancelled"].includes(o.status))
                    .map((order) => {
                      const statusColors: Record<string, string> = {
                        Fulfilled: "border-secondary text-secondary bg-secondary/5",
                        Cancelled: "border-destructive text-destructive bg-destructive/5",
                      };

                      return (
                        <div
                          key={order.id}
                          className="bg-card text-foreground rounded-2xl p-5 border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 opacity-80 hover:opacity-100 transition-opacity"
                        >
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <span className="font-extrabold text-lg text-primary">{order.token || "#T-COMPLETED"}</span>
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-extrabold border ${
                                  statusColors[order.status] || "border-border"
                                }`}
                              >
                                {order.status}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Ordered on: {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <div className="mt-2 text-xs font-semibold text-foreground">
                              {order.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 justify-between md:justify-end">
                            <span className="font-bold text-primary">₹{(order.total / 100).toFixed(2)}</span>
                            {order.status === "Fulfilled" && (
                              <div className="flex gap-2">
                                {order.items.map((orderItem) => (
                                  <button
                                    key={orderItem.id}
                                    onClick={() => setReviewItem(menu.find((m) => m.id === orderItem.id) || null)}
                                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1 border border-primary/20 px-3 py-1.5 rounded-full hover:bg-primary/5 cursor-pointer"
                                  >
                                    <span className="material-symbols-outlined text-xs">rate_review</span>
                                    Review {orderItem.name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {reviewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-card text-foreground rounded-2xl max-w-md w-full border border-border p-6 shadow-xl relative animate-in fade-in zoom-in duration-150">
            <button
              onClick={() => setReviewItem(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h3 className="font-extrabold text-xl mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">rate_review</span>
              Review {reviewItem.name}
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Help canteen staff adjust recipes and improve quality. Limit 250 characters.
            </p>

            {reviewSuccess ? (
              <div className="py-6 text-center text-secondary font-bold flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-5xl">check_circle</span>
                Thank you! Review submitted.
              </div>
            ) : (
              <form onSubmit={submitReview} className="space-y-4">
                {reviewError && (
                  <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold text-center">
                    {reviewError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="text-yellow-500 hover:scale-110 transition-transform cursor-pointer"
                      >
                        <span className={`material-symbols-outlined text-3xl ${star <= rating ? "font-fill" : ""}`}>
                          star
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Comments</label>
                  <textarea
                    rows={3}
                    maxLength={250}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full rounded-xl border border-border bg-card text-foreground p-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="E.g., Batter was crispy, but potato curry was slightly salty today."
                  />
                  <div className="text-right text-[10px] text-muted-foreground mt-1">
                    {comment.length}/250 characters
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={reviewLoading}
                  className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-extrabold py-3 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">send</span>
                  {reviewLoading ? "Submitting..." : "Submit Feedback"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
