import React from "react";
import { siteConfig } from "@/config/site";

export const metadata = {
  title: "Refund & Cancellation Policy | INNERATLAS",
  description: "Our transparent refund and cancellation policy for digital assessment reports.",
};

export default function RefundPolicyPage() {
  return (
    <div className="bg-canvas min-h-screen py-12 md:py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <header className="mb-10 pb-6 border-b border-[#E8E2D9]">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-700 block mb-1">
            Consumer Guarantee
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif text-ink font-semibold tracking-tight">
            Refund & Cancellation Policy
          </h1>
          <p className="text-xs text-ink-muted mt-2">
            Last Updated: November 2025
          </p>
        </header>

        <div className="rounded-3xl border border-[#E8E2D9] bg-white p-8 sm:p-12 shadow-soft prose prose-stone max-w-none text-ink text-xs sm:text-sm leading-relaxed space-y-6">
          <section>
            <h2 className="text-base font-serif font-semibold text-ink">1. Digital Products Policy</h2>
            <p>
              Due to the nature of immediately generated, personalized digital PDF reports, orders are fulfilled and delivered instantly upon payment verification.
            </p>
          </section>

          <section>
            <h2 className="text-base font-serif font-semibold text-ink">2. Technical Delivery Guarantee</h2>
            <p>
              If a technical error prevents you from downloading or accessing your generated PDF dossier, or if you were charged multiple times for the same assessment session due to a network glitch, we will resolve the issue immediately or issue a 100% full refund within 3 business days.
            </p>
          </section>

          <section>
            <h2 className="text-base font-serif font-semibold text-ink">3. Requesting Support</h2>
            <p>
              To request assistance or report a transaction issue, please email {siteConfig.supportEmail} with your Order Number or the email address used during purchase.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
