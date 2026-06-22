import { NextRequest, NextResponse } from "next/server";
import { Database, Order } from "@/data/db";
import { getSessionUser } from "@/lib/auth";

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

    // Admins see all confirmed orders (exclude pending payment)
    const confirmedOrders = db.orders.filter((o) => o.status !== "Pending Payment");
    return NextResponse.json({ orders: confirmedOrders });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

// Admin PUT: Update order status (Pending -> Preparing -> Ready -> Fulfilled)
export async function PUT(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized: Admins only" }, { status: 403 });
    }

    const { id, status } = await req.json();
    if (!id || !status) {
      return NextResponse.json({ error: "Order ID and status are required" }, { status: 400 });
    }

    const validStatuses = ["Pending", "Preparing", "Ready", "Fulfilled", "Cancelled"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    let updatedOrder: Order | null = null;

    await Database.write((db) => {
      const order = db.orders.find((o) => o.id === id);
      if (order) {
        order.status = status;
        updatedOrder = order;
      }
    });

    if (!updatedOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
