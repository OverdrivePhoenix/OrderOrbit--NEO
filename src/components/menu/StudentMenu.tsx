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
          setMenu(menuData.menu || []);
        }
        const orderRes = await fetch("/api/orders");
        if (orderRes.ok) {
          const orderData = await orderRes.json();
          setOrders(orderData.orders || []);
        }
      } catch (e) {
        console.error("Failed polling updates", e);
      }
    }, 10000);

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

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setLoadingCheckout(true);
    setCheckoutError("");

    try {
      const payload = {
        cart: cart.map((c) => ({ id: c.item.id, quantity: c.quantity })),
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
    <div className="min-h-screen pb-24 md:pb-8 bg-[#f7f9ff]">
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-white shadow-sm border-b border-outline-variant/10">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-3xl font-fill">restaurant_menu</span>
          <span className="font-extrabold text-2xl text-primary tracking-tight">OrderOrbit</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleLogout}
            className="text-on-surface-variant hover:text-primary transition-colors text-sm font-semibold flex items-center gap-1 border border-outline-variant/30 px-3 py-1.5 rounded-full hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-sm">logout</span> Logout
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 pt-24 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <main className="lg:col-span-8">
          <div className="mb-8">
            <div className="relative max-w-2xl w-full mb-6 group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">
                search
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-full border border-outline-variant/40 bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm shadow-sm transition-all"
                placeholder="Search for tasty bites..."
              />
            </div>

            <div className="flex overflow-x-auto pb-2 gap-3 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-none">
              {["All Items", "Breakfast", "Lunch", "Snacks", "Beverages"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-5 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-all shadow-sm ${
                    category === cat
                      ? "bg-primary-container text-on-primary-container"
                      : "bg-white text-on-surface-variant hover:bg-surface-container border border-outline-variant/20"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <h2 className="font-extrabold text-2xl mb-6">Today's Menu</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
            {filteredMenu.map((item) => {
              const inCart = cart.find((c) => c.item.id === item.id);
              const isAvailable = item.available && item.stock > 0;

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl overflow-hidden border border-outline-variant/20 shadow-sm flex flex-col transition-all duration-300 hover:shadow-md ${
                    !isAvailable ? "opacity-75" : ""
                  }`}
                >
                  <div className="relative h-44 w-full overflow-hidden bg-gray-100">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                    <div className="absolute top-3 left-3 bg-secondary text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                      Ready in {item.prepTime}m
                    </div>
                    {!isAvailable && (
                      <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
                        <span className="bg-surface px-4 py-2 rounded-full text-sm font-extrabold text-on-surface border border-outline-variant/40">
                          Sold Out
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-5 flex flex-col flex-grow">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg leading-tight">{item.name}</h3>
                      <span className="text-[#006a62] font-bold text-lg">₹{(item.price / 100).toFixed(2)}</span>
                    </div>

                    <p className="text-on-surface-variant text-xs mb-4 flex-grow">
                      Category: {item.category} | Remaining Servings: {item.stock}
                    </p>

                    <div className="mt-auto">
                      {inCart ? (
                        <div className="flex items-center justify-between border border-outline-variant/60 rounded-xl h-11 px-2 bg-white">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-8 h-8 flex items-center justify-center text-primary rounded-lg hover:bg-surface-container"
                          >
                            <span className="material-symbols-outlined text-lg">remove</span>
                          </button>
                          <span className="font-bold text-sm w-8 text-center">{inCart.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-8 h-8 flex items-center justify-center text-primary rounded-lg hover:bg-surface-container"
                          >
                            <span className="material-symbols-outlined text-lg">add</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(item)}
                          disabled={!isAvailable}
                          className={`w-full font-bold text-sm py-3 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 ${
                            isAvailable
                              ? "bg-primary hover:bg-surface-tint text-white shadow-sm"
                              : "bg-[#e3efff] text-on-surface-variant cursor-not-allowed"
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

          <section className="mb-12">
            <h3 className="font-extrabold text-xl mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">schedule</span>
              Active Orders & Pre-Order Tokens
            </h3>

            {orders.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center border border-outline-variant/20">
                <p className="text-on-surface-variant text-sm">No active orders placed yet today.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  const statusColors: Record<string, string> = {
                    Pending: "border-primary text-primary bg-primary/5",
                    Preparing: "border-gray-400 text-gray-500 bg-gray-50",
                    Ready: "border-secondary text-secondary bg-secondary/5",
                    Fulfilled: "border-[#1e3244] text-[#1e3244] bg-[#edf4ff]",
                    Cancelled: "border-tertiary text-tertiary bg-tertiary/5",
                  };

                  return (
                    <div
                      key={order.id}
                      className="bg-white rounded-2xl p-5 border border-outline-variant/20 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-extrabold text-lg text-primary">{order.token || "#T-PENDING"}</span>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-extrabold border ${
                              statusColors[order.status] || "border-outline-variant"
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant">
                          Ordered on: {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <div className="mt-2 text-xs font-semibold">
                          {order.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 justify-between md:justify-end">
                        <span className="font-bold text-[#006a62]">₹{(order.total / 100).toFixed(2)}</span>
                        {order.status === "Fulfilled" && (
                          <div className="flex gap-2">
                            {order.items.map((orderItem) => (
                              <button
                                key={orderItem.id}
                                onClick={() => setReviewItem(menu.find((m) => m.id === orderItem.id) || null)}
                                className="text-xs font-bold text-primary hover:underline flex items-center gap-1 border border-primary/20 px-3 py-1.5 rounded-full hover:bg-primary/5"
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
          </section>
        </main>

        <aside className="lg:col-span-4">
          <div className="bg-white rounded-2xl p-6 border border-outline-variant/20 shadow-sm sticky top-24">
            <h3 className="font-extrabold text-xl mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">shopping_basket</span>
              Your Basket
            </h3>

            {cart.length === 0 ? (
              <div className="text-center py-12">
                <span className="material-symbols-outlined text-on-surface-variant text-4xl mb-2">shopping_cart</span>
                <p className="text-on-surface-variant text-sm">Add items to configure your cart.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="divide-y divide-outline-variant/10 max-h-72 overflow-y-auto pr-1">
                  {cart.map((c) => (
                    <div key={c.item.id} className="py-3 flex justify-between items-center gap-2">
                      <div className="flex-1">
                        <p className="font-bold text-sm">{c.item.name}</p>
                        <p className="text-xs text-on-surface-variant">₹{(c.item.price / 100).toFixed(2)} each</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(c.item.id, -1)}
                          className="w-7 h-7 bg-surface-container hover:bg-surface-container-high rounded-full flex items-center justify-center text-primary"
                        >
                          <span className="material-symbols-outlined text-sm">remove</span>
                        </button>
                        <span className="font-semibold text-sm w-4 text-center">{c.quantity}</span>
                        <button
                          onClick={() => updateQuantity(c.item.id, 1)}
                          className="w-7 h-7 bg-surface-container hover:bg-surface-container-high rounded-full flex items-center justify-center text-primary"
                        >
                          <span className="material-symbols-outlined text-sm">add</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-outline-variant/20 pt-4 mt-2">
                  <div className="flex justify-between font-bold text-sm mb-2 text-on-surface-variant">
                    <span>Est. Prep Time</span>
                    <span>~{cart.reduce((max, c) => Math.max(max, c.item.prepTime), 0)} min</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-lg mb-4">
                    <span>Total Amount</span>
                    <span className="text-[#006a62]">₹{(totalCartPrice / 100).toFixed(2)}</span>
                  </div>

                  {checkoutError && (
                    <div className="p-3 mb-4 rounded-xl bg-tertiary-container/20 border border-tertiary-container text-tertiary text-xs font-semibold text-center leading-tight">
                      {checkoutError}
                    </div>
                  )}

                  <button
                    onClick={handleCheckout}
                    disabled={loadingCheckout}
                    className="w-full bg-primary hover:bg-surface-tint text-white font-extrabold py-3.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
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

      {reviewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full border border-outline-variant/20 p-6 shadow-xl relative animate-in fade-in zoom-in duration-150">
            <button
              onClick={() => setReviewItem(null)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h3 className="font-extrabold text-xl mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">rate_review</span>
              Review {reviewItem.name}
            </h3>
            <p className="text-xs text-on-surface-variant mb-4">
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
                  <div className="p-3 rounded-xl bg-tertiary-container/20 border border-tertiary-container text-tertiary text-xs font-semibold text-center">
                    {reviewError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-on-surface mb-2">Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="text-yellow-500 hover:scale-110 transition-transform"
                      >
                        <span className={`material-symbols-outlined text-3xl ${star <= rating ? "font-fill" : ""}`}>
                          star
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-on-surface mb-2">Comments</label>
                  <textarea
                    rows={3}
                    maxLength={250}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full rounded-xl border border-outline-variant/40 p-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="E.g., Batter was crispy, but potato curry was slightly salty today."
                  />
                  <div className="text-right text-[10px] text-on-surface-variant mt-1">
                    {comment.length}/250 characters
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={reviewLoading}
                  className="w-full bg-primary hover:bg-surface-tint text-white font-extrabold py-3 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
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
