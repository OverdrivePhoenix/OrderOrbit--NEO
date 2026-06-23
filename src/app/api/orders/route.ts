import { NextRequest, NextResponse } from "next/server";
import { Database, Order } from "@/data/db";
import { getSessionUser, verifyOrders, signOrders } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await Database.read();

    // Students only see their own orders (except pending payments)
    if (user.role === "student") {
      const studentOrders = db.orders.filter(
        (o) => o.userId === user.id && o.status !== "Pending Payment"
      );
      return NextResponse.json({ orders: studentOrders });
    }

    // Admins and Staff see all confirmed orders (exclude pending payment)
    if (user.role === "admin" || user.role === "staff") {
      const confirmedOrders = db.orders.filter((o) => o.status !== "Pending Payment");
      return NextResponse.json({ orders: confirmedOrders });
    }

    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

// Admin PUT: Update order status or individual order item prep status
export async function PUT(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== "admin" && user.role !== "staff")) {
      return NextResponse.json({ error: "Unauthorized: Admins or Staff only" }, { status: 403 });
    }

    const { id, status, itemId, itemStatus } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    let updatedOrder: Order | null = null;

    if (itemId && itemStatus) {
      const validItemStatuses = ["Pending", "Preparing", "Completed"];
      if (!validItemStatuses.includes(itemStatus)) {
        return NextResponse.json({ error: "Invalid item status" }, { status: 400 });
      }

      // Update specific item status in parallel category queue
      updatedOrder = await Database.updateOrderItemStatus(id, itemId, itemStatus);
    } else if (status) {
      const validStatuses = ["Pending", "Preparing", "Ready", "Fulfilled", "Cancelled"];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }

      await Database.write((db) => {
        const order = db.orders.find((o) => o.id === id);
        if (order) {
          // If transitioning from Pending Verification to Pending (approved), assign token and set verifiedBy
          if (order.status === "Pending Verification" && status === "Pending") {
            if (user.role !== "admin") {
              throw new Error("Only admins can verify manual UPI payments");
            }
            if (!order.token) {
              let nextTokenNumber = 1024;
              const activeTokens = db.orders
                .map((o) => o.token)
                .filter((t): t is string => !!t && t.startsWith("#T-"));

              if (activeTokens.length > 0) {
                const numbers = activeTokens.map((t) => parseInt(t.replace("#T-", ""), 10));
                nextTokenNumber = Math.max(...numbers) + 1;
              }
              order.token = `#T-${nextTokenNumber}`;
            }
            order.verifiedBy = "Admin";
            order.createdAt = new Date().toISOString();
          }

          // Restore stock if transitioning to Cancelled from any active/pending state
          if (status === "Cancelled" && order.status !== "Cancelled" && order.status !== "Fulfilled") {
            for (const orderItem of order.items) {
              const menuItem = db.menu.find((m) => m.id === orderItem.id);
              if (menuItem) {
                menuItem.stock += orderItem.quantity;
                menuItem.available = true; // reactivate availability badge
              }
            }
          }

          order.status = status as any;
          updatedOrder = order;
        }
      });
    } else {
      return NextResponse.json({ error: "Either status or itemId/itemStatus is required" }, { status: 400 });
    }

    if (!updatedOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Sync updated order in cookies
    const ordersToken = req.cookies.get("orbit_orders")?.value;
    const cookieOrders = ordersToken ? await verifyOrders(ordersToken) : [];
    const existingIdx = cookieOrders.findIndex((o) => o.id === id);
    if (existingIdx >= 0) {
      cookieOrders[existingIdx] = { ...cookieOrders[existingIdx], ...updatedOrder };
    } else {
      cookieOrders.push(updatedOrder);
    }
    const newToken = await signOrders(cookieOrders);

    const response = NextResponse.json({ success: true, order: updatedOrder });
    response.cookies.set("orbit_orders", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });
    return response;
  } catch (error: any) {
    console.error("Failed to update order:", error);
    return NextResponse.json({ error: error.message || "Failed to update order" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await Database.write((db) => {
      db.orders = db.orders.filter(
        (o) => !(o.userId === user.id && (o.status === "Fulfilled" || o.status === "Cancelled"))
      );
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to clear order history:", error);
    return NextResponse.json({ error: error.message || "Failed to clear order history" }, { status: 500 });
  }
}

