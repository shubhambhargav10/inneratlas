import React from "react";
import { notFound } from "next/navigation";
import { getAssessmentBySlug, allAssessments } from "@/data/assessments";
import { QuestionnaireEngine } from "@/components/assessment/QuestionnaireEngine";

interface AssessmentTakePageProps {
  params: { slug: string };
}

export function generateStaticParams() {
  return allAssessments.map((a) => ({ slug: a.slug }));
}

export function generateMetadata({ params }: AssessmentTakePageProps) {
  const assessment = getAssessmentBySlug(params.slug);
  if (!assessment) return { title: "Assessment Not Found" };

  return {
    title: `Take ${assessment.title} | INNERATLAS`,
    description: `Complete the ${assessment.title} to uncover your core psychometric archetype and receive an actionable personalized dossier.`,
  };
}

export default function AssessmentTakePage({ params }: AssessmentTakePageProps) {
  const assessment = getAssessmentBySlug(params.slug);
  if (!assessment) {
    notFound();
  }

  return (
    <div className="bg-canvas min-h-screen py-6 sm:py-12">
      <QuestionnaireEngine assessment={assessment} />
    </div>
  );
}
