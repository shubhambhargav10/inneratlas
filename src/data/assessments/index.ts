import { AssessmentDefinition } from "./types";
import { personalityArchetypeAssessment } from "./personality-archetype";
import { careerDnaAssessment } from "./career-dna";
import { thinkingStyleAssessment } from "./thinking-style";

export const allAssessments: AssessmentDefinition[] = [
  personalityArchetypeAssessment,
  careerDnaAssessment,
  thinkingStyleAssessment,
];

export function getAssessmentBySlug(slug: string): AssessmentDefinition | undefined {
  return allAssessments.find((a) => a.slug === slug);
}

export function getAssessmentById(id: string): AssessmentDefinition | undefined {
  return allAssessments.find((a) => a.id === id);
}

export * from "./types";
export { personalityArchetypeAssessment, careerDnaAssessment, thinkingStyleAssessment };
