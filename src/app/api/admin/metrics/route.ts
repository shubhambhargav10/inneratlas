import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/store";
import { allAssessments } from "@/data/assessments";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    // 1. IP-based Rate Limiting (Protection against brute-force attacks)
    const rateLimit = db.checkAdminRateLimit(clientIp);
    if (!rateLimit.allowed) {
      console.warn(`[Security Alert] Rate-limited admin login attempt from ${clientIp}`);
      return NextResponse.json(
        {
          error: `Too many failed administrator login attempts. Access is locked. Please try again in ${rateLimit.retryAfterSeconds || 900} seconds.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds || 900),
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const body = await req.json();
    const { secretKey } = body;

    // 2. Fail closed: No hardcoded fallback or known default strings allowed
    const validKey = process.env.ADMIN_SECRET_KEY;
    const isKeyConfigured = Boolean(
      validKey &&
      validKey.trim().length >= 16 &&
      !validKey.includes("placeholder") &&
      validKey !== "inneratlas-admin-secret-key-change-in-prod"
    );

    if (!isKeyConfigured) {
      console.error("[Admin Security Alert] ADMIN_SECRET_KEY is not configured or uses insecure default.");
      return NextResponse.json(
        { error: "Administrator authentication is not configured on this server. Contact operations." },
        { status: 500 }
      );
    }

    // 3. Constant-time timing-safe secret key verification
    if (typeof secretKey !== "string") {
      db.recordAdminAttempt(clientIp, false);
      return NextResponse.json({ error: "Invalid credentials format." }, { status: 400 });
    }

    const expectedBuf = Buffer.from(validKey!, "utf-8");
    const actualBuf = Buffer.from(secretKey, "utf-8");

    const isMatch =
      expectedBuf.length === actualBuf.length &&
      crypto.timingSafeEqual(expectedBuf, actualBuf);

    if (!isMatch) {
      db.recordAdminAttempt(clientIp, false);
      console.warn(`[Admin Security Alert] Unauthorized admin login attempt from ${clientIp}`);
      return NextResponse.json(
        { error: "Unauthorized access: Invalid admin key." },
        { status: 401 }
      );
    }

    // Success: Clear failed attempts
    db.recordAdminAttempt(clientIp, true);

    const allOrders = db.getAllOrders();
    const paidOrders = allOrders.filter((o) => o.status === "paid");
    const totalRevenuePaise = paidOrders.reduce((acc, curr) => acc + curr.amountPaise, 0);

    const metrics = {
      totalOrdersCount: allOrders.length,
      paidOrdersCount: paidOrders.length,
      totalRevenueInr: Math.round(totalRevenuePaise / 100),
      averageOrderValueInr:
        paidOrders.length > 0 ? Math.round(totalRevenuePaise / paidOrders.length / 100) : 0,
      conversionRatePercent:
        allOrders.length > 0 ? Math.round((paidOrders.length / allOrders.length) * 100) : 0,
      activeAssessmentsCount: allAssessments.length,
      totalQuestionsCount: allAssessments.reduce((acc, a) => acc + a.questions.length, 0),
    };

    // 4. Sanitize orders: NEVER expose raw accessToken, guestSessionToken, or full resultPayload
    const sanitizedOrders = allOrders.slice(0, 50).map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      assessmentSlug: o.assessmentSlug,
      customerName: o.customerName,
      customerEmail: o.customerEmail,
      amountPaise: o.amountPaise,
      status: o.status,
      reportCode: o.reportCode,
      createdAt: o.createdAt,
    }));

    return NextResponse.json(
      {
        metrics,
        orders: sanitizedOrders,
        assessments: allAssessments.map((a) => ({
          id: a.id,
          slug: a.slug,
          title: a.title,
          category: a.category,
          priceInr: a.priceInr,
          questionCount: a.questions.length,
          dimensionCount: a.dimensions.length,
        })),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, private",
        },
      }
    );
  } catch (err: any) {
    console.error("[Admin Error]:", err);
    return NextResponse.json({ error: "Failed to load admin analytics." }, { status: 500 });
  }
}
