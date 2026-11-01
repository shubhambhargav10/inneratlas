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

    // Amount in paise (e.g. 199 INR = 19900 paise)
    const amountPaise = assessment.priceInr * 100;

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    const isLiveOrTestKeyPresent =
      razorpayKeyId &&
      razorpayKeySecret &&
      !razorpayKeyId.includes("placeholder") &&
      !razorpayKeySecret.includes("placeholder");

    let razorpayOrderId: string | undefined;
    let isMockMode = true;

    if (isLiveOrTestKeyPresent) {
      try {
        const razorpay = new Razorpay({
          key_id: razorpayKeyId,
          key_secret: razorpayKeySecret,
        });

        const rzpOrder = await razorpay.orders.create({
          amount: amountPaise,
          currency: "INR",
          receipt: `rcpt_${Date.now()}`,
          notes: {
            assessment: assessment.title,
            customerName,
            customerEmail,
          },
        });

        razorpayOrderId = rzpOrder.id;
        isMockMode = false;
      } catch (err: any) {
        console.warn("Razorpay API call failed, falling back to simulated test mode:", err.message);
        isMockMode = true;
        razorpayOrderId = `rzp_sim_${Date.now()}`;
      }
    } else {
      isMockMode = true;
      razorpayOrderId = `rzp_sim_${Date.now()}`;
    }

    // Persist order in data layer
    const order = db.createOrder({
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
      razorpayKeyId: razorpayKeyId || "rzp_test_simulated",
      isMockMode,
    });
  } catch (error: any) {
    console.error("Error creating payment order:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create payment order" },
      { status: 500 }
    );
  }
}
