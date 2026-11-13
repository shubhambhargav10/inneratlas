import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/store";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const isProduction = process.env.NODE_ENV === "production";

    // Fail closed in production if webhook secret is not configured
    if (!webhookSecret || webhookSecret.includes("placeholder")) {
      if (isProduction) {
        console.error("[Webhook Security Alert] RAZORPAY_WEBHOOK_SECRET is not configured in production.");
        return NextResponse.json({ error: "Webhook configuration missing on server" }, { status: 500 });
      }
      console.log("[Webhook Dev] Received event without active webhook secret configuration.");
      return NextResponse.json({ status: "acknowledged_dev_unconfigured" });
    }

    if (!signature) {
      return NextResponse.json({ error: "Missing x-razorpay-signature header" }, { status: 400 });
    }

    // Validate signature format (HMAC-SHA256 hex must be exactly 64 characters)
    if (signature.length !== 64 || !/^[0-9a-f]{64}$/i.test(signature)) {
      return NextResponse.json({ error: "Malformed webhook signature format" }, { status: 400 });
    }

    // Verify webhook signature with constant-time equality
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    const expectedBuf = Buffer.from(expectedSignature, "utf-8");
    const actualBuf = Buffer.from(signature, "utf-8");

    if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
      console.warn("[Webhook Security Alert] Invalid webhook signature detected.");
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event;
    const eventId = event.id || req.headers.get("x-razorpay-event-id");

    // 1. Webhook Event Deduplication & Concurrency-Safe Lifecycle Transition
    if (eventId) {
      const lifecycle = await db.recordWebhookLifecycle(eventId, eventType, event);
      if (!lifecycle.shouldProcess) {
        console.log(`[Webhook] Event ${eventId} (status: ${lifecycle.status}) skipped.`);
        const responseStatus = lifecycle.status === "processed" ? "already_processed" : lifecycle.status;
        return NextResponse.json({ status: responseStatus, eventId });
      }
    }

    const paymentEntity = event.payload?.payment?.entity;
    const rzpOrderId = paymentEntity?.order_id || event.payload?.order?.entity?.id;
    const paymentId = paymentEntity?.id;

    if (!rzpOrderId) {
      console.warn(`[Webhook] Event ${eventType} received without valid order_id.`);
      if (eventId) await db.finalizeWebhookEvent(eventId, "processed");
      return NextResponse.json({ status: "ignored_no_order_id" });
    }

    const order = await db.getOrderByRazorpayOrderId(rzpOrderId);
    if (!order) {
      console.warn(`[Webhook] No corresponding local order found for Razorpay order ${rzpOrderId}`);
      if (eventId) await db.finalizeWebhookEvent(eventId, "failed", `Order not found for rzpOrderId: ${rzpOrderId}`);
      return NextResponse.json({ status: "order_not_found" }, { status: 404 });
    }

    // 2. Handle Payment Failure Events
    if (eventType === "payment.failed") {
      console.log(`[Webhook] Payment failed for order ${order.id}.`);
      await db.markOrderAsFailed(order.id);
      if (eventId) await db.finalizeWebhookEvent(eventId, "processed");
      return NextResponse.json({ status: "marked_failed" });
    }

    // 3. Handle Payment Capture / Success Events
    if (eventType === "payment.captured" || eventType === "order.paid") {
      // Validate payment status
      if (paymentEntity && paymentEntity.status !== "captured") {
        console.warn(`[Webhook Security Alert] Payment status is '${paymentEntity.status}', expected 'captured'.`);
        if (eventId) await db.finalizeWebhookEvent(eventId, "failed", "Payment status is not captured");
        return NextResponse.json({ error: "Payment is not in captured state" }, { status: 400 });
      }

      // Validate expected amount in paise
      if (paymentEntity && paymentEntity.amount !== order.amountPaise) {
        console.error(
          `[Webhook Security Alert] Amount mismatch for order ${order.id}. Expected: ${order.amountPaise}, Received: ${paymentEntity.amount}`
        );
        if (eventId) await db.finalizeWebhookEvent(eventId, "failed", "Payment amount mismatch");
        return NextResponse.json({ error: "Payment amount mismatch" }, { status: 400 });
      }

      // Validate expected currency
      if (paymentEntity && paymentEntity.currency !== order.currency) {
        console.error(
          `[Webhook Security Alert] Currency mismatch for order ${order.id}. Expected: ${order.currency}, Received: ${paymentEntity.currency}`
        );
        if (eventId) await db.finalizeWebhookEvent(eventId, "failed", "Payment currency mismatch");
        return NextResponse.json({ error: "Payment currency mismatch" }, { status: 400 });
      }

      // Safe idempotent fulfillment
      if (order.status !== "paid") {
        await db.markOrderAsPaid(order.id, paymentId || "pay_webhook_captured", signature);
        console.log(`[Webhook] Order ${order.id} verified and fulfilled successfully via ${eventType}.`);
      }
    }

    if (eventId) {
      await db.finalizeWebhookEvent(eventId, "processed");
    }

    return NextResponse.json({ status: "success" });
  } catch (error: any) {
    console.error("[Webhook Error]:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
