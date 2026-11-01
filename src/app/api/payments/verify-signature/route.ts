import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/store";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;

    // Never trust or use any client-supplied mock flag
    if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json(
        { error: "Missing required verification parameters." },
        { status: 400 }
      );
    }

    const order = db.getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    // Verify order association: The Razorpay order ID must strictly match the stored order's ID
    if (!order.razorpayOrderId || order.razorpayOrderId !== razorpayOrderId) {
      console.warn(`[Security Alert] Order ID mismatch. Stored: ${order.razorpayOrderId}, received: ${razorpayOrderId}`);
      return NextResponse.json(
        { error: "Order ID mismatch: Payment does not correspond to this order." },
        { status: 400 }
      );
    }

    // Idempotency: If already paid, safely return existing credentials without re-processing
    if (order.status === "paid" && order.accessToken) {
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        orderId: order.id,
        accessToken: order.accessToken,
        reportCode: order.reportCode,
      });
    }

    const isProduction = process.env.NODE_ENV === "production";
    const isSimulatedOrder = order.razorpayOrderId.startsWith("rzp_sim_");

    // 1. Handling simulated test orders
    if (isSimulatedOrder) {
      // In production, mock payments are strictly forbidden
      if (isProduction) {
        console.error(`[Security Alert] Attempted mock payment verification in production for order ${order.id}`);
        return NextResponse.json(
          { error: "Simulated payments are strictly forbidden in production." },
          { status: 403 }
        );
      }

      // In non-production, only permitted if ENABLE_MOCK_PAYMENTS is explicitly enabled
      const isMockEnabled = process.env.ENABLE_MOCK_PAYMENTS === "true" || process.env.NODE_ENV === "test";
      if (!isMockEnabled) {
        return NextResponse.json(
          { error: "Mock payments are disabled on this server." },
          { status: 403 }
        );
      }

      // Validate development mock signature
      const expectedMockSig = `sim_dev_sig_${order.id}`;
      if (razorpaySignature !== expectedMockSig) {
        return NextResponse.json(
          { error: "Invalid simulated payment signature." },
          { status: 400 }
        );
      }
    } else {
      // 2. Real Razorpay payment verification
      const secret = process.env.RAZORPAY_KEY_SECRET;
      if (!secret || secret.includes("placeholder")) {
        console.error("[Payments] RAZORPAY_KEY_SECRET is not configured.");
        return NextResponse.json(
          { error: "Payment verification gateway secret is not configured on server." },
          { status: 500 }
        );
      }

      // Validate signature format (HMAC-SHA256 hex must be exactly 64 characters)
      if (
        typeof razorpaySignature !== "string" ||
        razorpaySignature.length !== 64 ||
        !/^[0-9a-f]{64}$/i.test(razorpaySignature)
      ) {
        return NextResponse.json(
          { error: "Malformed payment signature format." },
          { status: 400 }
        );
      }

      // Cryptographic HMAC-SHA256 calculation
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest("hex");

      const expectedBuf = Buffer.from(expectedSignature, "utf-8");
      const actualBuf = Buffer.from(razorpaySignature, "utf-8");

      if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
        console.warn(`[Security Alert] Payment signature verification failed for order ${order.id}`);
        return NextResponse.json(
          { error: "Invalid payment signature verification failed." },
          { status: 400 }
        );
      }
    }

    // Mark as paid and generate official dossier report
    const { report } = db.markOrderAsPaid(order.id, razorpayPaymentId, razorpaySignature);

    return NextResponse.json({
      success: true,
      orderId: order.id,
      reportCode: report.reportCode,
      accessToken: report.accessToken,
    });
  } catch (error: any) {
    console.error("[Payments] Signature verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify payment signature." },
      { status: 500 }
    );
  }
}
