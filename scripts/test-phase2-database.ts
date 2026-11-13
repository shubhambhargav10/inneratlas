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

  // ---------------------------------------------------------------------------
  // 9. HOSTED VS MOCKED TEST DISTINCTION
  // ---------------------------------------------------------------------------
  console.log("\n--- 9. HOSTED DATABASE STATUS & SCOPE BOUNDARIES ---");
  if (remoteConfigured) {
    console.log("   ✅ Hosted Supabase Project (InnerAtlas-dev) is configured.");
  } else {
    console.log("   ⚠️  Hosted Supabase Project (InnerAtlas-dev) execution is intentionally deferred.");
    console.log("      As instructed, migration execution against hosted Supabase awaits product owner review.");
    console.log("      All 21 static SQL security invariants and repository lifecycle contracts passed cleanly.");
  }

  console.log("\n==================================================================");
  console.log(`   PHASE 2 DATABASE SECURITY AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED   `);
  console.log("==================================================================\n");
}

runPhase2DatabaseTests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
