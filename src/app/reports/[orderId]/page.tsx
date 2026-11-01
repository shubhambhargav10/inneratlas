import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db/store";
import { getAssessmentBySlug } from "@/data/assessments";
import {
  Download,
  Share2,
  Printer,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Award,
  Calendar,
  ShieldCheck,
  Compass,
} from "lucide-react";

interface ReportPageProps {
  params: { orderId: string };
  searchParams: { token?: string };
}

export default function DigitalReportPage({ params, searchParams }: ReportPageProps) {
  const { orderId } = params;
  const { token } = searchParams;

  const order = db.getOrderById(orderId);
  if (!order) {
    notFound();
  }

  // Security Gate: Ensure order is paid
  if (order.status !== "paid") {
    redirect(`/assessments/${order.assessmentSlug}/preview`);
  }

  // Token verification check if present
  if (token && order.accessToken && token !== order.accessToken) {
    redirect(`/assessments/${order.assessmentSlug}/preview`);
  }

  const report = db.getReportByOrderId(orderId);
  const assessment = getAssessmentBySlug(order.assessmentSlug);
  const result = order.resultPayload;

  const { primaryArchetype, secondaryArchetype, dimensionScores, synthesis } = result;

  const formattedDate = new Date(report?.generatedAt || order.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="bg-canvas min-h-screen py-8 md:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Sticky Action Banner */}
        <div className="sticky top-20 z-30 mb-8 rounded-2xl bg-white/95 backdrop-blur-md border border-[#E8E2D9] p-4 shadow-lifted flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-ink flex items-center justify-center text-white">
              <Compass className="w-5 h-5 text-brand-300" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-700 block">
                Official Dossier
              </span>
              <span className="text-sm font-semibold text-ink">
                {synthesis.archetypeBlendName}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <a
              href={`/api/reports/${orderId}/download?token=${token || order.accessToken}`}
              download
              className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-ink text-white text-xs sm:text-sm font-semibold shadow-soft hover:bg-ink-light transition-all active:scale-95"
            >
              <Download className="w-4 h-4 text-brand-300" />
              <span>Download PDF</span>
            </a>
          </div>
        </div>

        {/* Dossier Header Card */}
        <div className="rounded-3xl border border-[#E8E2D9] bg-white p-6 sm:p-12 shadow-soft mb-10">
          <div className="flex flex-wrap items-center justify-between pb-8 border-b border-[#E8E2D9] gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-brand-700 block mb-1">
                InnerAtlas Psychometric Dossier
              </span>
              <h1 className="text-3xl sm:text-5xl font-serif text-ink font-semibold tracking-tight">
                {synthesis.archetypeBlendName}
              </h1>
              <p className="text-sm sm:text-base text-ink-muted mt-2 max-w-xl">
                {synthesis.blendDescription}
              </p>
            </div>

            <div className="rounded-2xl bg-canvas border border-[#E8E2D9] p-4 text-xs space-y-1 min-w-[200px]">
              <div>
                <span className="text-ink-muted">Prepared For:</span>{" "}
                <strong className="text-ink">{order.customerName}</strong>
              </div>
              <div>
                <span className="text-ink-muted">Dossier Code:</span>{" "}
                <span className="font-mono text-brand-700 font-semibold">
                  {report?.reportCode || order.orderNumber}
                </span>
              </div>
              <div>
                <span className="text-ink-muted">Generated:</span>{" "}
                <span className="text-ink">{formattedDate}</span>
              </div>
            </div>
          </div>

          {/* Section 1: Executive Summary */}
          <div className="py-8 border-b border-[#E8E2D9]">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-3">
              1. Executive Personality Summary
            </h2>
            <p className="text-sm sm:text-base text-ink leading-relaxed">
              {result.executiveSummary}
            </p>
          </div>

          {/* Section 2: Primary Archetype Deep Dive */}
          <div className="py-8 border-b border-[#E8E2D9]">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-700 block mb-1">
              Primary Behavioral Blueprint
            </span>
            <h3 className="text-2xl font-serif text-ink font-semibold mb-2">
              {primaryArchetype.title} — {primaryArchetype.subtitle}
            </h3>
            <p className="text-xs sm:text-sm text-ink-muted italic mb-4">
              "{primaryArchetype.tagline}"
            </p>
            <p className="text-sm sm:text-base text-ink leading-relaxed mb-6">
              {primaryArchetype.fullDescription}
            </p>

            {/* Superpowers Grid */}
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-3">
              Calibrated Superpowers
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {primaryArchetype.superpowers.map((power, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-canvas border border-[#E8E2D9] flex items-start space-x-3"
                >
                  <CheckCircle2 className="w-4 h-4 text-accent-emerald flex-shrink-0 mt-0.5" />
                  <span className="text-xs sm:text-sm font-medium text-ink">{power}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Secondary Archetype if present */}
          {secondaryArchetype && (
            <div className="py-8 border-b border-[#E8E2D9]">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-700 block mb-1">
                Secondary Complementary Archetype
              </span>
              <h3 className="text-2xl font-serif text-ink font-semibold mb-2">
                {secondaryArchetype.title} — {secondaryArchetype.subtitle}
              </h3>
              <p className="text-xs sm:text-sm text-ink-muted italic mb-4">
                "{secondaryArchetype.tagline}"
              </p>
              <p className="text-sm sm:text-base text-ink leading-relaxed">
                {secondaryArchetype.fullDescription}
              </p>
            </div>
          )}

          {/* Section 4: Dimensional Scores */}
          <div className="py-8 border-b border-[#E8E2D9]">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-4">
              4. Calibrated Dimensional Distribution
            </h2>
            <div className="space-y-6">
              {dimensionScores.map((dim) => (
                <div key={dim.key} className="space-y-2">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="font-semibold text-ink">{dim.name}</span>
                    <span className="font-mono font-bold text-brand-700">
                      {dim.normalizedScore}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-[#E8E2D9] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-600 rounded-full"
                      style={{ width: `${dim.normalizedScore}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-ink-muted">
                    <span>{dim.lowLabel}</span>
                    <span>{dim.highLabel}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Shadow Traits & Blindspots */}
          <div className="py-8 border-b border-[#E8E2D9]">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-4">
              5. Subconscious Derailers & Blindspots
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {synthesis.shadowTraits.map((trait, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-accent-coral/5 border border-accent-coral/20 flex items-start space-x-3"
                >
                  <AlertTriangle className="w-4 h-4 text-accent-coral flex-shrink-0 mt-0.5" />
                  <span className="text-xs sm:text-sm font-medium text-ink leading-snug">
                    {trait}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 6: Communication & Interpersonal Dynamics */}
          <div className="py-8 border-b border-[#E8E2D9]">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-3">
              6. Communication & Feedback Blueprint
            </h2>
            <p className="text-sm sm:text-base text-ink leading-relaxed mb-6">
              {synthesis.communicationGuidance}
            </p>

            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-3">
              7. Collaboration & Environment Synergy
            </h2>
            <p className="text-sm sm:text-base text-ink leading-relaxed mb-4">
              {synthesis.collaborationDynamics}
            </p>
            <div className="p-4 rounded-2xl bg-canvas border border-[#E8E2D9] text-xs sm:text-sm text-ink">
              <strong>Optimal Working Environment: </strong>
              {synthesis.careerEnvironmentRecommendation}
            </div>
          </div>

          {/* Section 7: 90-Day Execution Roadmap */}
          <div className="pt-8">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-4">
              8. Personalized 90-Day Evolution Roadmap
            </h2>

            <div className="space-y-4">
              {/* Month 1 */}
              <div className="p-5 rounded-2xl border-l-4 border-l-brand-600 bg-canvas border border-[#E8E2D9]">
                <h3 className="font-semibold text-sm sm:text-base text-ink mb-1">
                  {synthesis.actionPlan90Days.phase1.title}
                </h3>
                <p className="text-xs text-ink-muted italic mb-3">
                  Objective: {synthesis.actionPlan90Days.phase1.objective}
                </p>
                <ul className="space-y-1.5 text-xs sm:text-sm text-ink list-disc list-inside">
                  {synthesis.actionPlan90Days.phase1.actions.map((act, idx) => (
                    <li key={idx}>{act}</li>
                  ))}
                </ul>
              </div>

              {/* Month 2 */}
              <div className="p-5 rounded-2xl border-l-4 border-l-brand-600 bg-canvas border border-[#E8E2D9]">
                <h3 className="font-semibold text-sm sm:text-base text-ink mb-1">
                  {synthesis.actionPlan90Days.phase2.title}
                </h3>
                <p className="text-xs text-ink-muted italic mb-3">
                  Objective: {synthesis.actionPlan90Days.phase2.objective}
                </p>
                <ul className="space-y-1.5 text-xs sm:text-sm text-ink list-disc list-inside">
                  {synthesis.actionPlan90Days.phase2.actions.map((act, idx) => (
                    <li key={idx}>{act}</li>
                  ))}
                </ul>
              </div>

              {/* Month 3 */}
              <div className="p-5 rounded-2xl border-l-4 border-l-brand-600 bg-canvas border border-[#E8E2D9]">
                <h3 className="font-semibold text-sm sm:text-base text-ink mb-1">
                  {synthesis.actionPlan90Days.phase3.title}
                </h3>
                <p className="text-xs text-ink-muted italic mb-3">
                  Objective: {synthesis.actionPlan90Days.phase3.objective}
                </p>
                <ul className="space-y-1.5 text-xs sm:text-sm text-ink list-disc list-inside">
                  {synthesis.actionPlan90Days.phase3.actions.map((act, idx) => (
                    <li key={idx}>{act}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Disclaimer */}
        <div className="rounded-2xl bg-canvas-subtle border border-[#E8E2D9] p-4 text-[11px] text-ink-muted leading-relaxed text-center">
          <strong>Self-Reflection Notice:</strong> This dossier was generated deterministically based on your submitted self-assessment answers. It is intended solely for personal reflection, coaching discussions, and self-directed personal development.
        </div>
      </div>
    </div>
  );
}
