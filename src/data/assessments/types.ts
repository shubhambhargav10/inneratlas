export type QuestionType = "likert_5" | "single_choice";

export interface AnswerOption {
  id: string;
  label: string;
  value: number; // 1 to 5
  weights: Record<string, number>; // Dimension key -> weight
}

export interface QuestionDefinition {
  id: string;
  order: number;
  text: string;
  contextHint?: string;
  categoryTag?: string;
  type: QuestionType;
  options: AnswerOption[];
}

export interface ScoringDimension {
  key: string;
  name: string;
  description: string;
  lowLabel: string;
  highLabel: string;
}

export interface ArchetypeDefinition {
  key: string;
  title: string;
  subtitle: string;
  shortDescription: string;
  fullDescription: string;
  superpowers: string[];
  blindspots: string[];
  communicationStyle: string;
  collaborationStyle: string;
  idealEnvironment: string;
  growthLever: string;
  tagline: string;
  dimensionPreferences: Record<string, "high" | "low" | "neutral">;
}

export interface AssessmentDefinition {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: "Personality" | "Career" | "Cognitive";
  estimatedMinutes: number;
  priceInr: number;
  compareAtInr: number;
  badgeLabel?: string;
  heroHeadline: string;
  heroSubheadline: string;
  whatYouWillDiscover: string[];
  dimensions: ScoringDimension[];
  archetypes: ArchetypeDefinition[];
  questions: QuestionDefinition[];
}

export interface NormalizedDimensionScore {
  key: string;
  name: string;
  rawScore: number;
  normalizedScore: number; // 0 to 100
  lowLabel: string;
  highLabel: string;
  status: "balanced" | "leaning_high" | "leaning_low" | "extreme_high" | "extreme_low";
}

export interface AssessmentResult {
  assessmentSlug: string;
  primaryArchetype: ArchetypeDefinition;
  secondaryArchetype?: ArchetypeDefinition;
  dimensionScores: NormalizedDimensionScore[];
  executiveSummary: string;
  synthesis: {
    archetypeBlendName: string;
    blendDescription: string;
    keyStrengths: string[];
    shadowTraits: string[];
    communicationGuidance: string;
    collaborationDynamics: string;
    careerEnvironmentRecommendation: string;
    actionPlan90Days: {
      phase1: { title: string; objective: string; actions: string[] };
      phase2: { title: string; objective: string; actions: string[] };
      phase3: { title: string; objective: string; actions: string[] };
    };
  };
  calculatedAt: string;
}
