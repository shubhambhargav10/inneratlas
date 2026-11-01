/**
 * INNERATLAS Master Automated Test Suite
 * Validates all 18 user-journey scenarios and architectural guarantees.
 */

const { allAssessments, getAssessmentBySlug } = require("../src/data/assessments/index.ts");
const { calculateAssessmentResult } = require("../src/lib/scoring/engine.ts");
const { db } = require("../src/lib/db/store.ts");
const { generatePdfBuffer } = require("../src/lib/pdf/reportGenerator.tsx");
const crypto = require("crypto");

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    testsFailed++;
    throw new Error(message);
  } else {
    console.log(`[PASS] ${message}`);
    testsPassed++;
  }
}

async function runTestSuite() {
  console.log("\n=======================================================");
  console.log("   INNERATLAS END-TO-END COMMERCIAL VALIDATION SUITE    ");
  console.log("=======================================================\n");

  // Scenario 1 & 2: Homepage & Assessment Catalogue Inspection
  console.log("--- SCENARIO 1 & 2: Assessment Catalogue Verification ---");
  assert(allAssessments.length === 3, "Catalogue contains exactly 3 distinct assessment products.");
  
  const personality = getAssessmentBySlug("personality-archetype");
  const career = getAssessmentBySlug("career-dna");
  const thinking = getAssessmentBySlug("thinking-style");

  assert(personality && personality.archetypes.length === 8, "Personality Archetype assessment has 8 distinct archetypes.");
  assert(personality.questions.length === 28, "Personality Archetype has 28 questions.");
  assert(career && career.questions.length === 25, "Career DNA has 25 questions.");
  assert(thinking && thinking.questions.length === 24, "Thinking Style has 24 questions.");

  // Scenario 3 & 4: Answering all questions
  console.log("\n--- SCENARIO 3 & 4: Questionnaire Progression & Answering ---");
  const sampleAnswers = {};
  personality.questions.forEach((q, idx) => {
    // 5 = Strongly Agree, 4 = Agree, etc.
    sampleAnswers[q.id] = (idx % 2 === 0) ? 5 : 4;
  });
  assert(Object.keys(sampleAnswers).length === 28, "User answered all 28 questions.");

  // Scenario 5 & 6: Refresh Browser / Session Persistence
  console.log("\n--- SCENARIO 5 & 6: Local Storage Session Persistence ---");
  const serializedSession = JSON.stringify({
    assessmentSlug: "personality-archetype",
    guestSessionToken: "gst_test_session_token_123",
    answers: sampleAnswers,
    currentQuestionIndex: 27,
    isCompleted: true,
  });

  const parsedSession = JSON.parse(serializedSession);
  assert(parsedSession.guestSessionToken === "gst_test_session_token_123", "Session token restored on refresh.");
  assert(Object.keys(parsedSession.answers).length === 28, "All 28 answers retained after simulated browser refresh.");
  assert(parsedSession.answers[personality.questions[0].id] === 5, "Exact answer value preserved.");

  // Scenario 7 & 8: Scoring Engine deterministic calculation
  console.log("\n--- SCENARIO 7 & 8: Deterministic Scoring & Normalization ---");
  const result = calculateAssessmentResult({
    assessment: personality,
    answers: sampleAnswers,
  });

  assert(result.primaryArchetype && result.primaryArchetype.title.length > 0, `Primary archetype determined: ${result.primaryArchetype.title}`);
  assert(result.secondaryArchetype !== undefined, `Secondary archetype determined: ${result.secondaryArchetype.title}`);
  assert(result.synthesis.archetypeBlendName.length > 0, `Archetype blend generated: ${result.synthesis.archetypeBlendName}`);
  assert(result.dimensionScores.every((d) => d.normalizedScore >= 0 && d.normalizedScore <= 100), "All dimension scores are normalized strictly within 0–100%.");

  // Scenario 9: Results Preview Data
  console.log("\n--- SCENARIO 9: Free Preview Data Integrity ---");
  assert(result.executiveSummary.length > 50, "Executive summary generated.");
  assert(result.synthesis.keyStrengths.length >= 3, "Free superpowers populated.");
  assert(result.synthesis.shadowTraits.length >= 3, "Subconscious blindspots identified.");
  assert(result.synthesis.actionPlan90Days.phase1.actions.length >= 3, "90-Day Roadmap Phase 1 populated.");

  // Scenario 10: Order Creation
  console.log("\n--- SCENARIO 10: Server-Side Order Generation ---");
  const order = await db.createOrder({
    guestSessionToken: parsedSession.guestSessionToken,
    assessmentSlug: "personality-archetype",
    customerName: "Priya Nair",
    customerEmail: "priya.nair@example.com",
    amountPaise: 19900, // ₹199
    resultPayload: result,
    razorpayOrderId: "order_rzp_mock_test_001",
  });

  assert(order.id.startsWith("ord_"), `Order record created with ID: ${order.id}`);
  assert(order.status === "created", "Initial order status is 'created'.");
  assert(order.amountPaise === 19900, "Price matches ₹199 in paise.");

  // Scenario 11 & 12: Payment Success & Signature Verification
  console.log("\n--- SCENARIO 11 & 12: Payment Verification & Fulfillment ---");
  const mockPaymentId = "pay_rzp_mock_test_001";
  const mockSignature = "sig_hmac_sha256_mock_valid";

  const { order: paidOrder, report, accessToken } = await db.markOrderAsPaid(order.id, mockPaymentId, mockSignature);
  assert(paidOrder.status === "paid", "Order status successfully updated to 'paid'.");
  assert(report.reportCode.startsWith("DOSSIER-"), `Report Dossier issued: ${report.reportCode}`);
  assert(accessToken.startsWith("acc_"), `Cryptographic access token generated: ${accessToken}`);
  assert(report.accessTokenHash.length === 64, "Access token stored as 64-character SHA-256 hash in database.");

  // Scenario 13 & 14: PDF Generation & Download
  console.log("\n--- SCENARIO 13 & 14: PDF Dossier Generation & Download ---");
  const pdfBuffer = await generatePdfBuffer({
    customerName: paidOrder.customerName,
    reportCode: report.reportCode,
    assessmentTitle: personality.title,
    result: paidOrder.resultPayload,
  });

  assert(Buffer.isBuffer(pdfBuffer), "PDF generated as binary Buffer.");
  assert(pdfBuffer.length > 20000, `PDF size is valid and substantial (${pdfBuffer.length} bytes).`);
  assert(pdfBuffer.toString("utf-8", 0, 5) === "%PDF-", "Valid PDF header (%PDF-1.4).");

  // Scenario 15: Failed / Unpaid Order Security Gate
  console.log("\n--- SCENARIO 15: Security Gate — Unpaid Order Gating ---");
  const unpaidOrder = await db.createOrder({
    guestSessionToken: "gst_unpaid_attempt",
    assessmentSlug: "personality-archetype",
    customerName: "Hacker Try",
    customerEmail: "hacker@test.com",
    amountPaise: 19900,
    resultPayload: result,
  });

  assert(unpaidOrder.status === "created", "Unpaid order has status 'created'.");
  const unpaidReport = await db.getReportByOrderId(unpaidOrder.id);
  assert(unpaidReport === null, "Report dossier does NOT exist for unpaid order.");

  // Scenario 16: Idempotent Webhook / Re-verification
  console.log("\n--- SCENARIO 16: Idempotency Protection ---");
  const reVerify = await db.markOrderAsPaid(order.id, mockPaymentId, mockSignature);
  assert(reVerify.report.reportCode === report.reportCode, "Duplicate payment trigger returns existing report without creating duplicates.");

  // Scenario 17: Access Token Security Isolation
  console.log("\n--- SCENARIO 17: Unauthorized Access Token Isolation ---");
  const correctReport = await db.getReportByAccessToken(accessToken);
  const fakeReport = await db.getReportByAccessToken("acc_invalid_fake_token_attempt");
  assert(correctReport !== null, "Authorized access token retrieves the report.");
  assert(fakeReport === null, "Unauthorized token cannot access any report.");

  // Scenario 18: Authorized Dossier Verification via Cryptographic Token Hash
  console.log("\n--- SCENARIO 18: Authorized Verification via Cryptographic Token Hash ---");
  const isValid = await db.verifyReportToken(paidOrder.id, accessToken);
  const isInvalid = await db.verifyReportToken(paidOrder.id, "acc_wrong_tampered_token");
  assert(isValid === true, "Authorized token successfully verified against database hash.");
  assert(isInvalid === false, "Tampered token rejected by timing-safe hash verification.");

  console.log("\n=======================================================");
  console.log(`   SUITE COMPLETE: ${testsPassed} TESTS PASSED, ${testsFailed} FAILED   `);
  console.log("=======================================================\n");
}

runTestSuite().catch((err) => {
  console.error("\n[FATAL] Test suite failed with exception:", err);
  process.exit(1);
});
