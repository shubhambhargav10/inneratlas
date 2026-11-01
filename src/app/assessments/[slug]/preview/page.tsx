"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAssessmentBySlug } from "@/data/assessments";
import { getStoredSession } from "@/lib/session/clientStorage";
import { calculateAssessmentResult } from "@/lib/scoring/engine";
import { AssessmentResult } from "@/data/assessments/types";
import { ResultPreview } from "@/components/assessment/ResultPreview";

export default function AssessmentPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [sessionToken, setSessionToken] = useState<string>("");

  const assessment = getAssessmentBySlug(slug);

  useEffect(() => {
    if (!assessment) {
      router.push("/assessments");
      return;
    }

    const session = getStoredSession(slug);
    if (!session || Object.keys(session.answers).length === 0) {
      // No answers found, redirect to take assessment
      router.push(`/assessments/${slug}/take`);
      return;
    }

    // Deterministically calculate result
    const calculated = calculateAssessmentResult({
      assessment,
      answers: session.answers,
    });

    setResult(calculated);
    setSessionToken(session.guestSessionToken);
    setIsLoading(false);
  }, [slug, assessment, router]);

  if (isLoading || !assessment || !result) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 rounded-full border-3 border-brand-600 border-t-transparent animate-spin" />
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Calculating Psychometric Dimensions...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-canvas min-h-screen">
      <ResultPreview
        assessment={assessment}
        result={result}
        guestSessionToken={sessionToken}
      />
    </div>
  );
}
