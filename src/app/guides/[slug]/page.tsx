import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { articles } from "@/data/articles";
import { ArrowLeft, ArrowRight, Clock, Sparkles } from "lucide-react";

interface GuideArticlePageProps {
  params: { slug: string };
}

export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

export function generateMetadata({ params }: GuideArticlePageProps) {
  const article = articles.find((a) => a.slug === params.slug);
  if (!article) return { title: "Article Not Found" };

  return {
    title: `${article.title} | INNERATLAS Guides`,
    description: article.subtitle,
  };
}

export default function GuideArticlePage({ params }: GuideArticlePageProps) {
  const article = articles.find((a) => a.slug === params.slug);
  if (!article) {
    notFound();
  }

  return (
    <div className="bg-canvas min-h-screen py-10 md:py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Back Link */}
        <Link
          href="/guides"
          className="inline-flex items-center space-x-2 text-xs font-semibold text-ink-muted hover:text-ink transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Guides</span>
        </Link>

        {/* Article Header */}
        <header className="mb-10 pb-8 border-b border-[#E8E2D9]">
          <div className="flex items-center space-x-3 text-xs text-ink-muted mb-3">
            <span className="font-semibold text-brand-700">{article.category}</span>
            <span>•</span>
            <span>{article.readTime}</span>
            <span>•</span>
            <span>{article.date}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-serif text-ink font-semibold tracking-tight leading-tight mb-4">
            {article.title}
          </h1>

          <p className="text-base sm:text-lg text-ink-muted leading-relaxed">
            {article.subtitle}
          </p>
        </header>

        {/* Article Body */}
        <div className="prose prose-stone max-w-none text-ink text-sm sm:text-base leading-relaxed space-y-6">
          <p>
            When Carl Jung introduced psychological types in 1921, he explicitly cautioned against treating human personalities as rigid classification bins. Yet over the past five decades, consumer personality testing has degenerated into superficial four-letter acronyms that treat complex human temperaments like horoscope signs.
          </p>

          <h2 className="text-xl font-serif font-semibold text-ink pt-4">
            The Multi-Dimensional Spectrum Principle
          </h2>
          <p>
            Human behavior does not operate on a binary switch. No individual is 100% introverted or 100% extroverted; instead, our cognitive energy processing exists on a calibrated spectrum. A person who scores in the 75th percentile of solitary reflection still possesses social capabilities, but their baseline cognitive restoration occurs in stillness.
          </p>
          <p>
            Furthermore, authentic self-discovery requires understanding how multiple dimensions interact. A person with high analytical precision combined with high fluid adaptability operates completely differently from someone with high analytical precision coupled with rigid procedural structure.
          </p>

          <h2 className="text-xl font-serif font-semibold text-ink pt-4">
            Primary vs. Secondary Archetypal Synthesis
          </h2>
          <p>
            This is why the INNERATLAS framework introduces the concept of the <em>Archetype Blend</em>. Rather than forcing you into a single archetype, our scoring engine measures your dominant orientation (such as <strong>The Strategist</strong>) and immediately qualifies it with your secondary balance (such as <strong>The Creator</strong>).
          </p>
          <p>
            The resulting synthesis—<em>The Creative Strategist</em>—explains why you can both design long-term architecture while simultaneously craving novel aesthetic experimentation.
          </p>

          <div className="my-8 p-6 rounded-2xl bg-[#F4EFEA] border border-[#E8E2D9] text-xs sm:text-sm text-ink leading-relaxed">
            <strong>Key Takeaway:</strong> Self-reflection is not about acquiring an excuse for your limitations ("I'm an X, so I can't do Y"). It is about discovering where your natural energetic levers reside so you can design environments that maximize your peak output.
          </div>
        </div>

        {/* CTA Footer in Article */}
        <div className="mt-14 pt-8 border-t border-[#E8E2D9] rounded-3xl bg-white p-8 border text-center shadow-soft">
          <h3 className="text-xl font-serif font-semibold text-ink mb-2">
            Discover Your Own Archetype Blend
          </h3>
          <p className="text-xs sm:text-sm text-ink-muted max-w-md mx-auto mb-6">
            Take our free 10-minute assessment to map your dimensional profile across 28 calibrated psychometric questions.
          </p>
          <Link
            href="/assessments/personality-archetype"
            className="inline-flex items-center space-x-2 py-3 px-6 rounded-xl bg-ink text-white text-xs sm:text-sm font-semibold shadow-soft hover:bg-ink-light transition-all"
          >
            <span>Take Personality Assessment</span>
            <ArrowRight className="w-3.5 h-3.5 text-brand-300" />
          </Link>
        </div>
      </div>
    </div>
  );
}
