import React from "react";
import { siteConfig } from "@/config/site";

export const metadata = {
  title: "Privacy Policy | INNERATLAS",
  description: "Learn how INNERATLAS collects, safeguards, and protects your assessment responses and personal data.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="bg-canvas min-h-screen py-12 md:py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <header className="mb-10 pb-6 border-b border-[#E8E2D9]">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-700 block mb-1">
            Data Protection & Transparency
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif text-ink font-semibold tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-xs text-ink-muted mt-2">
            Last Updated: November 2025 • In alignment with applicable data protection principles.
          </p>
        </header>

        <div className="rounded-3xl border border-[#E8E2D9] bg-white p-8 sm:p-12 shadow-soft prose prose-stone max-w-none text-ink text-xs sm:text-sm leading-relaxed space-y-6">
          <section>
            <h2 className="text-base font-serif font-semibold text-ink">1. Information We Collect</h2>
            <p>
              When you use {siteConfig.name}, we collect only information strictly necessary to provide the assessment services and deliver your personalized PDF dossier:
            </p>
            <ul className="list-disc list-inside space-y-1 text-ink-muted">
              <li>
                <strong>Self-Assessment Responses:</strong> Your selected ratings (1–5) to questionnaire items, used exclusively to compute your deterministic psychometric scores.
              </li>
              <li>
                <strong>Purchase Information:</strong> Name, email address, and order transaction IDs when you purchase an unlocked report dossier.
              </li>
              <li>
                <strong>Technical Diagnostics:</strong> IP address hashes and browser user agents for fraud prevention and secure rate-limiting.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-serif font-semibold text-ink">2. How Your Data Is Handled</h2>
            <p>
              We do not sell, rent, monetize, or disclose your individual assessment answers or email addresses to advertisers, employers, recruiters, or data brokers.
            </p>
            <p>
              Your questionnaire responses are evaluated by our deterministic scoring engine to generate your preview and official report.
            </p>
          </section>

          <section>
            <h2 className="text-base font-serif font-semibold text-ink">3. Payment Security</h2>
            <p>
              All financial transactions are processed securely through Razorpay using industry-standard 256-bit encryption. {siteConfig.name} never stores your credit card numbers, debit card PINs, or UPI credentials on our servers.
            </p>
          </section>

          <section>
            <h2 className="text-base font-serif font-semibold text-ink">4. Data Retention & Deletion</h2>
            <p>
              You have the right to request the permanent deletion of your customer record and generated reports at any time. To request data deletion, contact us at {siteConfig.supportEmail}.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
