import fs from "fs";
import path from "path";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// Global Mutex to synchronize all database operations
class Mutex {
  private queue: Promise<void> = Promise.resolve();

  async acquire(): Promise<() => void> {
    let release: () => void;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    const current = this.queue;
    this.queue = next;
    await current;
    return release!;
  }
}

const dbMutex = new Mutex();
const DB_FILE_PATH = path.join(process.cwd(), "src", "data", "db.json");

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "default-super-secret-key-that-is-very-long"
);

async function signOrders(orders: any[]) {
  return await new SignJWT({ orders })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
}

async function verifyOrders(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.orders as any[];
  } catch (error) {
    return [];
  }
}

async function getSessionUserFromCookie() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as {
      id: string;
      email: string;
      name: string;
      role: "student" | "staff" | "admin";
      department: string;
    };
  } catch (error) {
    return null;
  }
}

async function saveOrdersToCookie(orders: Order[]) {
  try {
    const user = await getSessionUserFromCookie();
    if (!user || user.role !== "student") return;

    const cookieStore = await cookies();
    
    // 1. Get existing orders from cookie
    const ordersToken = cookieStore.get("orbit_orders")?.value;
    const cookieOrders = ordersToken ? await verifyOrders(ordersToken) : [];
    
    // 2. Merge with database orders (which are passed as 'orders')
    const allOrdersMap = new Map<string, Order>();
    
    // Add cookie orders belonging to this user
    cookieOrders.forEach((o) => {
      if (o.userId === user.id) {
        allOrdersMap.set(o.id, o);
      }
    });
    
    // Add or update with database orders belonging to this user
    orders.forEach((o) => {
      if (o.userId === user.id) {
        allOrdersMap.set(o.id, o);
      }
    });
    
    const studentOrders = Array.from(allOrdersMap.values());
    
    // Keep active/pending/preparing/ready orders
    const activeOrders = studentOrders.filter(
      (o) => o.status !== "Cancelled" && o.status !== "Fulfilled" && o.status !== "Pending Payment"
    );
    
    // Keep completed orders
    const completedOrders = studentOrders.filter(
      (o) => o.status === "Cancelled" || o.status === "Fulfilled"
    );
    
    // Sort completed orders by creation time descending, keeping up to 10
    const sortedCompleted = completedOrders
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
      
    // Combine and limit total cookie size to 20 to avoid header overflow
    const ordersToSave = [...activeOrders, ...sortedCompleted].slice(0, 20);

    const token = await signOrders(ordersToSave);
    cookieStore.set("orbit_orders", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });
  } catch (e) {
    // Ignore if cookies() is called outside request context
  }
}

async function saveWalletToCookie(userId: string, balance: number) {
  try {
    const cookieStore = await cookies();
    cookieStore.set(`orbit_wallet_${userId}`, balance.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });
  } catch (e) {
    // Ignore
  }
}

export interface User {
  id: string;
  email: string;
  password_hash?: string | null;
  name: string;
  role: "student" | "staff" | "admin";
  status: "pending" | "approved" | "active";
  department: string;
  studentId?: string;
  activationToken?: string | null;
  walletBalance?: number; // In paise (Campus credits)
}

export interface MenuItem {
  id: string;
  name: string;
  price: number; // in paise
  prepTime: number; // in minutes
  stock: number;
  category: string;
  image: string;
  available: boolean;
  version?: number; // Optimistic locking version
}

export interface OrderItem {
  id: string;
  name: string;
  price: number; // in paise
  quantity: number;
  category?: string; // category for parallel queues
  prepStatus?: "Pending" | "Preparing" | "Completed"; // status for parallel queues
}

export interface Order {
  id: string;
  token?: string; // e.g. #T-1024
  userId: string;
  items: OrderItem[];
  total: number; // in paise
  status: "Pending Payment" | "Pending Verification" | "Pending" | "Preparing" | "Ready" | "Fulfilled" | "Cancelled";
  sessionId: string; // UPI session ID
  utr?: string; // 12-digit UPI UTR Code
  screenshotUrl?: string; // base64 receipt representation
  verifiedBy?: "AI" | "Admin" | null;
  createdAt: string;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  itemId: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
  aggregated?: boolean; // daily cron aggregation flag
  spam?: boolean; // spam classification flag
}

