import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/store";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature, isMockVerification } = body;

    if (!orderId || !razorpayPaymentId) {
      return NextResponse.json(
        { error: "Missing required verification parameters." },
        { status: 400 }
      );
    }

    const order = db.getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    // Check if already paid (idempotency)
    if (order.status === "paid" && order.accessToken) {
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        orderId: order.id,
        accessToken: order.accessToken,
      });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    const isLiveOrTestKeyPresent =
      secret && !secret.includes("placeholder") && !isMockVerification;

    if (isLiveOrTestKeyPresent) {
      if (!razorpayOrderId || !razorpaySignature) {
        return NextResponse.json(
          { error: "Signature and Order ID are required for verification." },
          { status: 400 }
        );
      }

      // Cryptographic verification
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest("hex");

      const isMatch = crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(razorpaySignature)
      );

      if (!isMatch) {
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
    console.error("Payment signature verification error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify payment signature" },
      { status: 500 }
    );
  }
}
