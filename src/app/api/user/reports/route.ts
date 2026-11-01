import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/store";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email parameter required" }, { status: 400 });
    }

    const orders = db.getOrdersByEmail(email);
    const sanitized = orders.map((o) => ({
      orderId: o.id,
      orderNumber: o.orderNumber,
      assessmentSlug: o.assessmentSlug,
      customerName: o.customerName,
      customerEmail: o.customerEmail,
      amountPaise: o.amountPaise,
      status: o.status,
      reportCode: o.reportCode,
      accessToken: o.accessToken,
      createdAt: o.createdAt,
    }));

    return NextResponse.json({ orders: sanitized });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}
