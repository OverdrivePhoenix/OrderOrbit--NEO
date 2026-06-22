import { NextRequest, NextResponse } from "next/server";
import { Database, Review } from "@/data/db";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  try {
    const db = await Database.read();
    return NextResponse.json({ reviews: db.reviews });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}

// Student POST: Add item-specific review
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "student") {
      return NextResponse.json({ error: "Unauthorized: Students only" }, { status: 403 });
    }

    const { itemId, rating, comment } = await req.json();

    if (!itemId || !rating || comment === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const numRating = Number(rating);
    if (numRating < 1 || numRating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5 stars" }, { status: 400 });
    }

    if (comment.length > 250) {
      return NextResponse.json({ error: "Comment exceeds 250 characters limit" }, { status: 400 });
    }

    const db = await Database.read();

    // Enforce Relational review validation: User must have an order with this item marked as "Fulfilled"
    const hasPurchased = db.orders.some(
      (order) =>
        order.userId === user.id &&
        order.status === "Fulfilled" &&
        order.items.some((item) => item.id === itemId)
    );

    if (!hasPurchased) {
      return NextResponse.json(
        { error: "Review rejected. You can only review items you have successfully purchased and collected." },
        { status: 400 }
      );
    }

    // Check if user already reviewed this item to prevent spamming
    const alreadyReviewed = db.reviews.some(
      (r) => r.userId === user.id && r.itemId === itemId
    );
    if (alreadyReviewed) {
      return NextResponse.json({ error: "You have already reviewed this item" }, { status: 400 });
    }

    const newReview: Review = {
      id: `r_${Math.random().toString(36).substring(2, 9)}`,
      userId: user.id,
      userName: user.name,
      itemId,
      rating: numRating,
      comment: comment.trim(),
      createdAt: new Date().toISOString(),
    };

    await Database.write((db) => {
      db.reviews.push(newReview);
    });

    return NextResponse.json({ success: true, review: newReview });
  } catch (error) {
    console.error("Failed to submit review:", error);
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}
