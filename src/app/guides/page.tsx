import React from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Clock, Sparkles } from "lucide-react";
import { articles } from "@/data/articles";

export const metadata = {
  title: "Self-Discovery & Psychology Guides | INNERATLAS",
  description:
    "Original frameworks and essays exploring personality archetypes, cognitive modalities, and workplace environment alignment.",
};

export default function GuidesIndexPage() {
  return (
    <div className="bg-canvas min-h-screen py-12 md:py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-700 block mb-2">
            The InnerAtlas Journal
          </span>
          <h1 className="text-3xl sm:text-5xl font-serif text-ink font-semibold tracking-tight mb-4">
            Psychological Frameworks & Guides
          </h1>
          <p className="text-base text-ink-muted leading-relaxed">
            Thoughtful essays and foundational research exploring human behavior, cognitive modalities, and personal mastery.
          </p>
        </div>

        <div className="space-y-6">
          {articles.map((art) => (
            <article
              key={art.slug}
              className="rounded-3xl border border-[#E8E2D9] bg-white p-7 sm:p-8 shadow-soft hover:shadow-lifted transition-all group"
            >
              <div className="flex items-center space-x-3 text-xs text-ink-muted mb-3">
                <span className="font-semibold text-brand-700">{art.category}</span>
                <span>•</span>
                <span>{art.readTime}</span>
                <span>•</span>
                <span>{art.date}</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-serif font-semibold text-ink mb-2 group-hover:text-brand-700 transition-colors">
                <Link href={`/guides/${art.slug}`}>{art.title}</Link>
              </h2>

              <p className="text-sm text-ink-muted leading-relaxed mb-6">
                {art.excerpt}
              </p>

              <Link
                href={`/guides/${art.slug}`}
                className="inline-flex items-center space-x-2 text-xs font-bold text-ink hover:text-brand-700 transition-colors"
              >
                <span>Read Full Essay</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
