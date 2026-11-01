import React from "react";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { Compass, ShieldCheck, HeartHandshake, Award, ArrowRight } from "lucide-react";

export const metadata = {
  title: "About Us | INNERATLAS",
  description:
    "Learn about our mission to provide thoughtful, deterministic psychometric self-reflection tools without sensationalized pseudoscience.",
};

export default function AboutPage() {
  return (
    <div className="bg-canvas min-h-screen py-12 md:py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="max-w-3xl mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-700 block mb-2">
            Our Mission & Philosophy
          </span>
          <h1 className="text-3xl sm:text-5xl font-serif text-ink font-semibold tracking-tight mb-4">
            Helping You Navigate Your Inner World
          </h1>
          <p className="text-base sm:text-lg text-ink-muted leading-relaxed">
            INNERATLAS was founded on a simple conviction: modern digital self-discovery should be intellectually rigorous, beautifully crafted, and free from sensationalized pseudoscience.
          </p>
        </div>

        <div className="rounded-3xl border border-[#E8E2D9] bg-white p-8 sm:p-12 shadow-soft space-y-8 mb-12 text-ink text-sm sm:text-base leading-relaxed">
          <div>
            <h2 className="text-xl font-serif font-semibold text-ink mb-3">
              Why We Exist
            </h2>
            <p className="text-ink-muted leading-relaxed">
              Every day, millions of people make career, creative, and life decisions based on guesswork or advice tailored for someone else's temperament. Popular internet quizzes offer superficial four-letter labels that flatter the ego but fail to provide actionable clarity.
            </p>
            <p className="text-ink-muted leading-relaxed mt-3">
              We build multi-dimensional psychometric frameworks that treat you as an evolving individual with primary tendencies and secondary balances. Our assessments help you identify where your energy flows naturally, where subconscious blindspots trip you up, and what environments enable your best work.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-[#E8E2D9]">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center font-bold">
                1
              </div>
              <h3 className="font-semibold text-ink">Deterministic Scoring</h3>
              <p className="text-xs text-ink-muted">
                Zero AI hallucinations in assessment calculations. Identical answers yield bit-for-bit identical, reproducible outputs.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center font-bold">
                2
              </div>
              <h3 className="font-semibold text-ink">Strict Confidentiality</h3>
              <p className="text-xs text-ink-muted">
                Your personal reflections are never sold to advertisers, recruiters, or data brokers. 100% private.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center font-bold">
                3
              </div>
              <h3 className="font-semibold text-ink">Personal Development</h3>
              <p className="text-xs text-ink-muted">
                Designed for self-directed growth, leadership alignment, and coaching conversations—never clinical diagnosis.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-ink text-white p-8 sm:p-10 text-center shadow-lifted">
          <h2 className="text-2xl sm:text-3xl font-serif font-semibold mb-3">
            Experience the framework for yourself.
          </h2>
          <p className="text-xs sm:text-sm text-ink-muted/80 max-w-md mx-auto mb-6">
            Explore our assessment catalogue and discover your primary archetype blend today.
          </p>
          <Link
            href="/assessments"
            className="inline-flex items-center space-x-2 py-3 px-6 rounded-xl bg-white text-ink text-xs sm:text-sm font-semibold shadow-soft hover:bg-canvas transition-all"
          >
            <span>Explore All Assessments</span>
            <ArrowRight className="w-4 h-4 text-brand-600" />
          </Link>
        </div>
      </div>
    </div>
  );
}
