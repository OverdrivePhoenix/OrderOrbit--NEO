import fs from "fs";
import path from "path";

// A simple global async Mutex to synchronize all database operations
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
  price: number; // in cents
  prepTime: number; // in minutes
  stock: number;
  category: string;
  image: string;
  available: boolean;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number; // in cents
  quantity: number;
}

export interface Order {
  id: string;
  token?: string; // e.g. #T-1024
  userId: string;
  items: OrderItem[];
  total: number;
  status: "Pending Payment" | "Pending" | "Preparing" | "Ready" | "Fulfilled" | "Cancelled";
  sessionId: string; // Stripe Session ID
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
  summary: string; // Markdown text
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

  // Generic lock-wrapped read
  static async read(): Promise<DatabaseSchema> {
    const release = await dbMutex.acquire();
    try {
      return this.readRaw();
    } finally {
      release();
    }
  }

  // Generic lock-wrapped write
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
   * ATOMIC TRANSACTION: Check stock and reserve immediately before Stripe session creation.
   * If stock is insufficient, throws an error.
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
          throw new Error(`Insufficient stock for "${menuItem.name}". Only ${menuItem.stock} items remaining.`);
        }
      }

      // 2. Decrement stock and calculate totals
      const orderItems: OrderItem[] = [];
      let total = 0;

      for (const cartItem of cartItems) {
        const menuItem = db.menu.find((item) => item.id === cartItem.id)!;
        menuItem.stock -= cartItem.quantity;
        
        // Auto sold out toggle if stock hits zero
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

      // Save database changes
      this.writeRaw(db);
      return newOrder;
    } finally {
      release();
    }
  }

  /**
   * RELEASE RESERVED STOCK: If Stripe payment fails or is cancelled, restore stock.
   */
  static async releaseReservedStock(sessionId: string): Promise<void> {
    const release = await dbMutex.acquire();
    try {
      const db = this.readRaw();
      const order = db.orders.find((o) => o.sessionId === sessionId && o.status === "Pending Payment");
      
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
   * CONFIRM ORDER: Upon Stripe webhook confirmation, finalize the order and generate token.
   */
  static async confirmOrder(sessionId: string): Promise<Order | null> {
    const release = await dbMutex.acquire();
    try {
      const db = this.readRaw();
      const order = db.orders.find((o) => o.sessionId === sessionId);
      
      if (!order) return null;

      // Only transition if not already confirmed
      if (order.status === "Pending Payment" || order.status === "Cancelled") {
        // Generate sequential token #T-XXXX
        let nextTokenNumber = 1024;
        const activeTokens = db.orders
          .map((o) => o.token)
          .filter((t): t is string => !!t && t.startsWith("#T-"));

        if (activeTokens.length > 0) {
          const numbers = activeTokens.map((t) => parseInt(t.replace("#T-", ""), 10));
          nextTokenNumber = Math.max(...numbers) + 1;
        }

        order.token = `#T-${nextTokenNumber}`;
        order.status = "Pending";
        order.createdAt = new Date().toISOString(); // refresh timestamp on confirmation
        
        this.writeRaw(db);
      }
      
      return order;
    } finally {
      release();
    }
  }
}
