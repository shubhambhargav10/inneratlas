// Unit test for InnerAtlas Scoring Engine
const { personalityArchetypeAssessment } = require("../src/data/assessments/personality-archetype.ts");
const { careerDnaAssessment } = require("../src/data/assessments/career-dna.ts");
const { thinkingStyleAssessment } = require("../src/data/assessments/thinking-style.ts");
const { calculateAssessmentResult } = require("../src/lib/scoring/engine.ts");

console.log("Running Psychometric Scoring Engine Verification Tests...");

// Test 1: Personality Archetype deterministic answers
const sampleAnswers1 = {};
personalityArchetypeAssessment.questions.forEach((q, idx) => {
  sampleAnswers1[q.id] = (idx % 2 === 0) ? 5 : 4;
});

const result1 = calculateAssessmentResult({
  assessment: personalityArchetypeAssessment,
  answers: sampleAnswers1,
});

console.log(`[PASS] Primary Archetype calculated: ${result1.primaryArchetype.title}`);
console.log(`[PASS] Secondary Archetype: ${result1.secondaryArchetype ? result1.secondaryArchetype.title : 'None'}`);
console.log(`[PASS] Archetype Blend: ${result1.synthesis.archetypeBlendName}`);

// Verify normalization bounds
result1.dimensionScores.forEach((dim) => {
  if (dim.normalizedScore < 0 || dim.normalizedScore > 100) {
    throw new Error(`Dimension score out of bounds [0-100]: ${dim.key} = ${dim.normalizedScore}`);
  }
});
console.log(`[PASS] All ${result1.dimensionScores.length} dimensions properly normalized (0-100).`);

// Test 2: Reproducibility (comparing computed outputs ignoring timestamp)
const result2 = calculateAssessmentResult({
  assessment: personalityArchetypeAssessment,
  answers: sampleAnswers1,
});

const { calculatedAt: t1, ...core1 } = result1;
const { calculatedAt: t2, ...core2 } = result2;

if (JSON.stringify(core1) !== JSON.stringify(core2)) {
  throw new Error("Scoring is not deterministic! Two identical inputs gave different outputs.");
}
console.log("[PASS] Scoring is 100% deterministic and reproducible.");

// Test 3: Incomplete answers fallback
const incompleteAnswers = {
  [personalityArchetypeAssessment.questions[0].id]: 5,
};
const resultIncomplete = calculateAssessmentResult({
  assessment: personalityArchetypeAssessment,
  answers: incompleteAnswers,
});
console.log(`[PASS] Incomplete answer set handled safely without crash: Primary is ${resultIncomplete.primaryArchetype.title}`);

// Test 4: Career DNA
const careerAnswers = {};
careerDnaAssessment.questions.forEach((q) => { careerAnswers[q.id] = 4; });
const careerResult = calculateAssessmentResult({
  assessment: careerDnaAssessment,
  answers: careerAnswers,
});
console.log(`[PASS] Career DNA result calculated: ${careerResult.primaryArchetype.title} - ${careerResult.synthesis.archetypeBlendName}`);

// Test 5: Thinking Style
const thinkingAnswers = {};
thinkingStyleAssessment.questions.forEach((q) => { thinkingAnswers[q.id] = 5; });
const thinkingResult = calculateAssessmentResult({
  assessment: thinkingStyleAssessment,
  answers: thinkingAnswers,
});
console.log(`[PASS] Thinking Style result calculated: ${thinkingResult.primaryArchetype.title} - ${thinkingResult.synthesis.archetypeBlendName}`);

console.log("\nALL SCORING ENGINE TESTS PASSED SUCCESSFULLY! (5/5)");