export interface DailySummary {
  id: string;
  date: string;
  summary: string;
}

export interface DatabaseSchema {
  users: User[];
  menu: MenuItem[];
  orders: Order[];
  reviews: Review[];
  dailySummaries: DailySummary[];
}

export class Database {
  private static readRaw(): DatabaseSchema {
    try {
      const data = fs.readFileSync(DB_FILE_PATH, "utf8");
      return JSON.parse(data);
    } catch (error) {
      console.error("Failed to read database file:", error);
      return { users: [], menu: [], orders: [], reviews: [], dailySummaries: [] };
    }
  }

  private static writeRaw(data: DatabaseSchema) {
    try {
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), "utf8");
    } catch (error) {
      console.error("Failed to write to database file:", error);
    }
  }

  static async read(): Promise<DatabaseSchema> {
    const release = await dbMutex.acquire();
    try {
      const db = this.readRaw();

      // Load orders and wallet balance from cookies (for serverless persistence)
      try {
        const cookieStore = await cookies();

        // 1. Merge orders
        const ordersToken = cookieStore.get("orbit_orders")?.value;
        if (ordersToken) {
          const cookieOrders = await verifyOrders(ordersToken);
          cookieOrders.forEach((co) => {
            const existingIdx = db.orders.findIndex((o) => o.id === co.id);
            if (existingIdx >= 0) {
              const existing = db.orders[existingIdx];
              // Merge if cookie order has same or later timestamp
              if (new Date(co.createdAt).getTime() >= new Date(existing.createdAt).getTime()) {
                db.orders[existingIdx] = co;
              }
            } else {
              db.orders.push(co);
            }
          });
        }

        // 2. Load wallet balances
        db.users.forEach((u) => {
          const val = cookieStore.get(`orbit_wallet_${u.id}`)?.value;
          if (val) {
            u.walletBalance = parseInt(val, 10);
          }
        });
      } catch (err) {}

      return db;
    } finally {
      release();
    }
  }

  static async write(updater: (db: DatabaseSchema) => void): Promise<DatabaseSchema> {
    const release = await dbMutex.acquire();
    try {
      const db = this.readRaw();
      updater(db);
      this.writeRaw(db);

      // Update cookies
      try {
        await saveOrdersToCookie(db.orders);
        for (const u of db.users) {
          if (u.walletBalance !== undefined) {
            await saveWalletToCookie(u.id, u.walletBalance);
          }
        }
      } catch (err) {}

      return db;
    } finally {
      release();
    }
  }

  /**
   * ATOMIC TRANSACTION: Check stock and reserve immediately before rendering UPI QR.
   */
  static async reserveStock(
    cartItems: { id: string; quantity: number; version?: number }[],
    userId: string,
    sessionId: string
  ): Promise<Order> {
    const release = await dbMutex.acquire();
    try {
      const db = this.readRaw();

      // 1. Verify availability and stock for all items
      for (const cartItem of cartItems) {
        const menuItem = db.menu.find((item) => item.id === cartItem.id);
        if (!menuItem) {
          throw new Error(`Menu item not found: ${cartItem.id}`);
        }
        if (!menuItem.available) {
          throw new Error(`"${menuItem.name}" is currently sold out!`);
        }
        if (menuItem.stock < cartItem.quantity) {
          throw new Error(`Insufficient stock for "${menuItem.name}". Only ${menuItem.stock} servings remaining.`);
        }
        // Concurrency Check (Optimistic Locking)
        if (cartItem.version !== undefined && menuItem.version !== undefined && menuItem.version !== cartItem.version) {
          throw new Error(`Concurrency collision: "${menuItem.name}" was modified by another transaction. Please reload the menu and try again.`);
        }
      }

      // 2. Decrement stock, calculate totals, increment version
      const orderItems: OrderItem[] = [];
      let total = 0;

      for (const cartItem of cartItems) {
        const menuItem = db.menu.find((item) => item.id === cartItem.id)!;
        menuItem.stock -= cartItem.quantity;
        
        // Optimistic locking version increment
        if (menuItem.version === undefined) {
          menuItem.version = 1;
        }
        menuItem.version += 1;
        
        if (menuItem.stock === 0) {
          menuItem.available = false;
        }

        orderItems.push({
          id: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: cartItem.quantity,
          category: menuItem.category, // store item category for prep queues
          prepStatus: "Pending", // default parallel prep status
        });
        total += menuItem.price * cartItem.quantity;
      }

      // 3. Create a Pending Payment Order
      const newOrder: Order = {
        id: `order_${Math.random().toString(36).substring(2, 9)}`,
        userId,
        items: orderItems,
        total,
        status: "Pending Payment",
        sessionId,
        createdAt: new Date().toISOString(),
      };

      db.orders.push(newOrder);
      this.writeRaw(db);
      await saveOrdersToCookie(db.orders);
      return newOrder;
    } finally {
      release();
    }
  }

  /**
   * RELEASE RESERVED STOCK: If payment is cancelled or expires, restore stock.
   */
  static async releaseReservedStock(sessionId: string): Promise<void> {
    const release = await dbMutex.acquire();
    try {
      const db = this.readRaw();
      const order = db.orders.find((o) => o.sessionId === sessionId && (o.status === "Pending Payment" || o.status === "Pending Verification"));
      
      if (!order) return;

      // Restore stock for all items in the order
      for (const orderItem of order.items) {
        const menuItem = db.menu.find((m) => m.id === orderItem.id);
        if (menuItem) {
          menuItem.stock += orderItem.quantity;
          menuItem.available = true; // reactivate availability badge
        }
      }

      order.status = "Cancelled";
      this.writeRaw(db);
      await saveOrdersToCookie(db.orders);
    } finally {
      release();
    }
  }

  /**
   * SUBMIT FOR MANUAL VERIFICATION: If AI fails, save UTR and receipt screenshot for Admin.
   */
  static async submitForVerification(sessionId: string, utr: string, screenshotUrl: string): Promise<Order | null> {
    const release = await dbMutex.acquire();
    try {
      const db = this.readRaw();
      const order = db.orders.find((o) => o.sessionId === sessionId);
      if (!order) return null;

      order.status = "Pending Verification";
      order.utr = utr;
      order.screenshotUrl = screenshotUrl;
      order.verifiedBy = null;

      this.writeRaw(db);
      await saveOrdersToCookie(db.orders);
      return order;
    } finally {
      release();
    }
  }

  /**
   * CONFIRM ORDER: Confirm payment (via AI auto-approval or Admin manual approval).
   */
  static async confirmOrder(sessionId: string, utr: string, verifiedBy: "AI" | "Admin"): Promise<Order | null> {
    const release = await dbMutex.acquire();
    try {
      const db = this.readRaw();
      const order = db.orders.find((o) => o.sessionId === sessionId);
      
      if (!order) return null;

      // Transition to active Pending (kitchen prep)
      order.token = this.generateToken(db);
      order.status = "Pending";
      order.utr = utr;
      order.verifiedBy = verifiedBy;
      order.createdAt = new Date().toISOString();
      
      this.writeRaw(db);
      await saveOrdersToCookie(db.orders);
      return order;
    } finally {
      release();
    }
  }

  private static generateToken(db: DatabaseSchema): string {
    let nextTokenNumber = 1024;
    const activeTokens = db.orders
      .map((o) => o.token)
      .filter((t): t is string => !!t && t.startsWith("#T-"));

    if (activeTokens.length > 0) {
      const numbers = activeTokens.map((t) => parseInt(t.replace("#T-", ""), 10));
      nextTokenNumber = Math.max(...numbers) + 1;
    }

    return `#T-${nextTokenNumber}`;
  }

  /**
   * WALLET TRANSACTION: Check and deduct wallet credits, reserve stock, and confirm order atomically.
   */
  static async payWithWallet(
    cartItems: { id: string; quantity: number; version?: number }[],
    userId: string,
    sessionId: string
  ): Promise<Order> {
    const release = await dbMutex.acquire();
    try {
      const db = this.readRaw();

      // 1. Verify user exists and check wallet balance
      const user = db.users.find((u) => u.id === userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Calculate total price in paise
      let total = 0;
      for (const cartItem of cartItems) {
        const menuItem = db.menu.find((item) => item.id === cartItem.id);
        if (!menuItem) {
          throw new Error(`Menu item not found: ${cartItem.id}`);
        }
        if (!menuItem.available) {
          throw new Error(`"${menuItem.name}" is currently sold out!`);
        }
        if (menuItem.stock < cartItem.quantity) {
          throw new Error(`Insufficient stock for "${menuItem.name}". Only ${menuItem.stock} servings remaining.`);
        }
        if (cartItem.version !== undefined && menuItem.version !== undefined && menuItem.version !== cartItem.version) {
          throw new Error(`Concurrency collision: "${menuItem.name}" was modified by another transaction. Please reload the menu and try again.`);
        }
        total += menuItem.price * cartItem.quantity;
      }

      const balance = user.walletBalance || 0;
      if (balance < total) {
        throw new Error(`Insufficient wallet balance. Total: ₹${(total / 100).toFixed(2)}, Balance: ₹${(balance / 100).toFixed(2)}`);
      }

      // 2. Deduct wallet balance
      user.walletBalance = balance - total;

      // 3. Decrement stock, calculate totals, increment version
      const orderItems: OrderItem[] = [];
      for (const cartItem of cartItems) {
        const menuItem = db.menu.find((item) => item.id === cartItem.id)!;
        menuItem.stock -= cartItem.quantity;
        
        if (menuItem.version === undefined) {
          menuItem.version = 1;
        }
        menuItem.version += 1;
        
        if (menuItem.stock === 0) {
          menuItem.available = false;
        }

        orderItems.push({
          id: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: cartItem.quantity,
          category: menuItem.category,
          prepStatus: "Pending",
        });
      }

      // 4. Create confirmed order immediately
      const newOrder: Order = {
        id: `order_${Math.random().toString(36).substring(2, 9)}`,
        userId,
        items: orderItems,
        total,
        status: "Pending",
        sessionId,
        token: this.generateToken(db),
        createdAt: new Date().toISOString(),
        verifiedBy: "Admin", // auto wallet verification
      };

      db.orders.push(newOrder);
      this.writeRaw(db);
      await saveWalletToCookie(user.id, user.walletBalance);
      await saveOrdersToCookie(db.orders);
      return newOrder;
    } finally {
      release();
    }
  }

  /**
   * WALLET TOPUP: Atomically add credits to the student wallet.
   */
  static async topupWallet(userId: string, amount: number): Promise<number> {
    const release = await dbMutex.acquire();
    try {
      const db = this.readRaw();
      const user = db.users.find((u) => u.id === userId);
      if (!user) {
        throw new Error("User not found");
      }
      user.walletBalance = (user.walletBalance || 0) + amount;
      this.writeRaw(db);
      await saveWalletToCookie(user.id, user.walletBalance);
      return user.walletBalance;
    } finally {
      release();
    }
  }

  /**
   * PARALLEL QUEUE ITEM STATUS UPDATE: Update preparation status of a specific item within an order.
   * If all items are Completed, the order status transitions to "Ready".
   */
  static async updateOrderItemStatus(
    orderId: string,
    itemId: string,
    newPrepStatus: "Pending" | "Preparing" | "Completed"
  ): Promise<Order | null> {
    const release = await dbMutex.acquire();
    try {
      const db = this.readRaw();
      const order = db.orders.find((o) => o.id === orderId);
      if (!order) return null;

      const item = order.items.find((i) => i.id === itemId);
      if (item) {
        item.prepStatus = newPrepStatus;
      }

      // Check if ALL items in this order are now "Completed"
      const allCompleted = order.items.every((i) => i.prepStatus === "Completed");
      if (allCompleted && order.status !== "Ready" && order.status !== "Fulfilled" && order.status !== "Cancelled") {
        order.status = "Ready";
      } else if (order.status === "Pending" || order.status === "Preparing") {
        const anyPreparing = order.items.some((i) => i.prepStatus === "Preparing" || i.prepStatus === "Completed");
        if (anyPreparing) {
          order.status = "Preparing";
        }
      }

      this.writeRaw(db);
      await saveOrdersToCookie(db.orders);
      return order;
    } finally {
      release();
    }
  }
}
