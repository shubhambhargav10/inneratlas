"use client";

import React, { useState } from "react";
import Link from "next/link";
import { siteConfig, navigationItems } from "@/config/site";
import { Compass, Menu, X, ArrowRight, ShieldCheck } from "lucide-react";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E8E2D9] bg-[#FAF8F5]/90 backdrop-blur-md transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center space-x-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-ink flex items-center justify-center text-white shadow-soft transition-transform group-hover:scale-105">
              <Compass className="w-5 h-5 text-brand-300" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-ink text-lg leading-tight">
                {siteConfig.name}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-ink-muted font-medium">
                Self-Discovery
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-ink-muted hover:text-ink transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right Action CTA */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-ink-muted hover:text-ink px-3 py-1.5 transition-colors"
            >
              Access Report
            </Link>
            <Link
              href="/assessments"
              className="inline-flex items-center space-x-2 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-ink-light transition-all active:scale-[0.98]"
            >
              <span>Explore Assessments</span>
              <ArrowRight className="w-4 h-4 text-brand-300" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center space-x-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-canvas-subtle transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#E8E2D9] bg-[#FAF8F5] px-4 pt-3 pb-6 space-y-3">
          <div className="flex flex-col space-y-2">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-base font-medium text-ink-muted hover:text-ink hover:bg-canvas-subtle transition-colors"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-base font-medium text-ink-muted hover:text-ink hover:bg-canvas-subtle transition-colors"
            >
              My Reports
            </Link>
          </div>
          <div className="pt-2">
            <Link
              href="/assessments"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center space-x-2 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white shadow-soft"
            >
              <span>Start Assessment</span>
              <ArrowRight className="w-4 h-4 text-brand-300" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
