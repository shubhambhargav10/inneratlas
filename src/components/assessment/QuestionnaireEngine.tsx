"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AssessmentDefinition, QuestionDefinition } from "@/data/assessments/types";
import {
  getStoredSession,
  saveStoredSession,
  clearStoredSession,
} from "@/lib/session/clientStorage";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  RotateCcw,
  Shield,
  HelpCircle,
} from "lucide-react";

interface QuestionnaireEngineProps {
  assessment: AssessmentDefinition;
}

export function QuestionnaireEngine({ assessment }: QuestionnaireEngineProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resumePromptOpen, setResumePromptOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const totalQuestions = assessment.questions.length;
  const currentQuestion: QuestionDefinition = assessment.questions[currentIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const progressPercent = Math.round(((currentIndex + 1) / totalQuestions) * 100);

  // Initialize and check for existing unfinished session
  useEffect(() => {
    const saved = getStoredSession(assessment.slug);
    if (saved && Object.keys(saved.answers).length > 0 && !saved.isCompleted) {
      setAnswers(saved.answers);
      if (saved.currentQuestionIndex > 0 && saved.currentQuestionIndex < totalQuestions) {
        setCurrentIndex(saved.currentQuestionIndex);
        setResumePromptOpen(true);
      }
    }
    setIsInitialized(true);
  }, [assessment.slug, totalQuestions]);

  // Persist answers on every change
  const handleSelectOption = (value: number) => {
    if (!currentQuestion) return;
    const updatedAnswers = { ...answers, [currentQuestion.id]: value };
    setAnswers(updatedAnswers);
    saveStoredSession(assessment.slug, updatedAnswers, currentIndex, false);

    // Auto-advance with subtle delay for smooth mobile interaction
    if (currentIndex < totalQuestions - 1) {
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
        saveStoredSession(assessment.slug, updatedAnswers, currentIndex + 1, false);
      }, 220);
    }
  };

  const handleNext = () => {
    if (currentAnswer === undefined) return;
    if (currentIndex < totalQuestions - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      saveStoredSession(assessment.slug, answers, nextIdx, false);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      saveStoredSession(assessment.slug, answers, prevIdx, false);
    }
  };

  const handleComplete = () => {
    setIsSubmitting(true);
    saveStoredSession(assessment.slug, answers, currentIndex, true);
    // Smooth transition to results preview
    router.push(`/assessments/${assessment.slug}/preview`);
  };

  const handleRestart = () => {
    clearStoredSession(assessment.slug);
    setAnswers({});
    setCurrentIndex(0);
    setResumePromptOpen(false);
  };

  // Keyboard shortcut listener (1-5 for options, Enter/Arrows for navigation)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["1", "2", "3", "4", "5"].includes(e.key)) {
        const val = parseInt(e.key, 10);
        handleSelectOption(val);
      } else if (e.key === "Enter" || e.key === "ArrowRight") {
        if (currentAnswer !== undefined) handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, currentAnswer, answers]);

  if (!isInitialized || !currentQuestion) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 md:py-12">
      {/* Resume Notification Banner */}
      {resumePromptOpen && (
        <div className="mb-6 rounded-2xl bg-brand-50 border border-brand-200 p-4 flex items-center justify-between text-xs text-brand-900 shadow-sm animate-fade-in">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-brand-600 flex-shrink-0" />
            <span>
              Resuming your session from question <strong>{currentIndex + 1}</strong>.
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setResumePromptOpen(false)}
              className="font-semibold underline hover:text-brand-700"
            >
              Continue
            </button>
            <button
              onClick={handleRestart}
              className="text-ink-muted hover:text-ink flex items-center space-x-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restart</span>
            </button>
          </div>
        </div>
      )}

      {/* Progress & Category Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-ink-muted mb-2.5">
          <span className="flex items-center space-x-1.5 text-brand-700">
            <span>{currentQuestion.categoryTag || assessment.title}</span>
          </span>
          <span>
            Question {currentIndex + 1} of {totalQuestions}
          </span>
        </div>

        {/* Animated Progress Bar */}
        <div className="h-2 w-full bg-[#E8E2D9] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-600 to-brand-500 transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Active Question Card */}
      <div className="rounded-3xl border border-[#E8E2D9] bg-white p-6 sm:p-10 shadow-soft transition-all">
        {/* Question Text */}
        <h2 className="text-xl sm:text-2xl font-serif text-ink font-medium leading-relaxed mb-3">
          {currentQuestion.text}
        </h2>

        {currentQuestion.contextHint && (
          <p className="text-xs sm:text-sm text-ink-muted flex items-center space-x-1.5 mb-8">
            <HelpCircle className="w-4 h-4 text-brand-400 flex-shrink-0" />
            <span>{currentQuestion.contextHint}</span>
          </p>
        )}

        {/* Likert / Selection Options */}
        <div className="space-y-3 pt-2">
          {currentQuestion.options.map((opt) => {
            const isSelected = currentAnswer === opt.value;

            return (
              <button
                key={opt.id}
                onClick={() => handleSelectOption(opt.value)}
                className={`w-full group text-left px-5 py-4 rounded-2xl border transition-all duration-150 flex items-center justify-between ${
                  isSelected
                    ? "border-brand-600 bg-brand-50/70 text-brand-900 shadow-sm ring-1 ring-brand-500"
                    : "border-[#E8E2D9] bg-canvas/30 hover:bg-canvas hover:border-ink-muted/40 text-ink"
                }`}
              >
                <div className="flex items-center space-x-3.5">
                  <div
                    className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-semibold transition-colors ${
                      isSelected
                        ? "border-brand-600 bg-brand-600 text-white"
                        : "border-ink-muted/30 text-ink-muted group-hover:border-ink"
                    }`}
                  >
                    {opt.value}
                  </div>
                  <span className="text-sm sm:text-base font-medium">{opt.label}</span>
                </div>

                {isSelected && (
                  <CheckCircle2 className="w-5 h-5 text-brand-600 animate-scale-in" />
                )}
              </button>
            );
          })}
        </div>

        {/* Navigation Bottom Controls */}
        <div className="mt-10 pt-6 border-t border-[#E8E2D9] flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className={`inline-flex items-center space-x-2 text-xs sm:text-sm font-semibold py-2 px-3 rounded-xl transition-colors ${
              currentIndex === 0
                ? "text-ink-muted/30 cursor-not-allowed"
                : "text-ink-muted hover:text-ink hover:bg-canvas-subtle"
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <div className="text-[11px] text-ink-muted hidden sm:block">
            Press <kbd className="px-1.5 py-0.5 rounded bg-canvas-muted text-ink font-mono text-[10px]">1</kbd> to{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-canvas-muted text-ink font-mono text-[10px]">5</kbd> on your keyboard
          </div>

          <button
            onClick={handleNext}
            disabled={currentAnswer === undefined || isSubmitting}
            className={`inline-flex items-center space-x-2 text-xs sm:text-sm font-semibold py-2.5 px-5 rounded-xl transition-all ${
              currentAnswer !== undefined
                ? "bg-ink text-white shadow-soft hover:bg-ink-light active:scale-95"
                : "bg-[#E8E2D9] text-ink-muted cursor-not-allowed"
            }`}
          >
            <span>{currentIndex === totalQuestions - 1 ? "Complete & Reveal" : "Next"}</span>
            <ArrowRight className="w-4 h-4 text-brand-300" />
          </button>
        </div>
      </div>

      {/* Privacy Guarantee footnote */}
      <div className="mt-6 flex items-center justify-center space-x-2 text-xs text-ink-muted">
        <Shield className="w-3.5 h-3.5 text-accent-emerald" />
        <span>Your answers are encrypted locally and treated with strict confidentiality.</span>
      </div>
    </div>
  );
}
