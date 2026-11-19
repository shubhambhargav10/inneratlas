import React from "react";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { allAssessments } from "@/data/assessments";
import {
  Compass,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  FileText,
  Lock,
  Layers,
  HelpCircle,
  Eye,
  Award,
  ChevronDown,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="bg-canvas overflow-hidden">
      {/* 1. HERO SECTION */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 border-b border-[#E8E2D9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            {/* Editorial Badge */}
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-800 text-xs font-semibold uppercase tracking-wider mb-6 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              <span>Scientific Frameworks • Actionable Self-Reflection</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-serif text-ink font-normal tracking-tight leading-[1.08] mb-6">
              Understand yourself <br className="hidden sm:block" />
              <span className="italic font-medium text-brand-700">beyond the obvious.</span>
            </h1>

            {/* Sub-headline */}
            <p className="text-lg sm:text-xl text-ink-muted leading-relaxed font-normal mb-10 max-w-2xl mx-auto">
              Move beyond simplistic 4-letter boxes. Take our calibrated self-discovery assessments for free, and unlock a deeply personalized six-page executive PDF dossier designed for personal and professional mastery.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link
                href="/assessments/personality-archetype"
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2.5 rounded-2xl bg-ink px-7 py-4 text-base font-semibold text-white shadow-lifted hover:bg-ink-light transition-all active:scale-[0.98]"
              >
                <span>Take Personality Assessment</span>
                <ArrowRight className="w-4 h-4 text-brand-300" />
              </Link>
              <Link
                href="/assessments"
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 rounded-2xl bg-white border border-[#E8E2D9] px-7 py-4 text-base font-semibold text-ink shadow-soft hover:bg-canvas-subtle transition-all"
              >
                <span>Browse All 3 Assessments</span>
              </Link>
            </div>

            {/* Reassurance Micro-Copy */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-ink-muted">
              <span className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-accent-emerald" />
                <span>100% Free to Take</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <Lock className="w-4 h-4 text-brand-600" />
                <span>No Mandatory Account</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-accent-gold" />
                <span>10–12 Minutes</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. FEATURED ASSESSMENTS CATALOGUE */}
      <section className="py-20 md:py-28 bg-[#F4EFEA] border-b border-[#E8E2D9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-700 block mb-2">
              The Assessment Suite
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif text-ink font-semibold tracking-tight mb-4">
              Explore Your Mind, Career & Thinking
            </h2>
            <p className="text-sm sm:text-base text-ink-muted">
              Each assessment is built upon distinct psychometric dimensions to generate nuanced, deterministic insights rather than forced categorizations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {allAssessments.map((assessment) => (
              <div
                key={assessment.slug}
                className="rounded-3xl border border-[#E8E2D9] bg-white p-7 shadow-soft flex flex-col justify-between hover:shadow-lifted transition-all group"
              >
                <div>
                  {/* Category & Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-canvas text-brand-700 border border-[#E8E2D9]">
                      {assessment.category}
                    </span>
                    {assessment.badgeLabel && (
                      <span className="text-[11px] font-bold uppercase tracking-wider text-accent-gold flex items-center space-x-1">
                        <Sparkles className="w-3 h-3 text-accent-gold" />
                        <span>{assessment.badgeLabel}</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-serif font-semibold text-ink mb-2 group-hover:text-brand-700 transition-colors">
                    {assessment.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-ink-muted leading-relaxed mb-6">
                    {assessment.subtitle}
                  </p>

                  {/* Dimensions list */}
                  <div className="space-y-2 mb-6 pt-4 border-t border-[#E8E2D9]">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted block">
                      Core Dimensions Measured:
                    </span>
                    <ul className="text-xs text-ink space-y-1">
                      {assessment.dimensions.slice(0, 3).map((dim) => (
                        <li key={dim.key} className="flex items-center space-x-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                          <span>{dim.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-ink-muted mb-4 pt-4 border-t border-[#E8E2D9]">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{assessment.estimatedMinutes} mins</span>
                    </span>
                    <span className="font-semibold text-ink">
                      Free Preview • ₹{assessment.priceInr} Full PDF
                    </span>
                  </div>

                  <Link
                    href={`/assessments/${assessment.slug}`}
                    className="w-full inline-flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-ink text-white text-xs sm:text-sm font-semibold shadow-soft hover:bg-ink-light transition-all active:scale-[0.98]"
                  >
                    <span>Start Free Assessment</span>
                    <ArrowRight className="w-3.5 h-3.5 text-brand-300" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS (4 STEPS) */}
      <section id="how-it-works" className="py-20 md:py-28 bg-canvas border-b border-[#E8E2D9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-700 block mb-2">
              Automated Journey
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif text-ink font-semibold tracking-tight mb-4">
              How INNERATLAS Works
            </h2>
            <p className="text-sm sm:text-base text-ink-muted">
              From thoughtful reflection to high-resolution personalized dossier delivery in minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Step 1 */}
            <div className="rounded-3xl border border-[#E8E2D9] bg-white p-6 shadow-soft relative">
              <span className="font-serif text-4xl text-brand-200 font-bold block mb-3">01</span>
              <h3 className="text-base font-semibold text-ink mb-2">Select Your Framework</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Choose between Personality Archetypes, Career DNA, or Thinking Styles based on what you seek to navigate.
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-3xl border border-[#E8E2D9] bg-white p-6 shadow-soft relative">
              <span className="font-serif text-4xl text-brand-200 font-bold block mb-3">02</span>
              <h3 className="text-base font-semibold text-ink mb-2">Answer With Candor</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Complete 24–28 scenario-based questions. Progress auto-saves continuously, so you never lose your place.
              </p>
            </div>

            {/* Step 3 */}
            <div className="rounded-3xl border border-[#E8E2D9] bg-white p-6 shadow-soft relative">
              <span className="font-serif text-4xl text-brand-200 font-bold block mb-3">03</span>
              <h3 className="text-base font-semibold text-ink mb-2">Explore Free Preview</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Instant deterministic scoring calculates your dominant archetype, dimensional distribution, and key superpowers.
              </p>
            </div>

            {/* Step 4 */}
            <div className="rounded-3xl border border-[#E8E2D9] bg-white p-6 shadow-soft relative">
              <span className="font-serif text-4xl text-brand-200 font-bold block mb-3">04</span>
              <h3 className="text-base font-semibold text-ink mb-2">Unlock Six-Page Dossier</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Purchase your complete, high-resolution printable PDF dossier with secondary blend analysis and 90-day action plan for ₹199.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SAMPLE REPORT SHOWCASE */}
      <section id="sample-report" className="py-20 md:py-28 bg-[#F4EFEA] border-b border-[#E8E2D9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-700 block mb-2">
              Inside Your Report
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif text-ink font-semibold tracking-tight mb-4">
              A True Digital Product, Not a Generic Template
            </h2>
            <p className="text-sm sm:text-base text-ink-muted">
              Every dossier is generated directly from your specific answer distribution. Here is what is included inside the six-page executive PDF:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "Personalized Cover & Unique ID",
                desc: "Official report registration code, issue timestamp, and individualized blend classification.",
                icon: FileText,
              },
              {
                title: "Primary & Secondary Synthesis",
                desc: "How your dominant archetype is shaped and counter-balanced by your secondary orientation.",
                icon: Award,
              },
              {
                title: "Normalized Dimensional Analytics",
                desc: "Visual vector charts mapping your exact position along multi-axis behavioral spectrums.",
                icon: Layers,
              },
              {
                title: "Superpowers & Practical Flow",
                desc: "Detailed breakdowns of where you deliver extraordinary value without excessive strain.",
                icon: CheckCircle2,
              },
              {
                title: "Hidden Shadow Traits & Derailers",
                desc: "The blind spots, cognitive biases, and stress habits that unconsciously sabotage progress.",
                icon: Eye,
              },
              {
                title: "Personalized 90-Day Roadmap",
                desc: "Phase 1 Awareness, Phase 2 Boundary Design, and Phase 3 Multiplier Mastery action items.",
                icon: Sparkles,
              },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="rounded-3xl border border-[#E8E2D9] bg-white p-6 shadow-soft flex items-start space-x-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-ink mb-1">{item.title}</h3>
                    <p className="text-xs text-ink-muted leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. FREQUENTLY ASKED QUESTIONS */}
      <section className="py-20 md:py-28 bg-canvas border-b border-[#E8E2D9]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-700 block mb-2">
              Common Questions
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif text-ink font-semibold tracking-tight mb-4">
              Everything You Need to Know
            </h2>
            <p className="text-sm sm:text-base text-ink-muted">
              Transparent answers regarding our assessments, privacy standards, and report delivery.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Is this assessment free to take?",
                a: "Yes. All three assessments are 100% free to complete. Upon completion, you immediately receive a free executive results preview revealing your primary archetype and dimensional scores. You can optionally purchase the full six-page in-depth PDF dossier for ₹199.",
              },
              {
                q: "Do I need to create an account before taking an assessment?",
                a: "No. We adopt a guest-first approach. Your progress and session are saved automatically in your browser's local storage. You do not need to register an account or remember passwords to start.",
              },
              {
                q: "What payment methods are supported?",
                a: "We support all major Indian payment methods through Razorpay, including UPI (Google Pay, PhonePe, Paytm), Credit & Debit cards, and NetBanking.",
              },
              {
                q: "How is my report delivered?",
                a: "Your report is generated instantly as a vector PDF document on your screen right after successful payment. You can download it directly to your device and view the digital version online anytime.",
              },
              {
                q: "Is this a clinical or medical diagnosis?",
                a: "No. INNERATLAS assessments are designed strictly for educational exploration, personal self-reflection, and career development. They do not constitute clinical psychiatric diagnosis, medical advice, or IQ certification.",
              },
              {
                q: "Can I download my report again in the future?",
                a: "Yes. You can visit the 'My Reports' dashboard anytime and enter the email address you used during purchase to retrieve your past reports and download copies.",
              },
            ].map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-[#E8E2D9] bg-white p-6 shadow-soft"
              >
                <h3 className="text-base font-semibold text-ink mb-2 flex items-center justify-between">
                  <span>{faq.q}</span>
                  <HelpCircle className="w-4 h-4 text-brand-400 flex-shrink-0" />
                </h3>
                <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. BOTTOM CALL TO ACTION BANNER */}
      <section className="py-20 bg-ink text-white text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-300 block mb-3">
            Begin Your Self-Discovery
          </span>
          <h2 className="text-3xl sm:text-5xl font-serif font-normal tracking-tight mb-6">
            Ready to decode your invisible operating system?
          </h2>
          <p className="text-base sm:text-lg text-ink-muted/80 mb-10 max-w-xl mx-auto">
            Take the free 10-minute assessment now and uncover your primary archetype, dimensional distribution, and strategic blindspots.
          </p>
          <Link
            href="/assessments/personality-archetype"
            className="inline-flex items-center space-x-2.5 rounded-2xl bg-white px-8 py-4 text-base font-semibold text-ink shadow-glow hover:bg-canvas transition-all active:scale-[0.98]"
          >
            <span>Start Free Assessment Now</span>
            <ArrowRight className="w-4 h-4 text-brand-600" />
          </Link>
        </div>
      </section>
    </div>
  );
}
