import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/store";
import { getAssessmentBySlug } from "@/data/assessments";
import Razorpay from "razorpay";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { assessmentSlug, customerName, customerEmail, guestSessionToken, resultPayload } = body;

    if (!assessmentSlug || !customerName || !customerEmail || !guestSessionToken || !resultPayload) {
      return NextResponse.json(
        { error: "Missing required fields for order creation." },
        { status: 400 }
      );
    }

    const assessment = getAssessmentBySlug(assessmentSlug);
    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
    }

    // Amount strictly read from server-side assessment definition (cannot be manipulated by client)
    const amountPaise = assessment.priceInr * 100;

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    const isProduction = process.env.NODE_ENV === "production";

    const isRazorpayConfigured = Boolean(
      razorpayKeyId &&
      razorpayKeySecret &&
      !razorpayKeyId.includes("placeholder") &&
      !razorpayKeySecret.includes("placeholder")
    );

    // Fail closed in production if Razorpay is not properly configured
    if (isProduction && !isRazorpayConfigured) {
      console.error("[Payments] Live payment gateway is not configured in production.");
      return NextResponse.json(
        { error: "Payment gateway configuration is missing. Live orders are locked." },
        { status: 500 }
      );
    }

    let razorpayOrderId: string | undefined;
    let isMockMode = false;

    if (isRazorpayConfigured) {
      try {
        const razorpay = new Razorpay({
          key_id: razorpayKeyId!,
          key_secret: razorpayKeySecret!,
        });

        const rzpOrder = await razorpay.orders.create({
          amount: amountPaise,
          currency: "INR",
          receipt: `rcpt_${Date.now()}`,
          notes: {
            assessment: assessment.title,
            customerName: customerName.slice(0, 50),
            customerEmail: customerEmail.slice(0, 80),
          },
        });

        razorpayOrderId = rzpOrder.id;
      } catch (err: any) {
        console.error("[Payments] Razorpay order creation failed:", err.message);
        if (isProduction) {
          return NextResponse.json(
            { error: "Unable to create payment order with gateway. Please try again later." },
            { status: 502 }
          );
        }
        // In local development only, allow explicit mock fallback if enabled
        if (process.env.ENABLE_MOCK_PAYMENTS === "true" || !isProduction) {
          isMockMode = true;
          razorpayOrderId = `rzp_sim_${Date.now()}`;
        } else {
          return NextResponse.json(
            { error: "Payment gateway error during order creation." },
            { status: 502 }
          );
        }
      }
    } else {
      // Non-production environment without keys: only allowed if mock mode is permitted
      if (!isProduction && (process.env.ENABLE_MOCK_PAYMENTS === "true" || process.env.NODE_ENV === "test")) {
        isMockMode = true;
        razorpayOrderId = `rzp_sim_${Date.now()}`;
      } else {
        return NextResponse.json(
          { error: "Payment gateway is not configured for checkout." },
          { status: 500 }
        );
      }
    }

    // Persist order in server data layer
    const order = await db.createOrder({
      guestSessionToken,
      assessmentSlug,
      customerName,
      customerEmail,
      amountPaise,
      resultPayload,
      razorpayOrderId,
    });

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amountPaise,
      currency: "INR",
      razorpayOrderId,
      razorpayKeyId: isMockMode ? "rzp_test_simulated" : razorpayKeyId,
      isMockMode,
    });
  } catch (error: any) {
    console.error("[Payments] Error creating payment order:", error);
    return NextResponse.json(
      { error: "Failed to create payment order." },
      { status: 500 }
    );
  }
}
