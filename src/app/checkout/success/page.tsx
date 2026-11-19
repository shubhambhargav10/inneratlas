import React from "react";
import Link from "next/link";
import { db, getDeterministicAccessToken } from "@/lib/db/store";
import { CheckCircle2, Download, ExternalLink, ArrowRight, ShieldCheck, Mail } from "lucide-react";

interface SuccessPageProps {
  searchParams: {
    orderId?: string;
    token?: string;
  };
}

export default async function CheckoutSuccessPage({ searchParams }: SuccessPageProps) {
  const { orderId, token: rawToken } = searchParams;

  if (!orderId) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-serif text-ink mb-4">Invalid Order Session</h1>
        <p className="text-sm text-ink-muted mb-6">
          We could not locate this order session. If you completed a payment, please visit your dashboard.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-ink text-white text-sm font-semibold"
        >
          <span>Go to My Dashboard</span>
          <ArrowRight className="w-4 h-4 text-brand-300" />
        </Link>
      </div>
    );
  }

  const order = await db.getOrderById(orderId);
  const report = await db.getReportByOrderId(orderId);

  const token =
    rawToken && rawToken !== "undefined" && rawToken.trim().length > 0
      ? rawToken.trim()
      : (order?.accessToken || getDeterministicAccessToken(orderId));

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 md:py-20">
      <div className="rounded-3xl border border-[#E8E2D9] bg-white p-6 sm:p-12 shadow-soft text-center">
        {/* Success Icon */}
        <div className="w-16 h-16 rounded-full bg-accent-emerald/10 text-accent-emerald flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <span className="text-xs font-bold uppercase tracking-wider text-accent-emerald block mb-1">
          Payment Confirmed & Verified
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif text-ink font-semibold tracking-tight mb-3">
          Your Comprehensive Dossier is Ready
        </h1>
        <p className="text-sm sm:text-base text-ink-muted max-w-lg mx-auto mb-8">
          Thank you, <strong>{order?.customerName || "Friend"}</strong>. Your payment was verified successfully and your personalized six-page PDF dossier has been generated.
        </p>

        {/* Order Details Badge */}
        <div className="rounded-2xl bg-canvas border border-[#E8E2D9] p-4 max-w-md mx-auto mb-8 text-left text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-ink-muted">Order Number:</span>
            <span className="font-mono font-semibold text-ink">{order?.orderNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-muted">Dossier Code:</span>
            <span className="font-mono font-semibold text-brand-700">{report?.reportCode || "Generated"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-muted">Delivered To:</span>
            <span className="font-semibold text-ink">{order?.customerEmail}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-muted">Amount Paid:</span>
            <span className="font-semibold text-ink">₹{((order?.amountPaise || 19900) / 100).toFixed(0)} INR</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto mb-8">
          <a
            href={`/api/reports/${orderId}/download?token=${token}`}
            download
            className="w-full sm:w-auto flex-1 inline-flex items-center justify-center space-x-2 py-3 px-6 rounded-xl bg-ink text-white text-sm font-semibold shadow-soft hover:bg-ink-light transition-all active:scale-95"
          >
            <Download className="w-4 h-4 text-brand-300" />
            <span>Download Official PDF</span>
          </a>

          <Link
            href={`/reports/${orderId}?token=${token}`}
            className="w-full sm:w-auto flex-1 inline-flex items-center justify-center space-x-2 py-3 px-6 rounded-xl bg-canvas border border-[#E8E2D9] text-ink text-sm font-semibold hover:bg-canvas-subtle transition-all"
          >
            <ExternalLink className="w-4 h-4 text-brand-600" />
            <span>View Online Dossier</span>
          </Link>
        </div>

        {/* Reassurance notes */}
        <div className="pt-6 border-t border-[#E8E2D9] flex items-center justify-center space-x-4 text-xs text-ink-muted">
          <span className="flex items-center space-x-1">
            <Mail className="w-3.5 h-3.5 text-brand-600" />
            <span>Access link retained</span>
          </span>
          <span>•</span>
          <span className="flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-accent-emerald" />
            <span>Permanent download access</span>
          </span>
        </div>
      </div>
    </div>
  );
}
