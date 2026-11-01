"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { allAssessments } from "@/data/assessments";
import { getStoredSession } from "@/lib/session/clientStorage";
import {
  FileText,
  Download,
  ExternalLink,
  ShieldCheck,
  Key,
  Sparkles,
  ArrowRight,
  Clock,
  HelpCircle,
  Lock,
} from "lucide-react";

export default function UserDashboardPage() {
  const router = useRouter();
  const [orderIdInput, setOrderIdInput] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // In-progress local sessions detected in browser
  const [localSessions, setLocalSessions] = useState<
    Array<{
      slug: string;
      title: string;
      answeredCount: number;
      totalCount: number;
      isCompleted: boolean;
    }>
  >([]);

  useEffect(() => {
    // Check local storage for active sessions on this device
    const detected: typeof localSessions = [];
    allAssessments.forEach((asm) => {
      const saved = getStoredSession(asm.slug);
      if (saved && Object.keys(saved.answers).length > 0) {
        detected.push({
          slug: asm.slug,
          title: asm.title,
          answeredCount: Object.keys(saved.answers).length,
          totalCount: asm.questions.length,
          isCompleted: saved.isCompleted,
        });
      }
    });
    setLocalSessions(detected);
  }, []);

  const handleAccessReport = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const trimmedOrder = orderIdInput.trim();
    const trimmedToken = tokenInput.trim();

    if (!trimmedOrder || !trimmedToken) {
      setErrorMessage("Please enter both your Order ID and Access Token.");
      return;
    }

    // Direct client to the authorized report viewer
    router.push(`/reports/${trimmedOrder}?token=${encodeURIComponent(trimmedToken)}`);
  };

  return (
    <div className="bg-canvas min-h-screen py-10 md:py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="max-w-2xl mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-700 block mb-2">
            Member & Guest Hub
          </span>
          <h1 className="text-3xl sm:text-5xl font-serif text-ink font-semibold tracking-tight mb-3">
            My Assessments & Reports
          </h1>
          <p className="text-sm sm:text-base text-ink-muted">
            Access your personalized PDF dossiers, resume unfinished questionnaires, or explore new psychometric assessments.
          </p>
        </div>

        {/* Secure Access Form */}
        <div className="rounded-3xl border border-[#E8E2D9] bg-white p-6 sm:p-10 shadow-soft mb-12">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-brand-700 mb-2">
            <ShieldCheck className="w-4 h-4 text-accent-emerald" />
            <span>Secure Dossier Access</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-serif font-semibold text-ink mb-2">
            Access Your Purchased Dossier
          </h2>
          <p className="text-xs sm:text-sm text-ink-muted mb-6 leading-relaxed">
            To strictly safeguard your personal psychological reflections from unauthorized viewing, reports are bound to your secure credentials provided at checkout.
          </p>

          <form onSubmit={handleAccessReport} className="space-y-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Order ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ord_8638bc89b3d8e394"
                  value={orderIdInput}
                  onChange={(e) => setOrderIdInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#E8E2D9] text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-600 bg-canvas/30 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Access Token
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. acc_6b6d1477ca56ca29..."
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#E8E2D9] text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-600 bg-canvas/30 font-mono"
                />
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-accent-coral/10 text-accent-coral text-xs">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              className="inline-flex items-center justify-center space-x-2 py-3 px-6 rounded-xl bg-ink text-white font-semibold text-sm shadow-soft hover:bg-ink-light transition-all active:scale-95"
            >
              <Key className="w-4 h-4 text-brand-300" />
              <span>Unlock & View Dossier</span>
            </button>
          </form>

          {/* Privacy Disclosure Footnote */}
          <div className="pt-4 border-t border-[#E8E2D9] flex items-start space-x-2.5 text-xs text-ink-muted">
            <Lock className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Privacy Protection Notice:</strong> In accordance with our security principles, arbitrary email searches are disabled so that third parties cannot enumerate or view your assessment results. If you cannot locate your credentials, please contact support.
            </span>
          </div>
        </div>

        {/* Local In-Progress or Completed Free Sessions */}
        {localSessions.length > 0 && (
          <div className="rounded-3xl border border-[#E8E2D9] bg-white p-6 sm:p-10 shadow-soft mb-12">
            <h2 className="text-xl font-serif font-semibold text-ink mb-2">
              Recent Device Sessions
            </h2>
            <p className="text-xs sm:text-sm text-ink-muted mb-6">
              Assessments you have answered or completed on this browser:
            </p>

            <div className="space-y-4">
              {localSessions.map((item) => (
                <div
                  key={item.slug}
                  className="p-5 rounded-2xl border border-[#E8E2D9] bg-canvas flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <h3 className="font-semibold text-sm text-ink mb-1">{item.title}</h3>
                    <p className="text-xs text-ink-muted">
                      Progress: {item.answeredCount} of {item.totalCount} questions answered
                      {item.isCompleted && " • Completed"}
                    </p>
                  </div>

                  <div className="flex items-center space-x-3">
                    {item.isCompleted ? (
                      <Link
                        href={`/assessments/${item.slug}/preview`}
                        className="inline-flex items-center space-x-1.5 py-2 px-4 rounded-xl bg-brand-600 text-white text-xs font-semibold shadow-soft hover:bg-brand-700 transition-all"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>View Results Preview</span>
                      </Link>
                    ) : (
                      <Link
                        href={`/assessments/${item.slug}/take`}
                        className="inline-flex items-center space-x-1.5 py-2 px-4 rounded-xl bg-ink text-white text-xs font-semibold shadow-soft hover:bg-ink-light transition-all"
                      >
                        <span>Resume Questionnaire</span>
                        <ArrowRight className="w-3.5 h-3.5 text-brand-300" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Take Another Assessment Card */}
        <div className="rounded-3xl bg-[#F4EFEA] border border-[#E8E2D9] p-8 text-center">
          <h3 className="text-xl font-serif font-semibold text-ink mb-2">
            Explore Another Assessment
          </h3>
          <p className="text-xs sm:text-sm text-ink-muted max-w-md mx-auto mb-6">
            Compare your Personality Archetype with your Career DNA or Thinking Style Matrix to build a comprehensive map of your mind.
          </p>
          <Link
            href="/assessments"
            className="inline-flex items-center space-x-2 py-3 px-6 rounded-xl bg-ink text-white text-xs sm:text-sm font-semibold shadow-soft hover:bg-ink-light transition-all"
          >
            <span>Explore Assessment Catalogue</span>
            <ArrowRight className="w-4 h-4 text-brand-300" />
          </Link>
        </div>
      </div>
    </div>
  );
}
