"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { allAssessments } from "@/data/assessments";
import { getStoredSession } from "@/lib/session/clientStorage";
import {
  FileText,
  Download,
  ExternalLink,
  Search,
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
  Lock,
} from "lucide-react";

interface OrderSummary {
  orderId: string;
  orderNumber: string;
  assessmentSlug: string;
  customerName: string;
  customerEmail: string;
  amountPaise: number;
  status: string;
  reportCode?: string;
  accessToken?: string;
  createdAt: string;
}

export default function UserDashboardPage() {
  const [emailInput, setEmailInput] = useState("");
  const [searchedEmail, setSearchedEmail] = useState("");
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

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
    // Check local storage for active sessions
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

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput) return;

    setIsSearching(true);
    setHasSearched(true);
    setSearchedEmail(emailInput);

    try {
      const res = await fetch(`/api/user/reports?email=${encodeURIComponent(emailInput)}`);
      const data = await res.json();
      if (res.ok && data.orders) {
        setOrders(data.orders);
      } else {
        setOrders([]);
      }
    } catch (err) {
      setOrders([]);
    } finally {
      setIsSearching(false);
    }
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
            Access your past assessment results, download official 12-page PDF dossiers, or resume any in-progress questionnaires.
          </p>
        </div>

        {/* Lookup Paid Reports Card */}
        <div className="rounded-3xl border border-[#E8E2D9] bg-white p-6 sm:p-10 shadow-soft mb-12">
          <h2 className="text-xl font-serif font-semibold text-ink mb-2">
            Retrieve Purchased Reports
          </h2>
          <p className="text-xs sm:text-sm text-ink-muted mb-6">
            Enter the email address you provided during checkout to find and re-download your official PDF dossiers:
          </p>

          <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <input
                type="email"
                required
                placeholder="Enter your email (e.g. rahul@example.com)"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#E8E2D9] text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-600 bg-canvas/30"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="inline-flex items-center justify-center space-x-2 py-3 px-6 rounded-xl bg-ink text-white font-semibold text-sm shadow-soft hover:bg-ink-light transition-all active:scale-95 disabled:opacity-70"
            >
              {isSearching ? (
                <span>Searching...</span>
              ) : (
                <>
                  <Search className="w-4 h-4 text-brand-300" />
                  <span>Find My Reports</span>
                </>
              )}
            </button>
          </form>

          {/* Search Results */}
          {hasSearched && (
            <div className="pt-6 border-t border-[#E8E2D9]">
              {orders.length === 0 ? (
                <div className="p-6 rounded-2xl bg-canvas border border-[#E8E2D9] text-center text-xs text-ink-muted">
                  No purchased dossiers found for <strong>{searchedEmail}</strong>. If you recently completed a test, check your browser session below.
                </div>
              ) : (
                <div className="space-y-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-700 block mb-2">
                    Found {orders.length} Purchased Dossier{orders.length > 1 ? "s" : ""}:
                  </span>
                  {orders.map((ord) => (
                    <div
                      key={ord.orderId}
                      className="p-5 rounded-2xl border border-[#E8E2D9] bg-canvas flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-xs font-bold text-ink">
                            {ord.reportCode || ord.orderNumber}
                          </span>
                          <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-accent-emerald/10 text-accent-emerald">
                            {ord.status}
                          </span>
                        </div>
                        <p className="text-sm font-serif font-medium text-ink capitalize">
                          {ord.assessmentSlug.replace("-", " ")} Assessment
                        </p>
                        <p className="text-xs text-ink-muted">
                          Purchased on {new Date(ord.createdAt).toLocaleDateString("en-IN")}
                        </p>
                      </div>

                      <div className="flex items-center space-x-3">
                        <a
                          href={`/api/reports/${ord.orderId}/download?token=${ord.accessToken}`}
                          download
                          className="inline-flex items-center space-x-1.5 py-2 px-4 rounded-xl bg-ink text-white text-xs font-semibold shadow-soft hover:bg-ink-light transition-all"
                        >
                          <Download className="w-3.5 h-3.5 text-brand-300" />
                          <span>PDF</span>
                        </a>
                        <Link
                          href={`/reports/${ord.orderId}?token=${ord.accessToken}`}
                          className="inline-flex items-center space-x-1.5 py-2 px-4 rounded-xl bg-white border border-[#E8E2D9] text-ink text-xs font-semibold hover:bg-canvas-subtle transition-all"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-brand-600" />
                          <span>View</span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
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
