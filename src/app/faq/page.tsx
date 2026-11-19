import React from "react";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { HelpCircle, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Frequently Asked Questions | INNERATLAS",
  description: "Comprehensive answers to common questions about our psychometric assessments and PDF reports.",
};

export default function FAQPage() {
  const faqs = [
    {
      q: "What makes INNERATLAS different from other online personality tests?",
      a: "Most online quizzes force you into rigid binary categories or shallow 4-letter labels. INNERATLAS measures four to six calibrated psychometric spectrums to identify both your Primary Archetype and your Secondary Balance (e.g. The Strategic Creator). The resulting reports are detailed six-page executive dossiers with concrete, nuanced growth roadmaps.",
    },
    {
      q: "Are the assessments really free?",
      a: "Yes. All three assessments (Personality Archetype, Career DNA, and Thinking Styles) can be taken completely free of charge. You immediately receive a free executive preview showing your primary archetype, dimensional distribution, and superpowers. The full six-page in-depth PDF report is available for an optional one-time fee of ₹199.",
    },
    {
      q: "How does the PDF report get delivered?",
      a: "Immediately upon payment confirmation, your customized PDF dossier is rendered on your screen. You can download it directly as an A4 printable vector PDF and view the digital version online anytime.",
    },
    {
      q: "What if I refresh or accidentally close my browser during the assessment?",
      a: "Your questionnaire responses auto-save to your local browser storage after every single question. When you return or refresh the page, your progress is automatically restored without losing any answers.",
    },
    {
      q: "Is my personal data kept confidential?",
      a: "Strictly confidential. We do not sell, rent, or share individual responses with advertisers, recruiters, or data brokers. Your responses are used solely to calculate your psychometric profile.",
    },
    {
      q: "What payment methods are supported in India?",
      a: "We support UPI (Google Pay, PhonePe, Paytm, BHIM), Indian Debit & Credit Cards (Visa, Mastercard, RuPay), and NetBanking via Razorpay.",
    },
    {
      q: "Is this assessment scientifically or clinically diagnostic?",
      a: "No. INNERATLAS assessments are designed strictly for educational exploration, personal development, and self-reflection. They are not clinical psychological diagnostic instruments, psychiatric evaluations, or employment selection guarantees.",
    },
  ];

  return (
    <div className="bg-canvas min-h-screen py-12 md:py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-700 block mb-2">
            Questions & Clarity
          </span>
          <h1 className="text-3xl sm:text-5xl font-serif text-ink font-semibold tracking-tight mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-base text-ink-muted max-w-lg mx-auto">
            Everything you need to know about our assessments, scoring methodology, and digital reports.
          </p>
        </div>

        <div className="space-y-4 mb-14">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-[#E8E2D9] bg-white p-6 sm:p-7 shadow-soft"
            >
              <h3 className="text-base font-semibold text-ink mb-2.5 flex items-start justify-between">
                <span>{faq.q}</span>
                <HelpCircle className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5 ml-3" />
              </h3>
              <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>

        <div className="rounded-3xl bg-[#F4EFEA] border border-[#E8E2D9] p-8 text-center">
          <h3 className="text-xl font-serif font-semibold text-ink mb-2">
            Have a question not answered here?
          </h3>
          <p className="text-xs sm:text-sm text-ink-muted mb-6">
            Our team is happy to assist you with any questions or feedback.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center space-x-2 py-3 px-6 rounded-xl bg-ink text-white text-xs sm:text-sm font-semibold shadow-soft hover:bg-ink-light transition-all"
          >
            <span>Contact Support</span>
            <ArrowRight className="w-4 h-4 text-brand-300" />
          </Link>
        </div>
      </div>
    </div>
  );
}
