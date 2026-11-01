import React from "react";
import { siteConfig } from "@/config/site";
import { Mail, Clock, ShieldCheck, HelpCircle } from "lucide-react";

export const metadata = {
  title: "Contact & Support | INNERATLAS",
  description:
    "Have questions regarding your assessment report or payment? Reach out to the INNERATLAS team.",
};

export default function ContactPage() {
  return (
    <div className="bg-canvas min-h-screen py-12 md:py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-700 block mb-2">
            Support & Inquiries
          </span>
          <h1 className="text-3xl sm:text-5xl font-serif text-ink font-semibold tracking-tight mb-3">
            How Can We Help You?
          </h1>
          <p className="text-sm sm:text-base text-ink-muted max-w-lg mx-auto">
            Whether you need assistance retrieving a past report or have questions about our psychometric frameworks, we are here for you.
          </p>
        </div>

        <div className="rounded-3xl border border-[#E8E2D9] bg-white p-8 sm:p-12 shadow-soft space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-canvas border border-[#E8E2D9] space-y-2">
              <Mail className="w-5 h-5 text-brand-600 mb-2" />
              <h3 className="font-semibold text-ink text-sm">Customer Support</h3>
              <p className="text-xs text-ink-muted">For report delivery or payment questions:</p>
              <a
                href={`mailto:${siteConfig.supportEmail}`}
                className="text-xs font-bold text-brand-700 hover:underline block pt-1"
              >
                {siteConfig.supportEmail}
              </a>
            </div>

            <div className="p-6 rounded-2xl bg-canvas border border-[#E8E2D9] space-y-2">
              <Clock className="w-5 h-5 text-accent-gold mb-2" />
              <h3 className="font-semibold text-ink text-sm">Response Window</h3>
              <p className="text-xs text-ink-muted">Monday – Saturday</p>
              <span className="text-xs font-semibold text-ink block pt-1">
                Typical reply within 12–24 hours
              </span>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-brand-50/70 border border-brand-200 text-xs text-brand-900 space-y-2">
            <h4 className="font-bold uppercase tracking-wider">Quick Report Retrieval</h4>
            <p>
              If you completed a purchase and need to download your PDF dossier again, you do not need to wait for email support. Simply visit our{" "}
              <a href="/dashboard" className="underline font-semibold">
                Report Dashboard
              </a>{" "}
              and enter your email address to download your report instantly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
