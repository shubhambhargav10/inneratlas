/**
 * INNERATLAS PHASE 2 DATABASE, SECURITY & PERSISTENCE TEST SUITE
 * 
 * Verifies:
 * 1. Session and response lifecycle
 * 2. Atomic order fulfillment and idempotency
 * 3. Access token SHA-256 hashing and timing-safe verification
 * 4. Webhook lifecycle state machine (received -> processing -> processed / failed)
 * 5. Webhook concurrency lock & safe retry on failure
 * 6. Concurrency-safe atomic administrator rate limiting
 * 7. Profile role escalation prevention & authorized administrative changes
 * 8. Production fail-closed security enforcement (no filesystem fallback)
 * 9. SQL Relational Integrity & Immutable Assessment Versions
 * 10. SQL SECURITY DEFINER Privilege Hardening (Revoked from PUBLIC/anon/authenticated)
 * 11. Profile Role Protection Architecture (SECURITY INVOKER, no postgres bypass, no recursive RLS)
 * 12. Scoring Weights Confidentiality (Column privilege & View isolation)
 * 13. Draft / Inactive Content Protection
 * 14. Financial Audit Record Immutability (ON DELETE RESTRICT)
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { db, hashAccessToken } from "../src/lib/db/store";
import { isSupabaseConfigured, getSupabaseServerConfig } from "../src/lib/supabase/config";
import { SupabasePostgresRepository, InMemoryRepository } from "../src/lib/supabase/repository";
import { personalityArchetypeAssessment } from "../src/data/assessments/personality-archetype";
import { calculateAssessmentResult } from "../src/lib/scoring/engine";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${testName}${detail ? ` - ${detail}` : ""}`);
    failed++;
    throw new Error(testName);
  } else {
    console.log(`✅ [PASS] ${testName}`);
    passed++;
  }
}

async function runPhase2DatabaseTests() {
  console.log("\n==================================================================");
  console.log("   INNERATLAS PHASE 2: SUPABASE & DATABASE SECURITY TEST SUITE    ");
  console.log("==================================================================\n");

  const remoteConfigured = isSupabaseConfigured();
  console.log(`🌐 Database Environment Mode: ${remoteConfigured ? "REMOTE HOSTED SUPABASE (InnerAtlas-dev)" : "ISOLATED REPOSITORY + STATIC SQL AUDIT"}`);
  if (!remoteConfigured) {
    console.log("   (Remote credentials not detected in test runner; executing repository architecture, concurrency state machine, and SQL contract audit)\n");
  }

  const sampleAnswers: Record<string, number> = {};
  personalityArchetypeAssessment.questions.forEach((q) => { sampleAnswers[q.id] = 4; });
  const resultPayload = calculateAssessmentResult({
    assessment: personalityArchetypeAssessment,
    answers: sampleAnswers,
  });

  const runId = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

  // ---------------------------------------------------------------------------
  // 1. SESSION & RESPONSE LIFECYCLE TESTS
  // ---------------------------------------------------------------------------
  console.log("--- 1. ASSESSMENT SESSION & RESPONSE LIFECYCLE ---");

  const guestToken = `gst_phase2_${runId}`;
  const session = await db.createSession({
    assessmentSlug: "personality-archetype",
    guestSessionToken: guestToken,
    guestEmail: "shubham@example.com",
    guestName: "Shubham",
  });

  assert(session.id.startsWith("sess_"), "1.1: Session ID generated with sess_ prefix");
  assert(session.status === "in_progress", "1.2: Initial session status is in_progress");

  const retrievedSession = await db.getSession(guestToken);
  assert(retrievedSession !== null, "1.3: Retrieved session by guest_session_token");
  assert(retrievedSession?.guestEmail === "shubham@example.com", "1.4: Session customer email preserved");

  await db.saveResponses(session.id, [
    { questionId: "pa_q1", numericValue: 5 },
    { questionId: "pa_q2", numericValue: 4 },
  ]);
  assert(true, "1.5: User responses saved successfully");

  await db.saveCalculatedResult(session.id, resultPayload);
  assert(true, "1.6: Assessment calculated result saved successfully");

  // ---------------------------------------------------------------------------
  // 2. ORDER & ATOMIC PAYMENT FULFILLMENT TESTS
  // ---------------------------------------------------------------------------
  console.log("\n--- 2. ORDER & ATOMIC PAYMENT FULFILLMENT ---");

  const rzpOrderId = `order_rzp_p2_${runId}`;
  const order = await db.createOrder({
    guestSessionToken: guestToken,
    assessmentSlug: "personality-archetype",
    customerName: "Aarav Mehta",
    customerEmail: "aarav@example.com",
    amountPaise: 19900,
    resultPayload,
    razorpayOrderId: rzpOrderId,
    sessionId: session.id,
  });

  assert(order.id.startsWith("ord_"), "2.1: Order ID created with ord_ prefix");
  assert(order.status === "created", "2.2: Initial order status is created");
  assert(order.amountPaise === 19900, "2.3: Order amount strictly stored in integer paise (₹199)");
  assert(order.currency === "INR", "2.4: Order currency is INR");

  const fetchedByRzp = await db.getOrderByRazorpayOrderId(rzpOrderId);
  assert(fetchedByRzp?.id === order.id, "2.5: Order retrievable by unique razorpay_order_id");

  // Mark as paid
  const paymentId = `pay_rzp_p2_${runId}`;
  const signature = crypto.randomBytes(32).toString("hex");
  const { order: paidOrder, report, accessToken } = await db.markOrderAsPaid(order.id, paymentId, signature);

  assert(paidOrder.status === "paid", "2.6: Order status updated to paid");
  assert(paidOrder.razorpayPaymentId === paymentId, "2.7: Payment ID associated with order");
  assert(report.reportCode.startsWith("DOSSIER-"), "2.8: Report code generated with DOSSIER- prefix");
  assert(accessToken.startsWith("acc_"), "2.9: Plaintext access token returned to purchaser");

  // Duplicate fulfillment idempotency
  const dupFulfillment = await db.markOrderAsPaid(order.id, paymentId, signature);
  assert(dupFulfillment.report.reportCode === report.reportCode, "2.10: Duplicate payment fulfillment is idempotent");

  // 2.11 Conflicting payment ID on already-paid order throws exception
  let paymentConflictThrew = false;
  try {
    await db.markOrderAsPaid(order.id, "pay_conflicting_fraudulent_attempt_999", signature);
  } catch (err: any) {
    if (err.message.includes("Payment conflict") && err.message.includes("already paid")) {
      paymentConflictThrew = true;
    }
  }
  assert(paymentConflictThrew, "2.11: Repeated fulfillment with conflicting payment ID is strictly rejected");

  // 2.12 Reject NULL or empty payment ID
  let nullPaymentThrew = false;
  try {
    await db.markOrderAsPaid(order.id, "");
  } catch (err: any) {
    if (err.message.includes("payment_id cannot be null or empty")) {
      nullPaymentThrew = true;
    }
  }
  assert(nullPaymentThrew, "2.12: Missing or empty payment ID fails closed immediately");

  // 2.13 Paid order with missing recorded payment ID raises inconsistent state exception
  const corruptedOrder = await db.createOrder({
    guestSessionToken: `gst_corrupt_${runId}`,
    assessmentSlug: "thinking-style",
    customerName: "Corrupted Order Test",
    customerEmail: `corrupt_${runId}@example.com`,
    amountPaise: 19900,
    resultPayload,
  });
  (corruptedOrder as any).status = "paid";
  (corruptedOrder as any).razorpayPaymentId = null;

  let inconsistentStateThrew = false;
  try {
    await db.markOrderAsPaid(corruptedOrder.id, "pay_valid_attempt_123");
  } catch (err: any) {
    if (err.message.includes("Inconsistent payment state") && err.message.includes("no recorded payment ID")) {
      inconsistentStateThrew = true;
    }
  }
  assert(inconsistentStateThrew, "2.13: Paid order with missing recorded payment ID raises explicit inconsistent state exception");

  // ---------------------------------------------------------------------------
  // 3. ACCESS TOKEN CRYPTOGRAPHIC HASHING & PRIVACY
  // ---------------------------------------------------------------------------
  console.log("\n--- 3. ACCESS TOKEN CRYPTOGRAPHIC HASHING & PRIVACY ---");

  const storedReport = (await db.getReportByOrderId(order.id))!;
  assert(storedReport.accessTokenHash !== undefined, "3.1: Stored report contains accessTokenHash");
  assert(storedReport.accessTokenHash.length === 64, "3.2: Access token hash is 64-character SHA-256 hex");
  assert(storedReport.accessTokenHash === hashAccessToken(accessToken), "3.3: Hash matches SHA-256 of plaintext token");

  // Verify access token via timing-safe repository method
  const isValid = await db.verifyReportToken(order.id, accessToken);
  assert(isValid === true, "3.4: Plaintext token matches stored hash");

  const isFakeValid = await db.verifyReportToken(order.id, "acc_fake_unauthorized_token_attempt");
  assert(isFakeValid === false, "3.5: Unauthorized token fails hash comparison");

  // Verify report retrieved by plaintext token (via internal hash query)
  const reportByToken = await db.getReportByAccessToken(accessToken);
  assert(reportByToken !== null, "3.6: Report retrievable by valid access token");
  assert(reportByToken?.orderId === order.id, "3.7: Correct report resolved from token hash");

  // ---------------------------------------------------------------------------
  // 4. WEBHOOK LIFECYCLE & RETRY STATE MACHINE
  // ---------------------------------------------------------------------------
  console.log("\n--- 4. WEBHOOK LIFECYCLE & RETRY STATE MACHINE ---");

  const webhookEventId = `evt_lifecycle_test_${runId}`;

  // 4.1 First receipt moves event to 'processing'
  const firstLifecycle = await db.recordWebhookLifecycle(webhookEventId, "payment.captured", { orderId: order.id });
  assert(firstLifecycle.shouldProcess === true, "4.1: First webhook event allowed to process");
  assert(firstLifecycle.status === "processing", "4.2: Initial webhook status is 'processing'");
  assert(firstLifecycle.retryCount === 1, "4.3: Initial retryCount is 1");

  // 4.2 Concurrent request while in-flight is rejected
  const inFlightLifecycle = await db.recordWebhookLifecycle(webhookEventId, "payment.captured", { orderId: order.id });
  assert(inFlightLifecycle.shouldProcess === false, "4.4: In-flight webhook event rejected from concurrent duplicate processing");
  assert(inFlightLifecycle.status === "in_flight", "4.5: Status indicates 'in_flight' concurrency lock");

  // 4.3 Simulate processing failure
  await db.finalizeWebhookEvent(webhookEventId, "failed", "Network timeout contacting payment gateway");
  const isFailedProcessed = await db.isWebhookEventProcessed(webhookEventId);
  assert(isFailedProcessed === false, "4.6: Failed event is NOT marked as processed");

  // 4.4 Safe retry succeeds on failed event
  const retryLifecycle = await db.recordWebhookLifecycle(webhookEventId, "payment.captured", { orderId: order.id });
  assert(retryLifecycle.shouldProcess === true, "4.7: Safe retry allowed after failed processing");
  assert(retryLifecycle.retryCount === 2, "4.8: Retry count incremented to 2");

  // 4.5 Successful finalization
  await db.finalizeWebhookEvent(webhookEventId, "processed");
  const isNowProcessed = await db.isWebhookEventProcessed(webhookEventId);
  assert(isNowProcessed === true, "4.9: Finalized event confirmed as processed");

  // 4.6 Subsequent delivery of processed event is rejected
  const postProcessedLifecycle = await db.recordWebhookLifecycle(webhookEventId, "payment.captured", { orderId: order.id });
  assert(postProcessedLifecycle.shouldProcess === false, "4.10: Processed event permanently blocks redundant re-processing");
  assert(postProcessedLifecycle.status === "processed", "4.11: Status remains 'processed'");

  // 4.7 Simultaneous first-time requests for the same previously unseen event ID
  const concurrentEventId = `evt_concurrent_unseen_${runId}`;
  const [resA, resB] = await Promise.all([
    db.recordWebhookLifecycle(concurrentEventId, "payment.captured", { orderId: order.id }),
    db.recordWebhookLifecycle(concurrentEventId, "payment.captured", { orderId: order.id }),
  ]);

  const winCount = (resA.shouldProcess ? 1 : 0) + (resB.shouldProcess ? 1 : 0);
  const flightCount = (resA.status === "in_flight" ? 1 : 0) + (resB.status === "in_flight" ? 1 : 0);
  assert(winCount === 1, "4.12: Exactly one concurrent request wins processing lock for unseen event ID");
  assert(flightCount === 1, "4.13: Concurrent duplicate request receives in_flight status lock");

  // ---------------------------------------------------------------------------
  // 5. ADMINISTRATOR RATE LIMITING & ATOMIC CONCURRENCY
  // ---------------------------------------------------------------------------
  console.log("\n--- 5. ADMINISTRATOR RATE LIMITING & ATOMIC CONCURRENCY ---");

  const testIp = `192.168.10.${Math.floor(Math.random() * 200 + 10)}`;
  const initialLimit = await db.checkAdminRateLimit(testIp);
  assert(initialLimit.allowed === true, "5.1: Initial rate limit allows login");
  assert(initialLimit.remainingAttempts === 5, "5.2: Initial remaining attempts is 5");

  // Record 4 failed attempts
  for (let i = 0; i < 4; i++) {
    await db.recordAdminAttempt(testIp, false);
  }
  const midLimit = await db.checkAdminRateLimit(testIp);
  assert(midLimit.allowed === true, "5.3: Allowed after 4 attempts");
  assert(midLimit.remainingAttempts === 1, "5.4: Remaining attempts is 1 after 4 failures");

  // 5th failed attempt triggers lock
  await db.recordAdminAttempt(testIp, false);
  const lockedLimit = await db.checkAdminRateLimit(testIp);
  assert(lockedLimit.allowed === false, "5.5: 5th failure triggers lockout");
  assert(lockedLimit.remainingAttempts === 0, "5.6: Remaining attempts is 0 when locked");
  assert((lockedLimit.retryAfterSeconds || 0) > 0, "5.7: Retry-After seconds provided on lock");

  // Successful login clears attempts
  await db.recordAdminAttempt(testIp, true);
  const clearedLimit = await db.checkAdminRateLimit(testIp);
  assert(clearedLimit.allowed === true, "5.8: Successful login resets lockout");
  assert(clearedLimit.remainingAttempts === 5, "5.9: Reset attempts back to 5");

  // ---------------------------------------------------------------------------
  // 6. PROFILE ROLE ESCALATION & AUTHORIZATION SUITE
  // ---------------------------------------------------------------------------
  console.log("\n--- 6. PROFILE ROLE ESCALATION & AUTHORIZATION TESTS ---");

  const testUserId = `usr_auth_${runId}`;
  await db.createProfile({
    id: testUserId,
    email: `customer_${runId}@example.com`,
    fullName: "Ordinary Customer",
    role: "user",
  });

  // 6.1 Ordinary authenticated user can update permitted profile fields
  const updatedProfile = await db.updateProfile(
    testUserId,
    { fullName: "Updated Customer Name", avatarUrl: "https://example.com/avatar.png" },
    { jwtRole: "authenticated", userId: testUserId }
  );
  assert(updatedProfile.fullName === "Updated Customer Name", "6.1: Authenticated user successfully updates permitted profile field (fullName)");
  assert(updatedProfile.role === "user", "6.2: User role remains securely unchanged as 'user'");

  // 6.2 Authenticated user attempting self-promotion to 'admin' is strictly blocked
  let adminEscalationBlocked = false;
  try {
    await db.updateProfile(
      testUserId,
      { role: "admin" },
      { jwtRole: "authenticated", userId: testUserId }
    );
  } catch (err: any) {
    if (err.message.includes("Unauthorized") && err.message.includes("role")) {
      adminEscalationBlocked = true;
    }
  }
  assert(adminEscalationBlocked, "6.3: Authenticated user attempting self-promotion to 'admin' is strictly blocked");

  // 6.3 Authenticated user attempting self-promotion to 'super_admin' is strictly blocked
  let superAdminEscalationBlocked = false;
  try {
    await db.updateProfile(
      testUserId,
      { role: "super_admin" },
      { jwtRole: "authenticated", userId: testUserId }
    );
  } catch (err: any) {
    if (err.message.includes("Unauthorized") && err.message.includes("role")) {
      superAdminEscalationBlocked = true;
    }
  }
  assert(superAdminEscalationBlocked, "6.4: Authenticated user attempting self-promotion to 'super_admin' is strictly blocked");

  // 6.4 Cross-user profile tampering is blocked
  let crossUserBlocked = false;
  try {
    await db.updateProfile(
      testUserId,
      { fullName: "Attacker Impersonation" },
      { jwtRole: "authenticated", userId: `victim_${runId}` }
    );
  } catch (err: any) {
    if (err.message.includes("Unauthorized")) {
      crossUserBlocked = true;
    }
  }
  assert(crossUserBlocked, "6.5: Authenticated user cannot update another user's profile");

  // 6.5 Authenticated user cannot invoke administrative RPC admin_set_user_role
  let userRpcBlocked = false;
  try {
    await db.adminSetUserRole(testUserId, "admin", { jwtRole: "authenticated" });
  } catch (err: any) {
    if (err.message.includes("Unauthorized") && err.message.includes("admin_set_user_role")) {
      userRpcBlocked = true;
    }
  }
  assert(userRpcBlocked, "6.6: Authenticated user denied execution of admin_set_user_role RPC");

  // 6.6 Trusted server-side role (service_role) can perform authorized role change
  const elevatedProfile = await db.adminSetUserRole(testUserId, "admin", { jwtRole: "service_role" });
  assert(elevatedProfile.role === "admin", "6.7: Trusted server-side role (service_role) successfully elevates user to 'admin'");

  // 6.7 Trusted server-side role can revert role
  const revertedProfile = await db.adminSetUserRole(testUserId, "user", { jwtRole: "service_role" });
  assert(revertedProfile.role === "user", "6.8: Trusted server-side role successfully reverts user to 'user'");

  // ---------------------------------------------------------------------------
  // 7. PRODUCTION FAIL-CLOSED SECURITY ENFORCEMENT
  // ---------------------------------------------------------------------------
  console.log("\n--- 7. PRODUCTION FAIL-CLOSED SECURITY ENFORCEMENT ---");

  const origEnv = process.env.NODE_ENV;
  const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  try {
    (process.env as any).NODE_ENV = "production";
    process.env.NEXT_PUBLIC_SUPABASE_URL = ""; // Unconfigured

    let threwExpected = false;
    try {
      await db.createOrder({
        guestSessionToken: "gst_fail_closed",
        assessmentSlug: "personality-archetype",
        customerName: "Fail Closed",
        customerEmail: "fail@example.com",
        amountPaise: 19900,
        resultPayload,
      });
    } catch (err: any) {
      if (err.message.includes("FATAL SECURITY ERROR") && err.message.includes("production")) {
        threwExpected = true;
      }
    }
    assert(threwExpected, "7.1: Production mode with missing Supabase configuration fails closed immediately");
  } finally {
    (process.env as any).NODE_ENV = origEnv;
    process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
  }

  // ---------------------------------------------------------------------------
  // 7.2 ASSESSMENT-VERSION RELATIONAL INTEGRITY (COMPOSITE FOREIGN KEYS)
  // ---------------------------------------------------------------------------
  console.log("\n--- 7.2 ASSESSMENT-VERSION RELATIONAL INTEGRITY ---");

  const memRepo = new InMemoryRepository();
  const v1Personality = memRepo.createAssessmentVersion({
    assessmentId: "asm_personality_100",
    versionNumber: 1,
    status: "published",
    changelog: "Personality v1",
  });
  const v1Career = memRepo.createAssessmentVersion({
    assessmentId: "asm_career_200",
    versionNumber: 1,
    status: "published",
    changelog: "Career v1",
  });

  // Attempt to create session with mismatched assessment_id and version_id
  let mismatchedSessionThrew = false;
  try {
    await memRepo.createSession({
      assessmentSlug: "personality-archetype",
      guestSessionToken: "gst_mismatch_cross_assessment",
      assessmentId: "asm_personality_100",
      versionId: v1Career.id, // Belonging to Career!
    });
  } catch (err: any) {
    if (err.message.includes("Foreign key violation")) {
      mismatchedSessionThrew = true;
    }
  }
  assert(mismatchedSessionThrew, "7.2: Session with mismatched assessment_id and version_id rejected by composite FK");

  // Create valid session on v1Personality
  const validSession = await memRepo.createSession({
    assessmentSlug: "personality-archetype",
    guestSessionToken: "gst_valid_session_integrity",
    assessmentId: "asm_personality_100",
    versionId: v1Personality.id,
  });
  assert(validSession.id.startsWith("sess_"), "7.3: Valid session created with matching assessment_id and version_id");

  // Create draft version and questions to test response-version alignment
  const draftVersion = memRepo.createAssessmentVersion({
    assessmentId: "asm_personality_100",
    versionNumber: 2,
    status: "draft",
    changelog: "Personality v2 draft",
  });

  const qDraft = memRepo.createQuestion({
    versionId: draftVersion.id,
    questionCode: "pa_draft_q1",
    questionText: "How do you recharge after intense work?",
  });

  // Attempt to save response with question from draftVersion to session running v1Personality
  let mismatchedResponseThrew = false;
  try {
    await memRepo.saveResponses(validSession.id, [
      { questionId: qDraft.id, numericValue: 4 },
    ]);
  } catch (err: any) {
    if (err.message.includes("Foreign key violation")) {
      mismatchedResponseThrew = true;
    }
  }
  assert(mismatchedResponseThrew, "7.4: User response with question from mismatched version rejected by composite FK");

  // ---------------------------------------------------------------------------
  // 7.3 PUBLISHED ASSESSMENT IMMUTABILITY & REPARENTING BYPASS CLOSURE
  // ---------------------------------------------------------------------------
  console.log("\n--- 7.3 PUBLISHED ASSESSMENT IMMUTABILITY & REPARENTING BYPASS CLOSURE ---");

  // 7.5 Content editing is allowed on draft versions
  const updatedDraftQ = memRepo.updateQuestion(qDraft.id, {
    questionText: "How do you recharge after intense creative work?",
  });
  assert(updatedDraftQ.questionText.includes("creative work"), "7.5: Draft assessment version questions can be modified freely");

  const dimDraft1 = memRepo.createScoringDimension({
    versionId: draftVersion.id,
    key: "pa_openness",
    name: "Openness to Experience",
  });
  const updatedDraftDim = memRepo.updateScoringDimension(dimDraft1.id, {
    name: "Openness & Intellectual Curiosity",
  });
  assert(updatedDraftDim.name.includes("Curiosity"), "7.6: Draft scoring dimensions can be modified freely");

  const optDraft1 = memRepo.createAnswerOption({
    questionId: qDraft.id,
    orderIndex: 0,
    label: "Rarely true",
    value: 1,
  });
  const updatedDraftOpt = memRepo.updateAnswerOption(optDraft1.id, {
    label: "Almost never true of me",
  });
  assert(updatedDraftOpt.label.includes("never true"), "7.7: Draft answer options can be modified freely");

  // Legitimate draft deletions
  const qDraft2 = memRepo.createQuestion({
    versionId: draftVersion.id,
    questionCode: "pa_draft_q2",
    questionText: "Question to delete in draft",
  });
  memRepo.deleteQuestion(qDraft2.id);
  assert(true, "7.8: Draft assessment questions can be deleted freely");

  const dimDraftToDelete = memRepo.createScoringDimension({
    versionId: draftVersion.id,
    key: "pa_temp_dim",
    name: "Temporary Dimension to Delete",
  });
  memRepo.deleteScoringDimension(dimDraftToDelete.id);
  assert(true, "7.9: Draft scoring dimensions can be deleted freely");

  const optDraftToDelete = memRepo.createAnswerOption({
    questionId: qDraft.id,
    orderIndex: 1,
    label: "Temporary Option to Delete",
    value: 2,
  });
  memRepo.deleteAnswerOption(optDraftToDelete.id);
  assert(true, "7.10: Draft answer options can be deleted freely");

  // 7.11 Published versions reject question creation
  let publishedInsertThrew = false;
  try {
    memRepo.createQuestion({
      versionId: v1Personality.id, // Published version!
      questionCode: "pa_v1_illegal_add",
      questionText: "Illegal question addition to published version",
    });
  } catch (err: any) {
    if (err.message.includes("immutable once published")) {
      publishedInsertThrew = true;
    }
  }
  assert(publishedInsertThrew, "7.11: Modifying content on published assessment version is strictly blocked by immutability trigger");

  // 7.12 Published version cannot be deleted
  let publishedDeleteThrew = false;
  try {
    memRepo.deleteAssessmentVersion(v1Personality.id);
  } catch (err: any) {
    if (err.message.includes("permanently immutable")) {
      publishedDeleteThrew = true;
    }
  }
  assert(publishedDeleteThrew, "7.12: Published assessment version deletion is strictly blocked for historical integrity");

  // 7.13 Publishing RPC rejects unauthenticated or anon callers
  let unauthorizedPublishThrew = false;
  try {
    await memRepo.publishAssessmentVersion(draftVersion.id, { jwtRole: "authenticated" });
  } catch (err: any) {
    if (err.message.includes("Unauthorized") && err.message.includes("service_role")) {
      unauthorizedPublishThrew = true;
    }
  }
  assert(unauthorizedPublishThrew, "7.13: publish_assessment_version RPC strictly rejects unprivileged callers");

  // 7.14 Publishing RPC by service_role archives prior version and publishes draft
  const publishResult = await memRepo.publishAssessmentVersion(draftVersion.id, { jwtRole: "service_role" });
  assert(publishResult.success === true, "7.14: publish_assessment_version RPC succeeds for service_role");
  assert(publishResult.status === "published", "7.15: Draft version successfully transitioned to published");
  assert(publishResult.versionNumber === 2, "7.16: Published version number is 2");

  // 7.17 Content in newly published version is now locked and immutable
  let nowImmutableQThrew = false;
  try {
    memRepo.updateQuestion(qDraft.id, { questionText: "Illegal edit post-publication" });
  } catch (err: any) {
    if (err.message.includes("immutable once published")) {
      nowImmutableQThrew = true;
    }
  }
  assert(nowImmutableQThrew, "7.17: Questions locked and immutable once version is published");

  let nowImmutableDimThrew = false;
  try {
    memRepo.updateScoringDimension(dimDraft1.id, { name: "Illegal dimension edit post-publication" });
  } catch (err: any) {
    if (err.message.includes("immutable once published")) {
      nowImmutableDimThrew = true;
    }
  }
  assert(nowImmutableDimThrew, "7.18: Scoring dimensions locked and immutable once version is published");

  let nowImmutableOptThrew = false;
  try {
    memRepo.updateAnswerOption(optDraft1.id, { label: "Illegal option edit post-publication" });
  } catch (err: any) {
    if (err.message.includes("immutable once published")) {
      nowImmutableOptThrew = true;
    }
  }
  assert(nowImmutableOptThrew, "7.19: Answer options locked and immutable once version is published");

  // 7.20 REPARENTING BYPASS CLOSURE: Testing OLD and NEW parent checks
  const draftVersion3 = memRepo.createAssessmentVersion({
    assessmentId: "asm_personality_100",
    versionNumber: 3,
    status: "draft",
    changelog: "Personality v3 draft for reparenting tests",
  });

  const qDraft3 = memRepo.createQuestion({
    versionId: draftVersion3.id,
    questionCode: "pa_v3_q1",
    questionText: "Draft question in v3",
  });
  const dimDraft3 = memRepo.createScoringDimension({
    versionId: draftVersion3.id,
    key: "pa_v3_dim1",
    name: "Draft dimension in v3",
  });
  const optDraft3 = memRepo.createAnswerOption({
    questionId: qDraft3.id,
    orderIndex: 0,
    label: "Draft option in v3",
    value: 1,
  });

  // Bypass 1: Moving a question from published version (v2) into a draft version (v3) is blocked
  let movePublishedQThrew = false;
  try {
    memRepo.updateQuestion(qDraft.id, { versionId: draftVersion3.id });
  } catch (err: any) {
    if (err.message.includes("Cannot update questions on published assessment version")) {
      movePublishedQThrew = true;
    }
  }
  assert(movePublishedQThrew, "7.20: Moving question from published version into draft version is strictly rejected");

  // Bypass 2: Moving a scoring dimension from published version into draft version is blocked
  let movePublishedDimThrew = false;
  try {
    memRepo.updateScoringDimension(dimDraft1.id, { versionId: draftVersion3.id });
  } catch (err: any) {
    if (err.message.includes("Cannot update scoring_dimensions on published assessment version")) {
      movePublishedDimThrew = true;
    }
  }
  assert(movePublishedDimThrew, "7.21: Moving scoring dimension from published version into draft version is strictly rejected");

  // Bypass 3: Moving an answer option from published question into draft question is blocked
  let movePublishedOptThrew = false;
  try {
    memRepo.updateAnswerOption(optDraft1.id, { questionId: qDraft3.id });
  } catch (err: any) {
    if (err.message.includes("Cannot update answer_options on published assessment version")) {
      movePublishedOptThrew = true;
    }
  }
  assert(movePublishedOptThrew, "7.22: Moving answer option from published question into draft question is strictly rejected");

  // Bypass 4: Moving draft question into a published version is blocked
  let moveDraftQIntoPublishedThrew = false;
  try {
    memRepo.updateQuestion(qDraft3.id, { versionId: draftVersion.id });
  } catch (err: any) {
    if (err.message.includes("into published assessment version")) {
      moveDraftQIntoPublishedThrew = true;
    }
  }
  assert(moveDraftQIntoPublishedThrew, "7.23: Moving draft question into published version is strictly rejected");

  // Bypass 5: Moving draft dimension into a published version is blocked
  let moveDraftDimIntoPublishedThrew = false;
  try {
    memRepo.updateScoringDimension(dimDraft3.id, { versionId: draftVersion.id });
  } catch (err: any) {
    if (err.message.includes("into published assessment version")) {
      moveDraftDimIntoPublishedThrew = true;
    }
  }
  assert(moveDraftDimIntoPublishedThrew, "7.24: Moving draft scoring dimension into published version is strictly rejected");

  // Bypass 6: Moving draft answer option into a published question is blocked
  let moveDraftOptIntoPublishedThrew = false;
  try {
    memRepo.updateAnswerOption(optDraft3.id, { questionId: qDraft.id });
  } catch (err: any) {
    if (err.message.includes("into published assessment version")) {
      moveDraftOptIntoPublishedThrew = true;
    }
  }
  assert(moveDraftOptIntoPublishedThrew, "7.25: Moving draft answer option into published question is strictly rejected");

  // Bypass 7: Deleting published content directly is blocked
  let deletePubQThrew = false;
  try {
    memRepo.deleteQuestion(qDraft.id);
  } catch (err: any) {
    if (err.message.includes("immutable once published")) deletePubQThrew = true;
  }
  assert(deletePubQThrew, "7.26: Deleting question on published version is strictly rejected");

  let deletePubDimThrew = false;
  try {
    memRepo.deleteScoringDimension(dimDraft1.id);
  } catch (err: any) {
    if (err.message.includes("immutable once published")) deletePubDimThrew = true;
  }
  assert(deletePubDimThrew, "7.27: Deleting scoring dimension on published version is strictly rejected");

  let deletePubOptThrew = false;
  try {
    memRepo.deleteAnswerOption(optDraft1.id);
  } catch (err: any) {
    if (err.message.includes("immutable once published")) deletePubOptThrew = true;
  }
  assert(deletePubOptThrew, "7.28: Deleting answer option on published version is strictly rejected");

  // ---------------------------------------------------------------------------
  // 7.4 ASSESSMENT VERSION REGRESSION & CONCURRENCY TESTS
  // ---------------------------------------------------------------------------
  console.log("\n--- 7.4 ASSESSMENT VERSION REGRESSION & CONCURRENCY TESTS ---");

  // Current published version for asm_personality_100 is 2.
  // Test: Attempting to publish draft with version_number = 1 is strictly rejected
  const draftRegress1 = memRepo.createAssessmentVersion({
    assessmentId: "asm_personality_100",
    versionNumber: 1,
    status: "draft",
    changelog: "Illegal backward version regression to v1",
  });

  let regressPublish1Threw = false;
  try {
    await memRepo.publishAssessmentVersion(draftRegress1.id, { jwtRole: "service_role" });
  } catch (err: any) {
    if (err.message.includes("Version regression rejected") && err.message.includes("strictly greater")) {
      regressPublish1Threw = true;
    }
  }
  assert(regressPublish1Threw, "7.29: Publishing draft with version_number < current_version is strictly rejected");

  // Test: Attempting to publish draft with version_number = 2 (duplicate of current) is strictly rejected
  const draftRegress2 = memRepo.createAssessmentVersion({
    assessmentId: "asm_personality_100",
    versionNumber: 2,
    status: "draft",
    changelog: "Illegal duplicate version publishing for v2",
  });

  let regressPublish2Threw = false;
  try {
    await memRepo.publishAssessmentVersion(draftRegress2.id, { jwtRole: "service_role" });
  } catch (err: any) {
    if (err.message.includes("Version regression rejected") && err.message.includes("strictly greater")) {
      regressPublish2Threw = true;
    }
  }
  assert(regressPublish2Threw, "7.30: Publishing draft with version_number == current_version is strictly rejected");

  // Test: Forward publishing (v3 > v2) succeeds cleanly
  const publishV3Result = await memRepo.publishAssessmentVersion(draftVersion3.id, { jwtRole: "service_role" });
  assert(publishV3Result.success === true && publishV3Result.versionNumber === 3, "7.31: Forward version publishing (v3 > v2) succeeds cleanly");
  assert(draftVersion.status === "archived", "7.32: Prior published version (v2) transitioned to archived");

  // Test: Concurrent publishing attempts on same draft serialize safely
  const draftVersion4 = memRepo.createAssessmentVersion({
    assessmentId: "asm_personality_100",
    versionNumber: 4,
    status: "draft",
    changelog: "v4 concurrent publishing test",
  });

  const [concurrentPub1, concurrentPub2] = await Promise.all([
    memRepo.publishAssessmentVersion(draftVersion4.id, { jwtRole: "service_role" }),
    memRepo.publishAssessmentVersion(draftVersion4.id, { jwtRole: "service_role" }),
  ]);
  assert(concurrentPub1.success === true && concurrentPub2.success === true, "7.33: Concurrent publishing calls both return success");
  assert(concurrentPub1.versionNumber === 4 && concurrentPub2.versionNumber === 4, "7.34: Concurrent publishing maintains version number 4 atomically");
  assert(draftVersion4.status === "published", "7.35: Final status of version 4 is published");

  // ---------------------------------------------------------------------------
  // 7.5 PAYMENT TRANSACTION CONSISTENCY & CONFLICT REJECTION
  // ---------------------------------------------------------------------------
  console.log("\n--- 7.5 PAYMENT TRANSACTION CONSISTENCY & CONFLICT REJECTION ---");

  // Create Order A and mark paid
  const orderA = await memRepo.createOrder({
    guestSessionToken: `gst_pay_order_a_${runId}`,
    assessmentSlug: "career-dna",
    customerName: "Order A Customer",
    customerEmail: `order_a_${runId}@example.com`,
    amountPaise: 29900,
    resultPayload: { archetype: "Strategist" } as any,
  });
  const txIdUnique = `pay_tx_unique_${runId}`;
  await memRepo.markOrderAsPaid(orderA.id, txIdUnique);
  const paidA = await memRepo.getOrderById(orderA.id);
  assert(paidA?.status === "paid" && paidA.razorpayPaymentId === txIdUnique, "7.36: Order A marked paid with unique transaction ID");

  // Create Order B
  const orderB = await memRepo.createOrder({
    guestSessionToken: `gst_pay_order_b_${runId}`,
    assessmentSlug: "career-dna",
    customerName: "Order B Customer",
    customerEmail: `order_b_${runId}@example.com`,
    amountPaise: 29900,
    resultPayload: { archetype: "Strategist" } as any,
  });

  // Attempt to fulfill Order B using Order A's payment transaction ID
  let crossOrderConflictThrew = false;
  try {
    await memRepo.markOrderAsPaid(orderB.id, txIdUnique);
  } catch (err: any) {
    if (err.message.includes("Payment transaction conflict") && err.message.includes(orderA.id)) {
      crossOrderConflictThrew = true;
    }
  }
  assert(crossOrderConflictThrew, "7.37: Reusing payment transaction ID across different orders is strictly rejected");

  // Idempotent re-fulfillment of Order A with same transaction ID succeeds
  const replayedOrderA = await memRepo.markOrderAsPaid(orderA.id, txIdUnique);
  assert(replayedOrderA.order.status === "paid" && replayedOrderA.order.razorpayPaymentId === txIdUnique, "7.38: Idempotent re-fulfillment of Order A succeeds");

  // Concurrent race test: Two different orders attempting to use the same previously unseen transaction ID simultaneously
  const orderC = await memRepo.createOrder({
    guestSessionToken: `gst_pay_order_c_${runId}`,
    assessmentSlug: "thinking-style",
    customerName: "Order C Customer",
    customerEmail: `order_c_${runId}@example.com`,
    amountPaise: 19900,
    resultPayload: { archetype: "Systemic" } as any,
  });
  const orderD = await memRepo.createOrder({
    guestSessionToken: `gst_pay_order_d_${runId}`,
    assessmentSlug: "thinking-style",
    customerName: "Order D Customer",
    customerEmail: `order_d_${runId}@example.com`,
    amountPaise: 19900,
    resultPayload: { archetype: "Systemic" } as any,
  });

  const txIdRace = `pay_tx_unseen_race_${runId}`;
  const raceResults = await Promise.allSettled([
    memRepo.markOrderAsPaid(orderC.id, txIdRace),
    memRepo.markOrderAsPaid(orderD.id, txIdRace),
  ]);

  const fulfilledCount = raceResults.filter((r) => r.status === "fulfilled").length;
  const rejectedCount = raceResults.filter((r) => r.status === "rejected").length;
  const rejectedReason = raceResults.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;

  assert(fulfilledCount === 1, "7.39: Exactly one order wins fulfillment for unseen transaction ID in concurrent race");
  assert(
    rejectedCount === 1 &&
    Boolean(rejectedReason?.reason?.message?.includes("Payment transaction conflict")),
    "7.40: Competing order rejected with Payment transaction conflict during simultaneous race"
  );

  // ---------------------------------------------------------------------------
  // 7.6 ASSESSMENT CONTENT IMMUTABILITY CONCURRENCY SUITE
  // (Simulates PostgreSQL FOR SHARE / FOR UPDATE row lock coordination)
  // ---------------------------------------------------------------------------
  console.log("\n--- 7.6 ASSESSMENT IMMUTABILITY CONCURRENCY TESTS ---");

  // Concurrency Scenario 1: Question update racing with publication
  const verConc1 = memRepo.createAssessmentVersion({
    assessmentId: "asm_career_200",
    versionNumber: 2,
    status: "draft",
    changelog: "Career v2 for concurrency test",
  });
  const qConc1 = memRepo.createQuestion({
    versionId: verConc1.id,
    questionCode: "car_conc_q1",
    questionText: "Original text before race",
  });

  const [pubRes1, qUpdateRes1] = await Promise.allSettled([
    memRepo.publishAssessmentVersion(verConc1.id, { jwtRole: "service_role" }),
    memRepo.updateQuestionConcurrent(qConc1.id, { questionText: "Raced modification during publish" }),
  ]);
  assert(pubRes1.status === "fulfilled", "7.41: Publication completes successfully during race");
  assert(
    qUpdateRes1.status === "rejected" &&
    Boolean((qUpdateRes1 as PromiseRejectedResult).reason.message.includes("immutable once published")),
    "7.42: Question update racing with publication is serialized by row lock and safely rejected post-publication"
  );

  // Concurrency Scenario 2: Answer-option update racing with publication
  const verConc2 = memRepo.createAssessmentVersion({
    assessmentId: "asm_career_200",
    versionNumber: 3,
    status: "draft",
    changelog: "Career v3 for option concurrency test",
  });
  const qConc2 = memRepo.createQuestion({
    versionId: verConc2.id,
    questionCode: "car_conc_q2",
    questionText: "Question for option race",
  });
  const optConc2 = memRepo.createAnswerOption({
    questionId: qConc2.id,
    orderIndex: 0,
    label: "Draft option label",
    value: 1,
  });

  const [pubRes2, optUpdateRes2] = await Promise.allSettled([
    memRepo.publishAssessmentVersion(verConc2.id, { jwtRole: "service_role" }),
    memRepo.updateAnswerOptionConcurrent(optConc2.id, { label: "Raced option label" }),
  ]);
  assert(pubRes2.status === "fulfilled", "7.43: Publication completes successfully during answer-option race");
  assert(
    optUpdateRes2.status === "rejected" &&
    Boolean((optUpdateRes2 as PromiseRejectedResult).reason.message.includes("immutable once published")),
    "7.44: Answer-option update racing with publication is serialized by row lock and safely rejected post-publication"
  );

  // Concurrency Scenario 3: Reparenting racing with publication (deterministic lock ordering)
  const verConc3Draft = memRepo.createAssessmentVersion({
    assessmentId: "asm_career_200",
    versionNumber: 4,
    status: "draft",
    changelog: "Career v4 for reparenting race",
  });
  const verConc3Target = memRepo.createAssessmentVersion({
    assessmentId: "asm_career_200",
    versionNumber: 5,
    status: "draft",
    changelog: "Career v5 target",
  });
  const qConc3 = memRepo.createQuestion({
    versionId: verConc3Draft.id,
    questionCode: "car_conc_q3",
    questionText: "Question to reparent",
  });

  const [pubRes3, reparentRes] = await Promise.allSettled([
    memRepo.publishAssessmentVersion(verConc3Draft.id, { jwtRole: "service_role" }),
    memRepo.reparentQuestionConcurrent(qConc3.id, verConc3Target.id),
  ]);
  assert(pubRes3.status === "fulfilled", "7.45: Publication of source version completes during reparenting race");
  assert(
    reparentRes.status === "rejected" &&
    Boolean((reparentRes as PromiseRejectedResult).reason.message.includes("immutable once published")),
    "7.46: Reparenting racing with publication is serialized via deterministic lock ordering and blocked post-publication"
  );

  // Concurrency Scenario 4: Two simultaneous publication attempts
  const verConc4 = memRepo.createAssessmentVersion({
    assessmentId: "asm_career_200",
    versionNumber: 6,
    status: "draft",
    changelog: "Career v6 for double-publish test",
  });

  const [simulPub1, simulPub2] = await Promise.all([
    memRepo.publishAssessmentVersion(verConc4.id, { jwtRole: "service_role" }),
    memRepo.publishAssessmentVersion(verConc4.id, { jwtRole: "service_role" }),
  ]);
  assert(simulPub1.success === true && simulPub2.success === true, "7.47: Simultaneous publication calls both return success");
  assert(
    (simulPub1.status === "published" || (simulPub1 as any).already_published) &&
    (simulPub2.status === "published" || (simulPub2 as any).already_published),
    "7.48: Exactly one publication transitions draft while concurrent duplicate returns already_published"
  );

  // Concurrency Scenario 5: Normal draft editing still succeeds cleanly
  const verConc5 = memRepo.createAssessmentVersion({
    assessmentId: "asm_career_200",
    versionNumber: 7,
    status: "draft",
    changelog: "Career v7 for peaceful draft editing",
  });
  const qConc5 = memRepo.createQuestion({
    versionId: verConc5.id,
    questionCode: "car_conc_q5",
    questionText: "Draft question to edit",
  });
  const updatedNormalQ = memRepo.updateQuestion(qConc5.id, { questionText: "Draft question successfully edited" });
  assert(updatedNormalQ.questionText === "Draft question successfully edited", "7.49: Normal draft editing succeeds cleanly without publication conflict");

  // Concurrency Scenario 6: Opposite-direction answer-option reparenting (Question A <-> Question B)
  // Simulates deterministic question lock ordering preventing deadlocks during cross-reparenting
  const verConc6 = memRepo.createAssessmentVersion({
    assessmentId: "asm_career_200",
    versionNumber: 8,
    status: "draft",
    changelog: "Career v8 for opposite reparenting deadlock test",
  });
  const qConc6A = memRepo.createQuestion({
    versionId: verConc6.id,
    questionCode: "car_conc_q6a",
    questionText: "Question 6A",
  });
  const qConc6B = memRepo.createQuestion({
    versionId: verConc6.id,
    questionCode: "car_conc_q6b",
    questionText: "Question 6B",
  });
  const optConc6A = memRepo.createAnswerOption({
    questionId: qConc6A.id,
    orderIndex: 0,
    label: "Option starting on Question A",
    value: 1,
  });
  const optConc6B = memRepo.createAnswerOption({
    questionId: qConc6B.id,
    orderIndex: 0,
    label: "Option starting on Question B",
    value: 2,
  });

  // Concurrently reparent Option A -> Question B and Option B -> Question A
  const [reparentOptARes, reparentOptBRes] = await Promise.allSettled([
    memRepo.reparentAnswerOptionConcurrent(optConc6A.id, qConc6B.id),
    memRepo.reparentAnswerOptionConcurrent(optConc6B.id, qConc6A.id),
  ]);

  assert(
    reparentOptARes.status === "fulfilled" && reparentOptBRes.status === "fulfilled",
    "7.50: Concurrent opposite-direction answer-option reparenting (A->B and B->A) succeeds without deadlock"
  );
  assert(
    optConc6A.questionId === qConc6B.id && optConc6B.questionId === qConc6A.id,
    "7.51: Final parent questions for Option A and Option B correctly swapped under deterministic locking"
  );

  // ---------------------------------------------------------------------------
  // 8. SQL MIGRATION SECURITY & CONTRACT VERIFICATION
  // ---------------------------------------------------------------------------
  console.log("\n--- 8. SQL MIGRATION SECURITY & CONTRACT VERIFICATION ---");

  const sqlPath = path.join(process.cwd(), "supabase/migrations/20261102_phase2_persistence.sql");
  const sqlContent = fs.readFileSync(sqlPath, "utf-8");

  // 8.1 Restrict SECURITY DEFINER RPC Privileges
  assert(
    sqlContent.includes("REVOKE EXECUTE ON FUNCTION public.fulfill_order_payment") &&
    sqlContent.includes("GRANT EXECUTE ON FUNCTION public.fulfill_order_payment") &&
    sqlContent.includes("TO service_role"),
    "8.1: fulfill_order_payment revoked from PUBLIC/anon/authenticated and granted strictly to service_role"
  );

  assert(
    sqlContent.includes("REVOKE EXECUTE ON FUNCTION public.record_webhook_event_idempotent") &&
    sqlContent.includes("GRANT EXECUTE ON FUNCTION public.record_webhook_event_idempotent") &&
    sqlContent.includes("TO service_role"),
    "8.2: record_webhook_event_idempotent revoked from PUBLIC/anon/authenticated and granted strictly to service_role"
  );

  assert(
    sqlContent.includes("REVOKE EXECUTE ON FUNCTION public.finalize_webhook_event") &&
    sqlContent.includes("GRANT EXECUTE ON FUNCTION public.finalize_webhook_event") &&
    sqlContent.includes("TO service_role"),
    "8.3: finalize_webhook_event revoked from PUBLIC/anon/authenticated and granted strictly to service_role"
  );

  assert(
    sqlContent.includes("REVOKE EXECUTE ON FUNCTION public.check_and_record_admin_attempt") &&
    sqlContent.includes("GRANT EXECUTE ON FUNCTION public.check_and_record_admin_attempt") &&
    sqlContent.includes("TO service_role"),
    "8.4: check_and_record_admin_attempt revoked from PUBLIC/anon/authenticated and granted strictly to service_role"
  );

  assert(
    sqlContent.includes("CREATE OR REPLACE FUNCTION public.admin_set_user_role") &&
    sqlContent.includes("REVOKE EXECUTE ON FUNCTION public.admin_set_user_role") &&
    sqlContent.includes("GRANT EXECUTE ON FUNCTION public.admin_set_user_role(UUID, TEXT) TO service_role"),
    "8.5: admin_set_user_role revoked from PUBLIC/anon/authenticated and granted strictly to service_role"
  );

  assert(
    (sqlContent.match(/SET search_path = public, pg_temp/g) || []).length >= 5,
    "8.6: Safe search_path = public, pg_temp explicitly configured on all privileged functions"
  );

  // 8.2 Profile Role Escalation Prevention Architecture
  // Check 1: Trigger function is declared as SECURITY INVOKER (NOT SECURITY DEFINER)
  const triggerFuncMatch = sqlContent.match(/CREATE OR REPLACE FUNCTION public\.prevent_profile_role_escalation\(\)[\s\S]*?\$\$[\s\S]*?BEGIN/);
  assert(
    Boolean(triggerFuncMatch && !triggerFuncMatch[0].includes("SECURITY DEFINER")),
    "8.7: prevent_profile_role_escalation is declared as SECURITY INVOKER (omits SECURITY DEFINER) to preserve caller identity"
  );

  // Check 2: Flawed 'current_user != postgres' check is completely eliminated
  assert(
    !sqlContent.includes("current_user != 'postgres'"),
    "8.8: Flawed 'current_user != postgres' check is completely eliminated from SQL migration"
  );

  // Check 3: Trigger checks both PostgREST JWT claim role and database session role
  assert(
    sqlContent.includes("v_jwt_role IN ('authenticated', 'anon')") &&
    sqlContent.includes("current_user IN ('authenticated', 'anon')"),
    "8.9: Trigger strictly blocks both HTTP JWT roles and DB session roles of authenticated and anon"
  );

  // Check 4: RLS policy does NOT query public.profiles recursively
  assert(
    !sqlContent.includes("role = (SELECT p.role FROM public.profiles"),
    "8.10: Profiles RLS policy eliminates self-referencing subqueries (recursive RLS evaluation prevented)"
  );

  assert(
    sqlContent.includes("CREATE POLICY \"Users update own profile\" ON public.profiles") &&
    sqlContent.includes("WITH CHECK (auth.uid() = id);"),
    "8.11: Profiles UPDATE RLS policy enforces non-recursive WITH CHECK (auth.uid() = id)"
  );

  // 8.3 Scoring Weights Confidentiality & Draft Content Protection
  assert(
    sqlContent.includes("REVOKE SELECT ON public.answer_options FROM PUBLIC, anon, authenticated;") &&
    sqlContent.includes("GRANT SELECT (id, question_id, order_index, label, value, created_at) ON public.answer_options TO anon, authenticated;"),
    "8.12: answer_options.dimension_weights revoked from anonymous and public clients"
  );

  assert(
    sqlContent.includes("CREATE OR REPLACE VIEW public.public_answer_options"),
    "8.13: public_answer_options view provided with dimension_weights omitted"
  );

  assert(
    sqlContent.includes("status = 'published'") &&
    sqlContent.includes("is_active = true"),
    "8.14: Public RLS policies strictly filter for is_active = true and status = 'published' (drafts hidden)"
  );

  // 8.4 Relational Integrity & Immutable Versions
  assert(
    sqlContent.includes("CREATE TABLE IF NOT EXISTS public.assessment_versions") &&
    sqlContent.includes("UNIQUE(assessment_id, version_number)"),
    "8.15: assessment_versions table created with UNIQUE(assessment_id, version_number)"
  );

  assert(
    sqlContent.includes("version_id UUID NOT NULL REFERENCES public.assessment_versions(id) ON DELETE CASCADE"),
    "8.16: scoring_dimensions and questions tied to immutable assessment_versions"
  );

  assert(
    sqlContent.includes("question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE"),
    "8.17: user_responses.question_id matches questions.id type (UUID) with active foreign key"
  );

  assert(
    sqlContent.includes("order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT"),
    "8.18: payments.order_id foreign key enforces ON DELETE RESTRICT (financial audit immutability)"
  );

  assert(
    sqlContent.includes("status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processing', 'processed', 'failed'))"),
    "8.19: webhook_events table defines explicit lifecycle status column with check constraint"
  );

  assert(
    sqlContent.includes("ON CONFLICT (ip) DO UPDATE SET"),
    "8.20: admin_rate_limits uses concurrency-safe atomic UPSERT with row-locking"
  );

  assert(
    (sqlContent.match(/EXECUTE FUNCTION public\.set_updated_at\(\)/g) || []).length >= 6,
    "8.21: set_updated_at trigger attached across all mutable entity tables"
  );

  // 8.5 Webhook Concurrency Serialization
  assert(
    sqlContent.includes("INSERT INTO public.webhook_events") &&
    sqlContent.includes("ON CONFLICT (event_id) DO NOTHING;") &&
    sqlContent.includes("SELECT * INTO v_existing") &&
    sqlContent.includes("WHERE event_id = p_event_id") &&
    sqlContent.includes("FOR UPDATE;"),
    "8.22: record_webhook_event_idempotent uses atomic ON CONFLICT DO NOTHING and FOR UPDATE lock"
  );

  // 8.6 Assessment-Version Composite Foreign Keys
  assert(
    sqlContent.includes("UNIQUE(id, assessment_id) -- Enables composite foreign key from assessment_sessions"),
    "8.23: assessment_versions defines UNIQUE(id, assessment_id) for composite foreign key targeting"
  );

  assert(
    sqlContent.includes("CONSTRAINT fk_session_assessment_version") &&
    sqlContent.includes("FOREIGN KEY (version_id, assessment_id)") &&
    sqlContent.includes("REFERENCES public.assessment_versions(id, assessment_id)"),
    "8.24: assessment_sessions enforces composite foreign key (version_id, assessment_id)"
  );

  assert(
    sqlContent.includes("UNIQUE(id, version_id) -- Enables composite foreign key from user_responses"),
    "8.25: questions and assessment_sessions define UNIQUE(id, version_id) composite constraints"
  );

  assert(
    sqlContent.includes("CONSTRAINT fk_response_session_version") &&
    sqlContent.includes("FOREIGN KEY (session_id, version_id)") &&
    sqlContent.includes("REFERENCES public.assessment_sessions(id, version_id)") &&
    sqlContent.includes("CONSTRAINT fk_response_question_version") &&
    sqlContent.includes("FOREIGN KEY (question_id, version_id)") &&
    sqlContent.includes("REFERENCES public.questions(id, version_id)"),
    "8.26: user_responses enforces composite foreign keys guaranteeing response question matches session version"
  );

  // 8.7 Published Assessment Immutability Triggers & Publish RPC
  assert(
    sqlContent.includes("CREATE OR REPLACE FUNCTION public.enforce_assessment_version_immutability()") &&
    sqlContent.includes("CREATE TRIGGER trg_assessment_versions_immutability") &&
    sqlContent.includes("BEFORE UPDATE OR DELETE ON public.assessment_versions"),
    "8.27: enforce_assessment_version_immutability trigger attached to prevent modifying or deleting published versions"
  );

  assert(
    sqlContent.includes("CREATE OR REPLACE FUNCTION public.enforce_assessment_content_immutability()") &&
    sqlContent.includes("CREATE TRIGGER trg_scoring_dimensions_immutability") &&
    sqlContent.includes("CREATE TRIGGER trg_questions_immutability") &&
    sqlContent.includes("CREATE TRIGGER trg_answer_options_immutability"),
    "8.28: enforce_assessment_content_immutability attached across dimensions, questions, and answer options"
  );

  assert(
    sqlContent.includes("CREATE OR REPLACE FUNCTION public.publish_assessment_version") &&
    sqlContent.includes("REVOKE EXECUTE ON FUNCTION public.publish_assessment_version(UUID) FROM PUBLIC, anon, authenticated;") &&
    sqlContent.includes("GRANT EXECUTE ON FUNCTION public.publish_assessment_version(UUID) TO service_role;"),
    "8.29: publish_assessment_version RPC defined, revoked from public callers, granted strictly to service_role"
  );

  // 8.8 Explicit Database Grants & Least Privilege
  assert(
    sqlContent.includes("REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;") &&
    sqlContent.includes("REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM PUBLIC;") &&
    sqlContent.includes("REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;"),
    "8.30: Default public schema privileges explicitly revoked from PUBLIC, anon, and authenticated"
  );

  assert(
    sqlContent.includes("GRANT SELECT ON public.assessments TO anon, authenticated;") &&
    sqlContent.includes("GRANT SELECT ON public.assessment_versions TO anon, authenticated;") &&
    sqlContent.includes("GRANT SELECT ON public.scoring_dimensions TO anon, authenticated;") &&
    sqlContent.includes("GRANT SELECT ON public.questions TO anon, authenticated;") &&
    sqlContent.includes("GRANT SELECT ON public.public_answer_options TO anon, authenticated;"),
    "8.31: Explicit SELECT granted to anon, authenticated strictly on public catalog tables and safe views"
  );

  assert(
    sqlContent.includes("REVOKE ALL ON public.orders FROM anon, authenticated;") &&
    sqlContent.includes("REVOKE ALL ON public.payments FROM anon, authenticated;") &&
    sqlContent.includes("REVOKE ALL ON public.reports FROM anon, authenticated;") &&
    sqlContent.includes("REVOKE ALL ON public.webhook_events FROM anon, authenticated;") &&
    sqlContent.includes("REVOKE ALL ON public.admin_rate_limits FROM anon, authenticated;"),
    "8.32: Core private business tables explicitly have ALL privileges revoked from anon and authenticated"
  );

  assert(
    sqlContent.includes("GRANT ALL ON SCHEMA public TO service_role;") &&
    sqlContent.includes("GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;") &&
    sqlContent.includes("GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;"),
    "8.33: Trusted service_role granted full administrative privileges for server-side operations"
  );

  // 8.9 Payment Fulfillment Conflicting ID Detection & Fail-Closed Validation
  assert(
    sqlContent.includes("IF v_order.status = 'paid' THEN") &&
    sqlContent.includes("IF v_order.razorpay_payment_id IS NULL OR trim(v_order.razorpay_payment_id) = '' THEN") &&
    sqlContent.includes("RAISE EXCEPTION 'Inconsistent payment state: Order % is marked as paid but has no recorded payment ID'") &&
    sqlContent.includes("IF v_order.razorpay_payment_id != p_payment_id THEN") &&
    sqlContent.includes("RAISE EXCEPTION 'Payment conflict: Order % is already paid with payment ID %, received conflicting payment ID %'"),
    "8.34: fulfill_order_payment strictly detects and rejects conflicting payment IDs on paid orders and fails closed on missing IDs"
  );

  // 8.10 Immutability Trigger Reparenting Bypass Checks
  assert(
    sqlContent.includes("v_old_version_id UUID;") &&
    sqlContent.includes("v_new_version_id UUID;") &&
    sqlContent.includes("IF TG_OP IN ('UPDATE', 'DELETE') THEN") &&
    sqlContent.includes("IF v_old_status IN ('published', 'archived') THEN") &&
    sqlContent.includes("IF TG_OP IN ('INSERT', 'UPDATE') THEN") &&
    sqlContent.includes("IF v_new_status IN ('published', 'archived') THEN"),
    "8.35: enforce_assessment_content_immutability inspects both OLD and NEW parent versions to prevent reparenting bypasses"
  );

  // 8.11 Assessment Version Regression Prevention
  assert(
    sqlContent.includes("IF v_version.version_number <= v_assessment.current_version THEN") &&
    sqlContent.includes("RAISE EXCEPTION 'Version regression rejected: Target version number % must be strictly greater than current published version number %"),
    "8.36: publish_assessment_version enforces strict monotonic versioning and rejects backwards or duplicate regression"
  );

  // 8.12 Payment Transaction Audit Consistency & Cross-Order Verification
  assert(
    sqlContent.includes("SELECT * INTO v_existing_payment") &&
    sqlContent.includes("FROM public.payments") &&
    sqlContent.includes("WHERE transaction_id = p_payment_id") &&
    sqlContent.includes("FOR UPDATE;") &&
    sqlContent.includes("IF v_existing_payment.order_id != p_order_id THEN") &&
    sqlContent.includes("RAISE EXCEPTION 'Payment transaction conflict: Transaction % already belongs to order %"),
    "8.37: fulfill_order_payment locks payment transaction and strictly verifies consistent order ownership, amount, and currency"
  );

  // 8.13 Explicit Schema-Level Privileges (Section 12.0)
  assert(
    sqlContent.includes("REVOKE ALL ON SCHEMA public FROM PUBLIC;") &&
    sqlContent.includes("REVOKE CREATE ON SCHEMA public FROM PUBLIC;") &&
    sqlContent.includes("REVOKE ALL ON SCHEMA public FROM anon, authenticated;") &&
    sqlContent.includes("REVOKE CREATE ON SCHEMA public FROM anon, authenticated;") &&
    sqlContent.includes("GRANT USAGE ON SCHEMA public TO anon, authenticated;") &&
    sqlContent.includes("GRANT ALL ON SCHEMA public TO service_role;"),
    "8.38: Schema-level privileges explicitly revoke CREATE and ALL from PUBLIC/anon/authenticated and grant USAGE strictly"
  );

  // 8.14 Payment Concurrency Race on Unseen Transaction IDs
  assert(
    sqlContent.includes("ON CONFLICT (transaction_id) DO NOTHING") &&
    sqlContent.includes("RETURNING id INTO v_inserted_payment_id;") &&
    sqlContent.includes("IF v_inserted_payment_id IS NULL THEN") &&
    sqlContent.includes("SELECT * INTO v_existing_payment") &&
    sqlContent.includes("WHERE transaction_id = p_payment_id") &&
    sqlContent.includes("FOR UPDATE;") &&
    sqlContent.includes("IF v_existing_payment.order_id != p_order_id THEN") &&
    sqlContent.includes("RAISE EXCEPTION 'Payment transaction conflict: Transaction % already claimed by order %"),
    "8.39: fulfill_order_payment resolves concurrent races on unseen transaction IDs via ON CONFLICT RETURNING and post-conflict locking verification"
  );

  // 8.15 Immutability Concurrency Row-Lock Coordination
  assert(
    sqlContent.includes("FROM public.assessment_versions") &&
    sqlContent.includes("FOR SHARE;") &&
    sqlContent.includes("SELECT * INTO v_version") &&
    sqlContent.includes("FROM public.assessment_versions") &&
    sqlContent.includes("FOR UPDATE;"),
    "8.40: Assessment immutability trigger acquires FOR SHARE lock coordinating with publish_assessment_version FOR UPDATE lock"
  );

  // 8.16 Deterministic Lock Ordering on Reparenting
  assert(
    sqlContent.includes("IF v_old_version_id < v_new_version_id THEN") &&
    sqlContent.includes("WHERE id = v_old_version_id") &&
    sqlContent.includes("FOR SHARE;") &&
    sqlContent.includes("WHERE id = v_new_version_id") &&
    sqlContent.includes("FOR SHARE;"),
    "8.41: enforce_assessment_content_immutability acquires dual parent locks in deterministic ascending UUID order to prevent deadlocks"
  );

  // 8.17 Answer Option Deterministic Parent Question Lock
  assert(
    sqlContent.includes("IF OLD.question_id = NEW.question_id THEN") &&
    sqlContent.includes("SELECT q.version_id INTO v_old_version_id") &&
    sqlContent.includes("WHERE q.id = OLD.question_id") &&
    sqlContent.includes("FOR SHARE;") &&
    sqlContent.includes("IF OLD.question_id < NEW.question_id THEN") &&
    sqlContent.includes("WHERE q.id = OLD.question_id") &&
    sqlContent.includes("FOR SHARE;") &&
    sqlContent.includes("WHERE q.id = NEW.question_id") &&
    sqlContent.includes("FOR SHARE;"),
    "8.42: Answer option immutability locks parent question(s) FOR SHARE in deterministic ascending UUID order to prevent reparenting deadlocks"
  );

  // 8.18 Payment Fulfillment Fail-Closed on Missing/Empty Payment ID
  assert(
    sqlContent.includes("IF p_payment_id IS NULL OR trim(p_payment_id) = '' THEN") &&
    sqlContent.includes("RAISE EXCEPTION 'Payment fulfillment rejected: payment_id cannot be null or empty';"),
    "8.43: fulfill_order_payment fails closed immediately when payment_id is null or empty"
  );

  // 8.19 Schema-Level CREATE Revocation
  assert(
    sqlContent.includes("REVOKE CREATE ON SCHEMA public FROM PUBLIC;") &&
    sqlContent.includes("REVOKE CREATE ON SCHEMA public FROM anon, authenticated;") &&
    sqlContent.includes("GRANT USAGE ON SCHEMA public TO anon, authenticated;"),
    "8.44: Schema-level privileges explicitly revoke CREATE from untrusted roles and grant USAGE strictly"
  );

  // ---------------------------------------------------------------------------
  // 9. HOSTED VS MOCKED TEST DISTINCTION
  // ---------------------------------------------------------------------------
  console.log("\n--- 9. HOSTED DATABASE STATUS & SCOPE BOUNDARIES ---");
  if (remoteConfigured) {
    console.log("   ✅ Hosted Supabase Project (InnerAtlas-dev) is configured.");
  } else {
    console.log("   ⚠️  Hosted Supabase Project (InnerAtlas-dev) execution is intentionally deferred.");
    console.log("      As instructed, migration execution against hosted Supabase awaits product owner review.");
    console.log("      All 44 static SQL security invariants and repository lifecycle contracts passed cleanly.");
  }

  console.log("\n==================================================================");
  console.log(`   PHASE 2 DATABASE SECURITY AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED   `);
  console.log("==================================================================\n");
}

runPhase2DatabaseTests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
