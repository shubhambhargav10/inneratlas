const { personalityArchetypeAssessment } = require("../src/data/assessments/personality-archetype.ts");
const { calculateAssessmentResult } = require("../src/lib/scoring/engine.ts");
const { generatePdfBuffer } = require("../src/lib/pdf/reportGenerator.tsx");
const fs = require("fs");
const path = require("path");

async function runPdfTest() {
  console.log("Testing Server-Side Vector PDF Report Generation...");

  const sampleAnswers = {};
  personalityArchetypeAssessment.questions.forEach((q, idx) => {
    sampleAnswers[q.id] = idx % 2 === 0 ? 5 : 4;
  });

  const result = calculateAssessmentResult({
    assessment: personalityArchetypeAssessment,
    answers: sampleAnswers,
  });

  console.log("Generating PDF for user 'Aarav Mehta' with result:", result.synthesis.archetypeBlendName);

  const buffer = await generatePdfBuffer({
    customerName: "Aarav Mehta",
    reportCode: "INA-2025-TEST01",
    assessmentTitle: personalityArchetypeAssessment.title,
    result,
  });

  console.log(`Generated PDF buffer size: ${buffer.length} bytes`);

  if (!buffer || buffer.length < 1000) {
    throw new Error("PDF buffer is empty or too small!");
  }

  // Check PDF signature
  const header = buffer.toString("utf-8", 0, 5);
  if (header !== "%PDF-") {
    throw new Error(`Invalid PDF header signature: ${header}`);
  }

  const outPath = path.join(process.cwd(), ".data", "test-report.pdf");
  if (!fs.existsSync(path.join(process.cwd(), ".data"))) {
    fs.mkdirSync(path.join(process.cwd(), ".data"), { recursive: true });
  }
  fs.writeFileSync(outPath, buffer);
  console.log(`[PASS] Valid vector PDF generated and saved to ${outPath}!`);
}

runPdfTest().catch((err) => {
  console.error("PDF test failed:", err);
  process.exit(1);
});
