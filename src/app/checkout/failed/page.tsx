import React from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw, ArrowRight, HelpCircle } from "lucide-react";

interface FailedPageProps {
  searchParams: {
    orderId?: string;
    reason?: string;
  };
}

export default function CheckoutFailedPage({ searchParams }: FailedPageProps) {
  const { orderId, reason } = searchParams;

  let reasonMessage = "The transaction was cancelled or could not be processed.";
  if (reason === "verification_failed") {
    reasonMessage = "Payment signature could not be verified by the server. If money was debited from your account, it will be refunded automatically by your bank within 3-5 business days.";
  } else if (reason === "network_error") {
    reasonMessage = "A network timeout occurred while confirming the transaction with the payment gateway.";
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-16 md:py-24 text-center">
      <div className="rounded-3xl border border-[#E8E2D9] bg-white p-6 sm:p-10 shadow-soft">
        <div className="w-14 h-14 rounded-full bg-accent-coral/10 text-accent-coral flex items-center justify-center mx-auto mb-5">
          <AlertCircle className="w-8 h-8" />
        </div>

        <span className="text-xs font-bold uppercase tracking-wider text-accent-coral block mb-1">
          Payment Not Completed
        </span>
        <h1 className="text-2xl sm:text-3xl font-serif text-ink font-semibold tracking-tight mb-3">
          We Couldn't Complete Your Checkout
        </h1>
        <p className="text-sm text-ink-muted leading-relaxed mb-6">
          {reasonMessage}
        </p>

        {orderId && (
          <p className="text-xs text-ink-muted/80 font-mono mb-8">
            Reference Order: {orderId}
          </p>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/assessments"
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 py-3 px-6 rounded-xl bg-ink text-white text-sm font-semibold shadow-soft hover:bg-ink-light transition-all active:scale-95"
          >
            <RotateCcw className="w-4 h-4 text-brand-300" />
            <span>Return to Assessments</span>
          </Link>

          <Link
            href="/contact"
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 py-3 px-6 rounded-xl bg-canvas border border-[#E8E2D9] text-ink text-sm font-semibold hover:bg-canvas-subtle transition-all"
          >
            <HelpCircle className="w-4 h-4 text-ink-muted" />
            <span>Contact Support</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
