import { NextRequest, NextResponse } from "next/server";
import { Database, MenuItem } from "@/data/db";
import { getSessionUser } from "@/lib/auth";

// Public GET: returns the live menu items
export async function GET() {
  try {
    const db = await Database.read();
    return NextResponse.json({ menu: db.menu });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load menu" }, { status: 500 });
  }
}

// Admin POST: Add new item
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized: Admins only" }, { status: 403 });
    }

    const body = await req.json();
    const { name, price, prepTime, stock, category, image } = body;

    if (!name || price === undefined || prepTime === undefined || stock === undefined || !category) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const newItem: MenuItem = {
      id: `m_${Math.random().toString(36).substring(2, 9)}`,
      name,
      price: Number(price), // price in cents
      prepTime: Number(prepTime),
      stock: Number(stock),
      category,
      image: image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=400&auto=format&fit=crop",
      available: Number(stock) > 0,
    };

    await Database.write((db) => {
      db.menu.push(newItem);
    });

    return NextResponse.json({ success: true, item: newItem });
  } catch (error) {
    console.error("Failed to add menu item:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Admin PUT: Update item details or toggle availability (instant kill-switch)
export async function PUT(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== "admin" && user.role !== "staff")) {
      return NextResponse.json({ error: "Unauthorized: Admins or Staff only" }, { status: 403 });
    }

    const body = await req.json();
    const { id, name, price, prepTime, stock, category, image, available } = body;

    if (!id) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }

    let updatedItem: MenuItem | null = null;

    await Database.write((db) => {
      const idx = db.menu.findIndex((m) => m.id === id);
      if (idx !== -1) {
        if (user.role === "admin") {
          db.menu[idx] = {
            ...db.menu[idx],
            name: name !== undefined ? name : db.menu[idx].name,
            price: price !== undefined ? Number(price) : db.menu[idx].price,
            prepTime: prepTime !== undefined ? Number(prepTime) : db.menu[idx].prepTime,
            stock: stock !== undefined ? Number(stock) : db.menu[idx].stock,
            category: category !== undefined ? category : db.menu[idx].category,
            image: image !== undefined ? image : db.menu[idx].image,
            available: available !== undefined ? Boolean(available) : db.menu[idx].available,
          };
        } else {
          // Kitchen Staff role: only allowed to update stock & availability
          db.menu[idx] = {
            ...db.menu[idx],
            stock: stock !== undefined ? Number(stock) : db.menu[idx].stock,
            available: available !== undefined ? Boolean(available) : db.menu[idx].available,
          };
        }

        // If stock is updated to 0, force available to false
        if (db.menu[idx].stock === 0 && stock !== undefined) {
          db.menu[idx].available = false;
        }
        // If stock is incremented, and available is not explicitly toggled, set it to true
        if (db.menu[idx].stock > 0 && stock !== undefined && available === undefined) {
          db.menu[idx].available = true;
        }

        updatedItem = db.menu[idx];
      }
    });

    if (!updatedItem) {
      return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, item: updatedItem });
  } catch (error) {
    console.error("Failed to update menu item:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Admin DELETE: Remove item by ID
export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized: Admins only" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }

    let deleted = false;
    await Database.write((db) => {
      const idx = db.menu.findIndex((m) => m.id === id);
      if (idx !== -1) {
        db.menu.splice(idx, 1);
        deleted = true;
      }
    });

    if (!deleted) {
      return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Menu item deleted successfully." });
  } catch (error) {
    console.error("Failed to delete menu item:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
