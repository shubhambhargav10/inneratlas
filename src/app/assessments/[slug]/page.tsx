import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAssessmentBySlug, allAssessments } from "@/data/assessments";
import {
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Lock,
  Layers,
  Award,
} from "lucide-react";

interface AssessmentLandingPageProps {
  params: { slug: string };
}

export function generateStaticParams() {
  return allAssessments.map((a) => ({ slug: a.slug }));
}

export function generateMetadata({ params }: AssessmentLandingPageProps) {
  const assessment = getAssessmentBySlug(params.slug);
  if (!assessment) return { title: "Assessment Not Found" };

  return {
    title: `${assessment.title} — Free Assessment & Personalized Dossier`,
    description: assessment.heroSubheadline,
  };
}

export default function AssessmentLandingPage({ params }: AssessmentLandingPageProps) {
  const assessment = getAssessmentBySlug(params.slug);
  if (!assessment) {
    notFound();
  }

  return (
    <div className="bg-canvas min-h-screen py-10 md:py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-xs text-ink-muted mb-6">
          <Link href="/assessments" className="hover:text-ink transition-colors">
            Assessments
          </Link>
          <span>/</span>
          <span className="text-ink font-medium">{assessment.title}</span>
        </div>

        {/* Hero Card */}
        <div className="rounded-3xl border border-[#E8E2D9] bg-white p-6 sm:p-12 shadow-soft mb-12">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-800 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            <span>{assessment.category} Assessment</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-serif text-ink font-semibold tracking-tight leading-tight mb-4">
            {assessment.heroHeadline}
          </h1>

          <p className="text-base sm:text-lg text-ink-muted leading-relaxed mb-8">
            {assessment.heroSubheadline}
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-6 border-t border-[#E8E2D9] mb-8">
            <Link
              href={`/assessments/${assessment.slug}/take`}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 py-3.5 px-8 rounded-2xl bg-ink text-white font-semibold text-sm sm:text-base shadow-soft hover:bg-ink-light transition-all active:scale-[0.98]"
            >
              <span>Begin Free Assessment</span>
              <ArrowRight className="w-4 h-4 text-brand-300" />
            </Link>

            <div className="flex items-center space-x-4 text-xs text-ink-muted">
              <span className="flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-brand-600" />
                <span>~{assessment.estimatedMinutes} minutes</span>
              </span>
              <span>•</span>
              <span>24–28 questions</span>
              <span>•</span>
              <span>100% Free Preview</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-[#E8E2D9] text-xs text-ink-muted">
            <div className="flex items-center space-x-2">
              <Lock className="w-4 h-4 text-accent-emerald" />
              <span>No mandatory account registration</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-brand-600" />
              <span>Continuous auto-save state</span>
            </div>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-accent-gold" />
              <span>Encrypted & private responses</span>
            </div>
          </div>
        </div>

        {/* Section: What You Will Discover */}
        <div className="rounded-3xl border border-[#E8E2D9] bg-white p-6 sm:p-10 shadow-soft mb-12">
          <h2 className="text-xl sm:text-2xl font-serif text-ink font-semibold mb-6">
            What You Will Discover
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {assessment.whatYouWillDiscover.map((disc, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-canvas border border-[#E8E2D9] flex items-start space-x-3"
              >
                <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <p className="text-xs sm:text-sm text-ink leading-relaxed">{disc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Section: Dimensions Measured */}
        <div className="rounded-3xl border border-[#E8E2D9] bg-white p-6 sm:p-10 shadow-soft mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl sm:text-2xl font-serif text-ink font-semibold">
              Calibrated Dimensions Measured
            </h2>
            <span className="text-xs text-brand-700 font-semibold">
              {assessment.dimensions.length} Spectrum Dimensions
            </span>
          </div>

          <div className="space-y-4">
            {assessment.dimensions.map((dim) => (
              <div
                key={dim.key}
                className="p-5 rounded-2xl bg-canvas border border-[#E8E2D9] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm sm:text-base text-ink">{dim.name}</h3>
                </div>
                <p className="text-xs text-ink-muted leading-relaxed">{dim.description}</p>
                <div className="flex items-center justify-between text-[11px] text-brand-700 font-medium pt-2 border-t border-[#E8E2D9]">
                  <span>Low: {dim.lowLabel}</span>
                  <span>High: {dim.highLabel}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section: Archetypes Snapshot */}
        <div className="rounded-3xl border border-[#E8E2D9] bg-white p-6 sm:p-10 shadow-soft mb-12">
          <h2 className="text-xl sm:text-2xl font-serif text-ink font-semibold mb-2">
            Possible Archetypes & Orientations
          </h2>
          <p className="text-xs sm:text-sm text-ink-muted mb-6">
            Our scoring engine matches you against these core archetypes and identifies your primary-secondary blend:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {assessment.archetypes.map((arch) => (
              <div
                key={arch.key}
                className="p-4 rounded-2xl bg-canvas border border-[#E8E2D9]"
              >
                <div className="flex items-center space-x-2 mb-1">
                  <Award className="w-4 h-4 text-accent-gold" />
                  <h3 className="font-semibold text-sm text-ink">{arch.title}</h3>
                </div>
                <p className="text-xs text-brand-700 font-medium mb-1.5">{arch.subtitle}</p>
                <p className="text-xs text-ink-muted line-clamp-2">{arch.shortDescription}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA Card */}
        <div className="rounded-3xl bg-ink text-white p-8 sm:p-10 text-center shadow-lifted">
          <h2 className="text-2xl sm:text-3xl font-serif font-semibold mb-3">
            Start your self-reflection journey today.
          </h2>
          <p className="text-xs sm:text-sm text-ink-muted/80 max-w-md mx-auto mb-6">
            Answer 24–28 questions in 10 minutes and receive your instant free results preview.
          </p>
          <Link
            href={`/assessments/${assessment.slug}/take`}
            className="inline-flex items-center space-x-2 py-3 px-8 rounded-xl bg-white text-ink text-sm font-semibold shadow-soft hover:bg-canvas transition-all"
          >
            <span>Begin Free Assessment</span>
            <ArrowRight className="w-4 h-4 text-brand-600" />
          </Link>
        </div>
      </div>
    </div>
  );
}
