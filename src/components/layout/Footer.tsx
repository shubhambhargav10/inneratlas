import React from "react";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { Compass, ShieldCheck, HeartHandshake, Lock } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-[#E8E2D9] bg-[#F4EFEA] text-ink">
      {/* Trust & Transparency Bar */}
      <div className="border-b border-[#E8E2D9]/70 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-ink-muted">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-canvas-pure flex items-center justify-center text-brand-600 shadow-sm">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <span className="font-semibold text-ink block">100% Private & Anonymous</span>
                <span>Your responses are encrypted and never sold or shared.</span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-canvas-pure flex items-center justify-center text-accent-emerald shadow-sm">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="font-semibold text-ink block">Secure Indian Payments</span>
                <span>Protected by Razorpay with 256-bit SSL transaction encryption.</span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-canvas-pure flex items-center justify-center text-brand-600 shadow-sm">
                <HeartHandshake className="w-4 h-4" />
              </div>
              <div>
                <span className="font-semibold text-ink block">Self-Reflection Guarantee</span>
                <span>High-value actionable insights designed for personal development.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-ink flex items-center justify-center text-white">
                <Compass className="w-4 h-4 text-brand-300" />
              </div>
              <span className="font-bold tracking-tight text-ink text-base">
                {siteConfig.name}
              </span>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">
              {siteConfig.tagline} Thoughtfully designed assessment frameworks to help you navigate your inner world, career trajectory, and cognitive patterns.
            </p>
          </div>

          {/* Assessments Column */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink mb-3">
              Assessments
            </h4>
            <ul className="space-y-2 text-xs text-ink-muted">
              <li>
                <Link href="/assessments/personality-archetype" className="hover:text-ink transition-colors">
                  Personality Archetypes
                </Link>
              </li>
              <li>
                <Link href="/assessments/career-dna" className="hover:text-ink transition-colors">
                  Career DNA Assessment
                </Link>
              </li>
              <li>
                <Link href="/assessments/thinking-style" className="hover:text-ink transition-colors">
                  Thinking Style Matrix
                </Link>
              </li>
              <li>
                <Link href="/assessments" className="hover:text-ink transition-colors font-medium text-brand-700">
                  View Full Catalogue &rarr;
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources Column */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink mb-3">
              Explore & Support
            </h4>
            <ul className="space-y-2 text-xs text-ink-muted">
              <li>
                <Link href="/guides" className="hover:text-ink transition-colors">
                  Psychology & Frameworks
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-ink transition-colors">
                  Retrieve Past Reports
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-ink transition-colors">
                  Frequently Asked Questions
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-ink transition-colors">
                  About INNERATLAS
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-ink transition-colors">
                  Customer Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink mb-3">
              Legal & Disclosures
            </h4>
            <ul className="space-y-2 text-xs text-ink-muted">
              <li>
                <Link href="/privacy" className="hover:text-ink transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-ink transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/refunds" className="hover:text-ink transition-colors">
                  Refund & Cancellation Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Clinical Disclaimer Notice */}
        <div className="mt-10 pt-6 border-t border-[#E8E2D9] text-[11px] text-ink-muted/80 leading-relaxed">
          <p>
            <strong>Disclaimer:</strong> {siteConfig.name} assessments, frameworks, and generated dossiers are designed strictly for educational, personal development, and self-reflection purposes. They do not constitute clinical psychological diagnosis, medical advice, therapeutic intervention, or employment qualification guarantees. If you are experiencing mental health difficulties, please consult a licensed mental health professional.
          </p>
          <div className="mt-4 flex flex-col sm:flex-row justify-between items-center text-ink-muted gap-2">
            <span>&copy; {currentYear} {siteConfig.name}. All rights reserved.</span>
            <span>Crafted for mindful self-discovery.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
