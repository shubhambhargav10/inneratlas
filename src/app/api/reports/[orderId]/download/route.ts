import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/store";
import { getAssessmentBySlug } from "@/data/assessments";
import { generatePdfBuffer } from "@/lib/pdf/reportGenerator";
import crypto from "crypto";

export async function GET(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params;
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    // 1. Mandatory access token validation (fail closed if missing)
    if (!token || typeof token !== "string" || token.trim().length === 0 || token === "undefined") {
      return new NextResponse("Unauthorized: Access token is strictly required to download report.", {
        status: 401,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, private",
          "Referrer-Policy": "no-referrer",
          "X-Robots-Tag": "noindex, nofollow, noarchive",
        },
      });
    }

    const order = await db.getOrderById(orderId);
    if (!order) {
      return new NextResponse("Report not found.", {
        status: 404,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, private",
          "X-Robots-Tag": "noindex, nofollow",
        },
      });
    }

    // 2. Security Gate: Order must be in confirmed paid status
    if (order.status !== "paid") {
      return new NextResponse("Forbidden: Payment required to unlock this report.", {
        status: 403,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, private",
          "X-Robots-Tag": "noindex, nofollow",
        },
      });
    }

    // 3. Cryptographic timing-safe token verification against hashed database token
    const isValidToken = await db.verifyReportToken(orderId, token);
    if (!isValidToken) {
      return new NextResponse("Unauthorized: Invalid access token.", {
        status: 401,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, private",
          "Referrer-Policy": "no-referrer",
          "X-Robots-Tag": "noindex, nofollow",
        },
      });
    }

    const report = await db.getReportByOrderId(orderId);
    const assessment = getAssessmentBySlug(order.assessmentSlug);
    const assessmentTitle = assessment ? assessment.title : "Psychometric Assessment";

    // 4. Generate high-resolution vector PDF binary buffer
    const pdfBuffer = await generatePdfBuffer({
      customerName: order.customerName,
      reportCode: report?.reportCode || order.orderNumber,
      assessmentTitle,
      result: order.resultPayload,
    });

    if (report) {
      await db.incrementReportDownload(report.id);
    }

    const fileName = `InnerAtlas-Report-${report?.reportCode || order.orderNumber}.pdf`;

    // 5. Strict security and no-store cache headers
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
        "Pragma": "no-cache",
        "Expires": "0",
        "Referrer-Policy": "no-referrer",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: any) {
    console.error("[Download Error]:", error);
    return new NextResponse("Failed to generate PDF report.", {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
