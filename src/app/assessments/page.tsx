import React from "react";
import Link from "next/link";
import { allAssessments } from "@/data/assessments";
import { Clock, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "Assessment Catalogue — Discover Your Operating System",
  description:
    "Explore our complete suite of self-reflection assessments: Personality Archetypes, Career DNA, and Thinking Styles. Calibrated psychometric frameworks for personal mastery.",
};

export default function AssessmentCataloguePage() {
  return (
    <div className="bg-canvas min-h-screen py-12 md:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-3xl mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-700 block mb-2">
            Assessment Catalogue
          </span>
          <h1 className="text-3xl sm:text-5xl font-serif text-ink font-semibold tracking-tight mb-4">
            Curated Self-Discovery Frameworks
          </h1>
          <p className="text-base text-ink-muted leading-relaxed">
            Every assessment is original, deterministic, and designed to reveal nuanced psychological and behavioral insights. Free to take, with optional full executive PDF unlock.
          </p>
        </div>

        {/* Assessment Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {allAssessments.map((asm) => (
            <div
              key={asm.slug}
              className="rounded-3xl border border-[#E8E2D9] bg-white p-7 shadow-soft flex flex-col justify-between hover:shadow-lifted transition-all group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-canvas text-brand-700 border border-[#E8E2D9]">
                    {asm.category}
                  </span>
                  {asm.badgeLabel && (
                    <span className="text-[11px] font-bold uppercase tracking-wider text-accent-gold flex items-center space-x-1">
                      <Sparkles className="w-3 h-3 text-accent-gold" />
                      <span>{asm.badgeLabel}</span>
                    </span>
                  )}
                </div>

                <h2 className="text-xl font-serif font-semibold text-ink mb-2 group-hover:text-brand-700 transition-colors">
                  {asm.title}
                </h2>
                <p className="text-xs sm:text-sm text-ink-muted leading-relaxed mb-6">
                  {asm.subtitle}
                </p>

                <div className="space-y-2 mb-6 pt-4 border-t border-[#E8E2D9]">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted block">
                    What You Will Discover:
                  </span>
                  <ul className="text-xs text-ink space-y-1.5">
                    {asm.whatYouWillDiscover.slice(0, 3).map((disc, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-accent-emerald flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{disc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-ink-muted mb-4 pt-4 border-t border-[#E8E2D9]">
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{asm.estimatedMinutes} mins</span>
                  </span>
                  <span className="font-semibold text-ink">
                    Free Preview • ₹{asm.priceInr} Dossier
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href={`/assessments/${asm.slug}`}
                    className="w-full inline-flex items-center justify-center py-2.5 px-3 rounded-xl bg-canvas border border-[#E8E2D9] text-xs font-semibold text-ink hover:bg-canvas-subtle transition-all text-center"
                  >
                    Details
                  </Link>
                  <Link
                    href={`/assessments/${asm.slug}/take`}
                    className="w-full inline-flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-ink text-white text-xs font-semibold shadow-soft hover:bg-ink-light transition-all text-center"
                  >
                    <span>Start Test</span>
                    <ArrowRight className="w-3.5 h-3.5 text-brand-300" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
