import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/store";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret || webhookSecret.includes("placeholder")) {
      // In development or when webhook secret is not set, log and return 200
      console.log("[Webhook] Received event without active webhook secret configuration.");
      return NextResponse.json({ status: "acknowledged_test" });
    }

    if (!signature) {
      return NextResponse.json({ error: "Missing signature header" }, { status: 400 });
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event;

    if (eventType === "payment.captured" || eventType === "order.paid") {
      const paymentEntity = event.payload?.payment?.entity;
      const rzpOrderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;

      if (rzpOrderId && paymentId) {
        const order = db.getOrderByRazorpayOrderId(rzpOrderId);
        if (order && order.status !== "paid") {
          db.markOrderAsPaid(order.id, paymentId, signature);
          console.log(`[Webhook] Order ${order.id} marked as PAID via webhook event ${eventType}`);
        }
      }
    }

    return NextResponse.json({ status: "success" });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: error.message || "Webhook processing failed" },
      { status: 500 }
    );
  }
}
