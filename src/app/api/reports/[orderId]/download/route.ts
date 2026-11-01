import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/store";
import { getAssessmentBySlug } from "@/data/assessments";
import { generatePdfBuffer } from "@/lib/pdf/reportGenerator";

export async function GET(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params;
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    const order = db.getOrderById(orderId);
    if (!order) {
      return new NextResponse("Order not found", { status: 404 });
    }

    // Security Gate: Order must be paid
    if (order.status !== "paid") {
      return new NextResponse("Payment required to unlock this report", { status: 403 });
    }

    // Token verification (prevents brute-force ID scraping)
    if (token && order.accessToken && token !== order.accessToken) {
      return new NextResponse("Unauthorized access token", { status: 401 });
    }

    const report = db.getReportByOrderId(orderId);
    const assessment = getAssessmentBySlug(order.assessmentSlug);
    const assessmentTitle = assessment ? assessment.title : "Psychometric Assessment";

    // Generate high-resolution PDF binary buffer
    const pdfBuffer = await generatePdfBuffer({
      customerName: order.customerName,
      reportCode: report?.reportCode || order.orderNumber,
      assessmentTitle,
      result: order.resultPayload,
    });

    if (report) {
      db.incrementReportDownload(report.id);
    }

    const fileName = `InnerAtlas-Report-${report?.reportCode || order.orderNumber}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error: any) {
    console.error("PDF generation/download error:", error);
    return new NextResponse("Failed to generate PDF report", { status: 500 });
  }
}
