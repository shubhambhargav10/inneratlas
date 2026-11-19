import {
  AssessmentDefinition,
  AssessmentResult,
  NormalizedDimensionScore,
  ArchetypeDefinition,
} from "@/data/assessments/types";

export interface ScoreCalculationInput {
  assessment: AssessmentDefinition;
  answers: Record<string, number>; // questionId -> selected value (1 to 5)
}

export function calculateAssessmentResult({
  assessment,
  answers,
}: ScoreCalculationInput): AssessmentResult {
  // 1. Calculate raw and min/max theoretical scores per dimension
  const rawScores: Record<string, number> = {};
  const minScores: Record<string, number> = {};
  const maxScores: Record<string, number> = {};

  // Initialize all dimensions
  for (const dim of assessment.dimensions) {
    rawScores[dim.key] = 0;
    minScores[dim.key] = 0;
    maxScores[dim.key] = 0;
  }

  // Iterate through all questions in the assessment
  for (const question of assessment.questions) {
    // Find min and max possible weights for each dimension for this question
    const dimWeightsForQ: Record<string, { min: number; max: number }> = {};

    for (const opt of question.options) {
      for (const [dimKey, weight] of Object.entries(opt.weights)) {
        if (!dimWeightsForQ[dimKey]) {
          dimWeightsForQ[dimKey] = { min: weight, max: weight };
        } else {
          dimWeightsForQ[dimKey].min = Math.min(dimWeightsForQ[dimKey].min, weight);
          dimWeightsForQ[dimKey].max = Math.max(dimWeightsForQ[dimKey].max, weight);
        }
      }
    }

    // Accumulate min and max theoretical bounds
    for (const [dimKey, bounds] of Object.entries(dimWeightsForQ)) {
      if (minScores[dimKey] !== undefined) {
        minScores[dimKey] += bounds.min;
        maxScores[dimKey] += bounds.max;
      }
    }

    // Now accumulate user's actual selected answer
    const selectedVal = answers[question.id];
    if (selectedVal !== undefined) {
      const selectedOption =
        question.options.find((o) => o.value === selectedVal) || question.options[2]; // Default to neutral if out of bounds
      for (const [dimKey, weight] of Object.entries(selectedOption.weights)) {
        if (rawScores[dimKey] !== undefined) {
          rawScores[dimKey] += weight;
        }
      }
    }
  }

  // 2. Normalize dimension scores to a 0 - 100 scale
  const dimensionScores: NormalizedDimensionScore[] = assessment.dimensions.map((dim) => {
    const raw = rawScores[dim.key] || 0;
    const min = minScores[dim.key] ?? -10;
    const max = maxScores[dim.key] ?? 10;
    const range = max - min;

    let normalized = 50; // Fallback neutral
    if (range > 0) {
      normalized = Math.round(((raw - min) / range) * 100);
      normalized = Math.max(0, Math.min(100, normalized)); // Clamp between 0 and 100
    }

    let status: NormalizedDimensionScore["status"] = "balanced";
    if (normalized <= 25) status = "extreme_low";
    else if (normalized <= 40) status = "leaning_low";
    else if (normalized >= 75) status = "extreme_high";
    else if (normalized >= 60) status = "leaning_high";

    return {
      key: dim.key,
      name: dim.name,
      rawScore: raw,
      normalizedScore: normalized,
      lowLabel: dim.lowLabel,
      highLabel: dim.highLabel,
      status,
    };
  });

  // Map for fast dimension lookup
  const normMap = new Map<string, number>(dimensionScores.map((d) => [d.key, d.normalizedScore]));

  // 3. Match Archetypes based on dimensional preferences
  const archetypeScores = assessment.archetypes.map((arch) => {
    let distanceSum = 0;
    let evaluatedDims = 0;

    for (const [dimKey, pref] of Object.entries(arch.dimensionPreferences)) {
      const score = normMap.get(dimKey);
      if (score === undefined) continue;

      evaluatedDims++;
      if (pref === "high") {
        // Ideal is 100
        distanceSum += Math.abs(100 - score);
      } else if (pref === "low") {
        // Ideal is 0
        distanceSum += Math.abs(score);
      } else {
        // Neutral/balanced: ideal is 50
        distanceSum += Math.abs(50 - score) * 0.7; // Weighted slightly less penalizing
      }
    }

    const avgDistance = evaluatedDims > 0 ? distanceSum / evaluatedDims : 50;
    const fitScore = Math.max(0, Math.round(100 - avgDistance));

    return {
      archetype: arch,
      fitScore,
    };
  });

  // Sort descending by fit score
  archetypeScores.sort((a, b) => b.fitScore - a.fitScore);

  const primaryArchetype = archetypeScores[0]?.archetype || assessment.archetypes[0];
  const secondaryArchetype =
    archetypeScores.length > 1 ? archetypeScores[1].archetype : undefined;

  // 4. Generate synthesized blend title & narrative
  const cleanPrimaryTitle = primaryArchetype.title.replace(/^The\s+/, "");
  const cleanSecondaryTitle = secondaryArchetype
    ? secondaryArchetype.title.replace(/^The\s+/, "")
    : "";

  let blendName = primaryArchetype.title;
  let blendDescription = primaryArchetype.shortDescription;

  if (secondaryArchetype) {
    // E.g. "The Strategic Creator" or "The Visionary Analyst"
    const adjectiveMap: Record<string, string> = {
      Strategist: "Strategic",
      Creator: "Creative",
      Explorer: "Exploratory",
      Guardian: "Grounded",
      Connector: "Empathetic",
      Achiever: "High-Velocity",
      Analyst: "Analytical",
      Visionary: "Visionary",
      "Autonomous Specialist": "Autonomous",
      "Strategic Catalyst": "Catalytic",
      "Enterprise Architect": "Architectural",
      "Agile Operator": "Agile",
      "Deep Systems Thinker": "Systemic",
      "Creative Synthesizer": "Synthesizing",
      "Pragmatic Executor": "Pragmatic",
      "Analytical Auditor": "Auditing",
    };

    const prefix = adjectiveMap[cleanSecondaryTitle] || cleanSecondaryTitle;
    blendName = `The ${prefix} ${cleanPrimaryTitle}`;
    blendDescription = `Your cognitive architecture is fundamentally driven by ${primaryArchetype.title}, enriched with the distinct traits of ${secondaryArchetype.title}. You lead with ${primaryArchetype.tagline.toLowerCase()} while effortlessly drawing upon ${secondaryArchetype.shortDescription.toLowerCase()}`;
  }

  // 5. Synthesis & 90-Day Action Plan
  const synthesis = {
    archetypeBlendName: blendName,
    blendDescription,
    keyStrengths: [
      ...primaryArchetype.superpowers.slice(0, 3),
      ...(secondaryArchetype ? [secondaryArchetype.superpowers[0]] : []),
    ],
    shadowTraits: [
      ...primaryArchetype.blindspots.slice(0, 3),
      ...(secondaryArchetype ? [secondaryArchetype.blindspots[0]] : []),
    ],
    communicationGuidance: `${primaryArchetype.communicationStyle} When collaborating with differing perspectives, anchor your communication in the shared goal rather than your preferred style — this is where ${primaryArchetype.title} energy becomes a genuine bridge rather than a barrier.`,
    collaborationDynamics: `${primaryArchetype.collaborationStyle} You reach maximum effectiveness when working alongside partners who complement your natural strengths and constructively challenge your blind spots.`,
    careerEnvironmentRecommendation: primaryArchetype.idealEnvironment,
    actionPlan90Days: {
      phase1: {
        title: "Month 1: Awareness & Cognitive Calibration",
        objective: "Identify subconscious friction points and establish baseline awareness.",
        actions: [
          `Audit your past 30 days of decisions against your primary blindspot: ${primaryArchetype.blindspots[0].toLowerCase()}`,
          `Implement a 15-minute daily reflection ritual to observe when you default to overusing your natural strengths.`,
          `Share your natural communication approach — ${primaryArchetype.communicationStyle.replace(/\.$/, "").toLowerCase()} — with your closest collaborators so they know how to work with you at your best.`,
        ],
      },
      phase2: {
        title: "Month 2: Habit Engineering & Boundary Design",
        objective: "Structure your physical and digital environment to protect your peak energy states.",
        actions: [
          `Design dedicated deep blocks tailored for your core superpower: ${primaryArchetype.superpowers[0].toLowerCase()}`,
          `Establish clear operational boundaries around your secondary growth lever: ${primaryArchetype.growthLever}`,
          `Form a collaborative alliance with a peer whose profile balances your blindspots.`,
        ],
      },
      phase3: {
        title: "Month 3: Mastery & Multiplier Expression",
        objective: "Scale your unique value proposition into broader leadership and creative impact.",
        actions: [
          `Take ownership of a high-leverage initiative that directly leverages your ${blendName} blend.`,
          `Mentor a colleague by sharing the mental models you've codified throughout this framework.`,
          `Re-evaluate your dimensional progression and calibrate your next 6-month trajectory.`,
        ],
      },
    },
  };

  const executiveSummary = `${primaryArchetype.shortDescription} Across your measured dimensions, you exhibit pronounced strengths in ${dimensionScores
    .filter((d) => d.status.includes("high") || d.status.includes("low"))
    .map((d) => d.name)
    .slice(0, 2)
    .join(" and ") || "balanced synthesis"}. Understanding these core levers empowers you to cultivate intentional focus rather than accidental drift.`;

  return {
    assessmentSlug: assessment.slug,
    primaryArchetype,
    secondaryArchetype,
    dimensionScores,
    executiveSummary,
    synthesis,
    calculatedAt: new Date().toISOString(),
  };
}
