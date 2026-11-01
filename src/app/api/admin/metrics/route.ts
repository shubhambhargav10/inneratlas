import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/store";
import { allAssessments } from "@/data/assessments";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { secretKey } = body;

    const validKey = process.env.ADMIN_SECRET_KEY || "inneratlas-admin-secret-key-change-in-prod";

    if (!secretKey || secretKey !== validKey) {
      return NextResponse.json({ error: "Unauthorized access: invalid admin key" }, { status: 401 });
    }

    const allOrders = db.getAllOrders();
    const paidOrders = allOrders.filter((o) => o.status === "paid");
    const totalRevenuePaise = paidOrders.reduce((acc, curr) => acc + curr.amountPaise, 0);

    const metrics = {
      totalOrdersCount: allOrders.length,
      paidOrdersCount: paidOrders.length,
      totalRevenueInr: Math.round(totalRevenuePaise / 100),
      averageOrderValueInr: paidOrders.length > 0 ? Math.round(totalRevenuePaise / paidOrders.length / 100) : 0,
      conversionRatePercent: allOrders.length > 0 ? Math.round((paidOrders.length / allOrders.length) * 100) : 0,
      activeAssessmentsCount: allAssessments.length,
      totalQuestionsCount: allAssessments.reduce((acc, a) => acc + a.questions.length, 0),
    };

    return NextResponse.json({
      metrics,
      orders: allOrders.slice(0, 50), // Last 50 orders
      assessments: allAssessments.map((a) => ({
        id: a.id,
        slug: a.slug,
        title: a.title,
        category: a.category,
        priceInr: a.priceInr,
        questionCount: a.questions.length,
        dimensionCount: a.dimensions.length,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to load admin analytics" }, { status: 500 });
  }
}
