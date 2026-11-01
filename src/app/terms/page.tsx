import React from "react";
import { siteConfig } from "@/config/site";

export const metadata = {
  title: "Terms of Service | INNERATLAS",
  description: "Terms and conditions governing the use of INNERATLAS assessments and digital report dossiers.",
};

export default function TermsPage() {
  return (
    <div className="bg-canvas min-h-screen py-12 md:py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <header className="mb-10 pb-6 border-b border-[#E8E2D9]">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-700 block mb-1">
            Legal Agreement
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif text-ink font-semibold tracking-tight">
            Terms of Service
          </h1>
          <p className="text-xs text-ink-muted mt-2">
            Last Updated: November 2025
          </p>
        </header>

        <div className="rounded-3xl border border-[#E8E2D9] bg-white p-8 sm:p-12 shadow-soft prose prose-stone max-w-none text-ink text-xs sm:text-sm leading-relaxed space-y-6">
          <section>
            <h2 className="text-base font-serif font-semibold text-ink">1. Nature of the Service</h2>
            <p>
              {siteConfig.name} provides interactive psychological self-reflection assessments and personalized downloadable PDF dossiers. The services and reports are created strictly for personal development, educational exploration, and self-directed coaching conversations.
            </p>
            <p>
              <strong>Clinical & Medical Disclaimer:</strong> The assessments, scoring models, and reports do NOT constitute clinical psychological diagnosis, mental health therapy, medical advice, psychiatric evaluation, or employment screening certification.
            </p>
          </section>

          <section>
            <h2 className="text-base font-serif font-semibold text-ink">2. Intellectual Property</h2>
            <p>
              All assessment questions, scoring algorithms, archetypal models, and PDF design templates are the original intellectual property of {siteConfig.name}. You may not scrape, reproduce, resell, or distribute our assessment content without prior written permission.
            </p>
          </section>

          <section>
            <h2 className="text-base font-serif font-semibold text-ink">3. Digital Product Delivery</h2>
            <p>
              Upon successful payment verification, your personalized PDF dossier is delivered instantly on screen and made available for permanent download.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
