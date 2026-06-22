import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/data/db";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate student
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId, screenshot } = await req.json(); // screenshot is base64 string
    if (!sessionId || !screenshot) {
      return NextResponse.json({ error: "Missing Session ID or Screenshot image" }, { status: 400 });
    }

    // Load pending order
    const dbData = await Database.read();
    const order = dbData.orders.find((o) => o.sessionId === sessionId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const orderTotalInRupees = order.total / 100; // Total price in rupees

    const apiKey = process.env.GEMINI_API_KEY;
    const isMock = !apiKey || apiKey === "AIzaSy_placeholder_key" || apiKey.includes("placeholder");

    let aiResult: {
      amount: number;
      status: string;
      utr: string;
      verified: boolean;
      error?: string;
    };

    if (isMock) {
      // 2. Mock AI OCR Fallback (Simulates scanning receipt and auto-approves for demo purposes)
      console.log("Stripe/UPI Simulation: Running mock Gemini Flash Vision OCR...");
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate API delay

      // Generate a mock UTR number
      const mockUtr = `4${Math.floor(10000000000 + Math.random() * 90000000000)}`;

      aiResult = {
        amount: orderTotalInRupees,
        status: "Success",
        utr: mockUtr,
        verified: true,
      };
    } else {
      // 3. Real Gemini 1.5 Flash Multimodal Vision OCR Call
      try {
        // Strip data prefix if present in base64 string
        const cleanBase64 = screenshot.replace(/^data:image\/\w+;base64,/, "");

        const prompt = `Analyze this UPI payment confirmation screenshot. Extract the payment details exactly.
Verify that:
1. The payment is successful (status: success, completed, successful).
2. Extract the total amount paid in INR (Rupees).
3. Extract the 12-digit UPI transaction reference number / UTR number / UPI Ref No.

Return the parsed values in a strict JSON format with no markdown blocks:
{
  "amount": <number>,
  "status": "<success_or_failed>",
  "utr": "<12_digit_string>"
}`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: prompt },
                    {
                      inlineData: {
                        mimeType: "image/jpeg",
                        data: cleanBase64,
                      },
                    },
                  ],
                },
              ],
            }),
          }
        );

        if (!geminiRes.ok) {
          throw new Error(`Gemini Vision API error code ${geminiRes.status}`);
        }

        const resData = await geminiRes.json();
        const jsonText = resData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        
        // Clean JSON formatting if enclosed in markdown blocks
        const cleanedJson = jsonText.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleanedJson);

        const amountMatches = Math.abs(parsed.amount - orderTotalInRupees) < 0.05;
        const statusOk = ["success", "completed", "successful", "active", "done"].includes(parsed.status?.toLowerCase());
        const utrValid = parsed.utr && parsed.utr.length === 12 && /^\d+$/.test(parsed.utr);

        if (amountMatches && statusOk && utrValid) {
          aiResult = {
            amount: parsed.amount,
            status: "Success",
            utr: parsed.utr,
            verified: true,
          };
        } else {
          aiResult = {
            amount: parsed.amount || 0,
            status: parsed.status || "Unknown",
            utr: parsed.utr || "Invalid",
            verified: false,
            error: `AI Check Failed. Extracted: ₹${parsed.amount} (${parsed.status}) | UTR: ${parsed.utr}. Expected: ₹${orderTotalInRupees}.`,
          };
        }
      } catch (geminiErr: any) {
        console.error("Gemini Vision API parsing failed. Falling back to manual verification queue.", geminiErr);
        aiResult = {
          amount: 0,
          status: "Error",
          utr: "Pending",
          verified: false,
          error: "AI Scanner failed to process the screenshot. Enqueueing for manual canteen verification.",
        };
      }
    }

    // 4. Update Database based on AI Verification Result
    if (aiResult.verified) {
      // Auto-approve: confirm order and issue pickup token
      const confirmedOrder = await Database.confirmOrder(sessionId, aiResult.utr, "AI");
      return NextResponse.json({
        success: true,
        verified: true,
        token: confirmedOrder?.token,
        order: confirmedOrder,
      });
    } else {
      // Failed auto-approval: Send to "Pending Verification" queue for Canteen Staff manual check
      const fallbackUtr = aiResult.utr !== "Invalid" && aiResult.utr !== "Pending" ? aiResult.utr : `sim_utr_${Date.now()}`;
      const verificationOrder = await Database.submitForVerification(sessionId, fallbackUtr, screenshot);
      return NextResponse.json({
        success: true,
        verified: false,
        error: aiResult.error || "OCR amount mismatch",
        order: verificationOrder,
      });
    }
  } catch (err: any) {
    console.error("Screenshot verification API error:", err);
    return NextResponse.json({ error: "Failed to verify receipt" }, { status: 500 });
  }
}
