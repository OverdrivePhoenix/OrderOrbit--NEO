import fs from "fs";
import path from "path";

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

export interface User {
  id: string;
  email: string;
  password?: string;
  name: string;
  role: "student" | "admin";
  department: string;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number; // in cents/paise (INR equivalent in paise, e.g. Rs. 40 = 4000 paise)
  prepTime: number; // in minutes
  stock: number;
  category: string;
  image: string;
  available: boolean;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number; // in paise
  quantity: number;
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
      return this.readRaw();
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
      return db;
    } finally {
      release();
    }
  }

  /**
   * ATOMIC TRANSACTION: Check stock and reserve immediately before rendering UPI QR.
   */
  static async reserveStock(
    cartItems: { id: string; quantity: number }[],
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
      }

      // 2. Decrement stock and calculate totals
      const orderItems: OrderItem[] = [];
      let total = 0;

      for (const cartItem of cartItems) {
        const menuItem = db.menu.find((item) => item.id === cartItem.id)!;
        menuItem.stock -= cartItem.quantity;
        
        if (menuItem.stock === 0) {
          menuItem.available = false;
        }

        orderItems.push({
          id: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: cartItem.quantity,
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
}
