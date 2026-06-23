import { NextRequest, NextResponse } from "next/server";
import { Database, Review, DailySummary } from "@/data/db";

// Helper to check for spam offline (fallback)
function simpleSpamFilter(comment: string): boolean {
  const spamKeywords = ["buy", "discount", "free money", "promo", "crypto", "http://", "https://", "earn cash", "viagra", "follow me"];
  const text = comment.toLowerCase();
  return spamKeywords.some(kw => text.includes(kw)) || comment.length < 3;
}

export async function POST(req: NextRequest) {
  try {
    // Fetch unaggregated reviews
    const db = await Database.read();
    const unaggregatedReviews = db.reviews.filter((r) => !r.aggregated);

    if (unaggregatedReviews.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No new unaggregated reviews found.",
      });
    }

    const items = db.menu;
    const reviewData = unaggregatedReviews
      .map((r) => {
        const item = items.find((i) => i.id === r.itemId);
        return {
          id: r.id,
          itemName: item?.name || "Unknown",
          rating: r.rating,
          comment: r.comment,
        };
      });

    const prompt = `You are a data validation agent and food critic analyzer for a college canteen pre-order application.
Analyze the following list of student reviews.

For each review, determine:
1. "spam": boolean (true if the review is advertisement, gibberish, unrelated to food/service, promotional spam, contains link spam, or insults).
2. "critique": string or null (if there is constructive feedback about food quality, preparation, taste, temperature, or service, summarize it; otherwise null).

Also, construct a brief kitchen-oriented Markdown summary ("dailySummary") containing key warnings/recommendations based on these critiques.

STUDENT REVIEWS TO ANALYZE:
${JSON.stringify(reviewData, null, 2)}

Provide the output in JSON format matching this schema:
{
  "reviews": [
    {
      "id": "string (the review id)",
      "spam": boolean,
      "critique": "string or null"
    }
  ],
  "dailySummary": "markdown string summarizing findings for canteen kitchen staff"
}`;

    const apiKey = process.env.GEMINI_API_KEY;
    let aiResponse: { reviews: { id: string; spam: boolean; critique: string | null }[]; dailySummary: string } | null = null;

    if (!apiKey || apiKey === "AIzaSy_placeholder_key" || apiKey.includes("placeholder")) {
      console.warn("Using simulated Gemini LLM response for cron feedback processing");
      // Simulated response
      const processedReviews = unaggregatedReviews.map((r) => {
        const item = items.find((i) => i.id === r.itemId);
        const name = item?.name || "Item";
        const isSpam = simpleSpamFilter(r.comment);
        let critique: string | null = null;
        if (!isSpam && r.rating <= 3) {
          critique = `The ${name} had issues: "${r.comment}"`;
        }
        return { id: r.id, spam: isSpam, critique };
      });

      const critiques = processedReviews.filter(r => r.critique).map(r => `- ${r.critique}`).join("\n");
      const summaryText = `### 🍳 End-of-Day Kitchen Insights (Simulated Cron)
- **Review Count**: ${unaggregatedReviews.length} new reviews analyzed.
- **Spam Filter**: Classified ${processedReviews.filter(r => r.spam).length} reviews as spam.
- **Constructive Critiques**:
${critiques || "  - No major critiques reported."}
- **Actionable Adjustments**:
  - Review ingredient seasoning if negative critiques mention flavor imbalances.
  - Maintain quick prep times to reduce waiting delays.`;

      aiResponse = {
        reviews: processedReviews,
        dailySummary: summaryText,
      };
    } else {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: "application/json",
              },
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Gemini API returned status ${response.status}`);
        }

        const data = await response.json();
        const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        aiResponse = JSON.parse(jsonText);
      } catch (geminiError) {
        console.error("Gemini API call failed, falling back to simulated analysis in cron:", geminiError);
        // Fallback simulation
        const processedReviews = unaggregatedReviews.map((r) => {
          const item = items.find((i) => i.id === r.itemId);
          const name = item?.name || "Item";
          const isSpam = simpleSpamFilter(r.comment);
          let critique: string | null = null;
          if (!isSpam && r.rating <= 3) {
            critique = `Quality concern for ${name}: "${r.comment}"`;
          }
          return { id: r.id, spam: isSpam, critique };
        });

        const critiques = processedReviews.filter(r => r.critique).map(r => `- ${r.critique}`).join("\n");
        aiResponse = {
          reviews: processedReviews,
          dailySummary: `### 🍳 End-of-Day Kitchen Insights (Cron Fallback)
- **Critiques**:
${critiques || "  - None."}`,
        };
      }
    }

    // Write back to database: update reviews as aggregated, classify spam, and save summary
    const newSummary: DailySummary = {
      id: `summary_${Date.now()}`,
      date: new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      summary: aiResponse?.dailySummary || "No insights brief compiled.",
    };

    await Database.write((db) => {
      unaggregatedReviews.forEach((ur) => {
        const matched = aiResponse?.reviews?.find((ar) => ar.id === ur.id);
        const reviewInDb = db.reviews.find((r) => r.id === ur.id);
        if (reviewInDb) {
          reviewInDb.aggregated = true;
          reviewInDb.spam = matched ? matched.spam : simpleSpamFilter(ur.comment);
        }
      });

      db.dailySummaries.unshift(newSummary);
      if (db.dailySummaries.length > 5) {
        db.dailySummaries.pop();
      }
    });

    return NextResponse.json({
      success: true,
      summary: newSummary,
      processedCount: unaggregatedReviews.length,
    });
  } catch (error: any) {
    console.error("Cron Feedback Aggregation Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
