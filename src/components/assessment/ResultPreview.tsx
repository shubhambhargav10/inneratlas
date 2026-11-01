"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AssessmentDefinition, AssessmentResult } from "@/data/assessments/types";
import {
  Sparkles,
  Lock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Download,
  Flame,
  Award,
  Zap,
} from "lucide-react";

interface ResultPreviewProps {
  assessment: AssessmentDefinition;
  result: AssessmentResult;
  guestSessionToken: string;
}

export function ResultPreview({ assessment, result, guestSessionToken }: ResultPreviewProps) {
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!customerEmail || !customerName) {
      setErrorMessage("Please enter your name and email to receive your report.");
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Create order on server
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessmentSlug: assessment.slug,
          customerName,
          customerEmail,
          guestSessionToken,
          resultPayload: result,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.orderId) {
        throw new Error(data.error || "Unable to initiate payment. Please try again.");
      }

      // Check if test / mock mode is active (for instant test resolution without live gateway keys)
      if (data.isMockMode) {
        // Direct test simulation: redirect to verify simulated checkout
        const verifyRes = await fetch("/api/payments/verify-signature", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: data.orderId,
            razorpayOrderId: data.razorpayOrderId || "mock_order_id",
            razorpayPaymentId: "pay_mock_" + Math.random().toString(36).substring(2, 10),
            razorpaySignature: "mock_signature_verified",
            isMockVerification: true,
          }),
        });

        const verifyData = await verifyRes.json();
        if (verifyData.success) {
          window.location.href = `/checkout/success?orderId=${data.orderId}&token=${verifyData.accessToken}`;
          return;
        }
      }

      // 2. Open official Razorpay Checkout Modal
      const options = {
        key: data.razorpayKeyId,
        amount: data.amountPaise,
        currency: "INR",
        name: "INNERATLAS",
        description: `Full Dossier: ${assessment.title}`,
        order_id: data.razorpayOrderId,
        prefill: {
          name: customerName,
          email: customerEmail,
        },
        theme: {
          color: "#4F46E5",
        },
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch("/api/payments/verify-signature", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: data.orderId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              window.location.href = `/checkout/success?orderId=${data.orderId}&token=${verifyData.accessToken}`;
            } else {
              window.location.href = `/checkout/failed?orderId=${data.orderId}&reason=verification_failed`;
            }
          } catch (err) {
            window.location.href = `/checkout/failed?orderId=${data.orderId}&reason=network_error`;
          }
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
          },
        },
      };

      // Load Razorpay script if not already on window
      if (typeof (window as any).Razorpay === "undefined") {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => {
          const rzp = new (window as any).Razorpay(options);
          rzp.open();
        };
        document.body.appendChild(script);
      } else {
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Something went wrong during checkout.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-16">
      {/* Celebration Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-800 text-xs font-semibold uppercase tracking-wider mb-4 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-brand-600" />
          <span>Assessment Completed</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-serif text-ink font-normal tracking-tight mb-3">
          Your Primary Archetype is{" "}
          <span className="font-semibold text-brand-700 italic">
            {result.primaryArchetype.title}
          </span>
        </h1>
        <p className="text-base sm:text-lg text-ink-muted max-w-2xl mx-auto">
          {result.primaryArchetype.tagline}
        </p>
      </div>

      {/* Primary Archetype Highlight Box */}
      <div className="rounded-3xl border border-[#E8E2D9] bg-white p-6 sm:p-10 shadow-soft mb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-[#E8E2D9] gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Core Behavioral Archetype
            </span>
            <h2 className="text-2xl font-serif text-ink font-semibold mt-1">
              {result.primaryArchetype.title}
            </h2>
            <p className="text-xs text-brand-700 font-medium">
              {result.primaryArchetype.subtitle}
            </p>
          </div>
          <div className="flex items-center space-x-2 bg-canvas px-4 py-2 rounded-2xl border border-[#E8E2D9]">
            <Award className="w-5 h-5 text-accent-gold" />
            <span className="text-xs font-semibold text-ink">
              Dominant Synthesis Score: 94%
            </span>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="py-6 border-b border-[#E8E2D9]">
          <h3 className="text-sm font-bold uppercase tracking-wider text-ink-muted mb-2">
            Executive Summary
          </h3>
          <p className="text-sm sm:text-base text-ink leading-relaxed">
            {result.executiveSummary}
          </p>
        </div>

        {/* Free Revealed Strengths */}
        <div className="pt-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-ink-muted mb-4">
            Uncovered Core Superpowers
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {result.primaryArchetype.superpowers.slice(0, 2).map((power, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-canvas border border-[#E8E2D9] flex items-start space-x-3"
              >
                <CheckCircle2 className="w-4 h-4 text-accent-emerald flex-shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm text-ink font-medium leading-snug">
                  {power}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dimension Breakdown Cards */}
      <div className="rounded-3xl border border-[#E8E2D9] bg-white p-6 sm:p-10 shadow-soft mb-12">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-serif font-semibold text-ink">
            Your Dimension Breakdown
          </h3>
          <span className="text-xs text-ink-muted">Normalized 0–100% scale</span>
        </div>

        <div className="space-y-6">
          {result.dimensionScores.map((dim) => (
            <div key={dim.key} className="space-y-2">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="font-semibold text-ink">{dim.name}</span>
                <span className="font-mono font-bold text-brand-700">
                  {dim.normalizedScore}%
                </span>
              </div>
              {/* Dual-spectrum Bar */}
              <div className="h-2.5 w-full bg-[#E8E2D9] rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-600 rounded-full transition-all duration-500"
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

      {/* The Locked Premium Paywall Section */}
      <div className="relative mb-14">
        {/* Blurred Teaser Background */}
        <div className="filter blur-sm select-none opacity-40 pointer-events-none space-y-6">
          <div className="rounded-3xl border border-[#E8E2D9] bg-white p-8">
            <h4 className="text-xl font-serif font-semibold text-ink mb-3">
              Secondary Archetype & Dual-Synthesis Blueprint
            </h4>
            <p className="text-sm text-ink-muted mb-4">
              Your secondary archetype introduces a profound counterbalance to your primary tendencies. Discover how this dual-synthesis shapes your decision-making under intense pressure...
            </p>
            <div className="h-20 bg-canvas rounded-xl" />
          </div>

          <div className="rounded-3xl border border-[#E8E2D9] bg-white p-8">
            <h4 className="text-xl font-serif font-semibold text-ink mb-3">
              Hidden Shadow Traits, Conflict Friction & Stress Derailers
            </h4>
            <p className="text-sm text-ink-muted mb-4">
              Detailed breakdown of the 4 subconscious biases that repeatedly sabotage your interpersonal communications and career promotions...
            </p>
            <div className="h-20 bg-canvas rounded-xl" />
          </div>

          <div className="rounded-3xl border border-[#E8E2D9] bg-white p-8">
            <h4 className="text-xl font-serif font-semibold text-ink mb-3">
              Personalized 90-Day Execution Roadmap
            </h4>
            <div className="h-24 bg-canvas rounded-xl" />
          </div>
        </div>

        {/* Floating Conversion Card Over Paywall */}
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white/95 backdrop-blur-xl border border-brand-200/80 p-6 sm:p-8 shadow-lifted text-center ring-1 ring-brand-500/20">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-accent-gold/10 text-accent-gold text-xs font-bold uppercase tracking-wider mb-3">
              <Flame className="w-3.5 h-3.5 text-accent-gold" />
              <span>Full 12-Page Dossier Available</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-serif text-ink font-semibold tracking-tight mb-2">
              Unlock Your Complete Dossier
            </h3>
            <p className="text-xs sm:text-sm text-ink-muted max-w-md mx-auto mb-6">
              Get immediate access to your full 12-page printable PDF report, including your secondary archetype blend, hidden shadow traits, and custom 90-day action plan.
            </p>

            {/* Price Anchor */}
            <div className="flex items-center justify-center space-x-3 mb-6">
              <span className="text-3xl sm:text-4xl font-bold text-ink tracking-tight font-serif">
                ₹{assessment.priceInr}
              </span>
              <span className="text-base text-ink-muted/60 line-through">
                ₹{assessment.compareAtInr}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-accent-emerald/10 text-accent-emerald">
                60% Launch Discount
              </span>
            </div>

            {/* Checkout Form */}
            <form onSubmit={handleCheckout} className="space-y-3.5 text-left">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Your Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maya Sharma"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E8E2D9] text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-600 bg-canvas/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Email Address (to receive your PDF report)
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. maya@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E8E2D9] text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-600 bg-canvas/30"
                />
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-accent-coral/10 text-accent-coral text-xs">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full flex items-center justify-center space-x-2 py-3.5 px-6 rounded-xl bg-ink text-white font-semibold text-sm sm:text-base shadow-soft hover:bg-ink-light transition-all active:scale-[0.98] disabled:opacity-70"
              >
                {isProcessing ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Processing Secure Payment...</span>
                  </div>
                ) : (
                  <>
                    <span>Unlock Full Dossier for ₹{assessment.priceInr}</span>
                    <ArrowRight className="w-4 h-4 text-brand-300" />
                  </>
                )}
              </button>
            </form>

            {/* Trust Badges */}
            <div className="mt-4 pt-4 border-t border-[#E8E2D9] flex items-center justify-center space-x-4 text-[11px] text-ink-muted">
              <span className="flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-accent-emerald" />
                <span>Instant PDF Download</span>
              </span>
              <span>•</span>
              <span>UPI, Cards, NetBanking</span>
              <span>•</span>
              <span>100% Private</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
