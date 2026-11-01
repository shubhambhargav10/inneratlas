/**
 * INNERATLAS Master Security Verification Suite (Phase 1)
 * Tests actual API Route Handlers against real HTTP requests, headers, and payloads.
 */

import { NextRequest } from "next/server";
import { POST as createOrderPOST } from "../src/app/api/payments/create-order/route";
import { POST as verifySignaturePOST } from "../src/app/api/payments/verify-signature/route";
import { POST as webhookPOST } from "../src/app/api/payments/webhook/route";
import { GET as downloadGET } from "../src/app/api/reports/[orderId]/download/route";
import { GET as userReportsGET } from "../src/app/api/user/reports/route";
import { POST as adminMetricsPOST } from "../src/app/api/admin/metrics/route";
import { db } from "../src/lib/db/store";
import { personalityArchetypeAssessment } from "../src/data/assessments/personality-archetype";
import { calculateAssessmentResult } from "../src/lib/scoring/engine";
import crypto from "crypto";

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

async function runSecuritySuite() {
  console.log("\n==================================================================");
  console.log("   INNERATLAS PHASE 1: HTTP API ROUTE SECURITY AUDIT TEST SUITE   ");
  console.log("==================================================================\n");

  const testSecret = "test_rzp_secret_key_12345678901234567890";
  process.env.RAZORPAY_KEY_ID = "rzp_test_valid_key_id";
  process.env.RAZORPAY_KEY_SECRET = testSecret;
  process.env.RAZORPAY_WEBHOOK_SECRET = "test_webhook_secret_key_987654321012345";
  process.env.ADMIN_SECRET_KEY = "test_admin_super_secret_key_configured_32_chars";
  process.env.ENABLE_MOCK_PAYMENTS = "false"; // Mock payments strictly disabled by default
  (process.env as any).NODE_ENV = "test";

  // Setup valid baseline assessment result & order
  const sampleAnswers: Record<string, number> = {};
  personalityArchetypeAssessment.questions.forEach((q) => { sampleAnswers[q.id] = 4; });
  const resultPayload = calculateAssessmentResult({
    assessment: personalityArchetypeAssessment,
    answers: sampleAnswers,
  });

  const runId = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  const testRzpOrderId = `order_rzp_real_${runId}`;

  // ---------------------------------------------------------------------------
  // 1. PAYMENTS SECURITY AUDIT (10 Scenarios)
  // ---------------------------------------------------------------------------
  console.log("--- 1. PAYMENTS SECURITY TESTS ---");

  // Create baseline order in DB
  const testOrder = await db.createOrder({
    guestSessionToken: `gst_sec_test_${runId}`,
    assessmentSlug: "personality-archetype",
    customerName: "Aanya Sharma",
    customerEmail: "aanya@example.com",
    amountPaise: 19900,
    resultPayload,
    razorpayOrderId: testRzpOrderId,
  });

  // Test P1: Client sends `isMockVerification: true` to bypass verification
  {
    const req = new NextRequest("http://localhost:3000/api/payments/verify-signature", {
      method: "POST",
      body: JSON.stringify({
        orderId: testOrder.id,
        razorpayOrderId: testRzpOrderId,
        razorpayPaymentId: "pay_fake_bypass_attempt",
        razorpaySignature: "mock_signature_verified",
        isMockVerification: true, // Attacker attempt to bypass
      }),
    });
    const res = await verifySignaturePOST(req);
    assert(res.status === 400, "P1: Rejects client-supplied isMockVerification flag with 400");
    const json = await res.json();
    assert(json.error.includes("signature"), "P1: Fails on signature verification, not bypassing");
  }

  // Test P2: Missing payment signature
  {
    const req = new NextRequest("http://localhost:3000/api/payments/verify-signature", {
      method: "POST",
      body: JSON.stringify({
        orderId: testOrder.id,
        razorpayOrderId: testRzpOrderId,
        razorpayPaymentId: "pay_test_001",
      }),
    });
    const res = await verifySignaturePOST(req);
    assert(res.status === 400, "P2: Rejects missing signature with 400 Bad Request");
  }

  // Test P3: Invalid payment signature (tampered hash)
  {
    const fakeSignature = crypto.randomBytes(32).toString("hex"); // 64 chars hex but invalid HMAC
    const req = new NextRequest("http://localhost:3000/api/payments/verify-signature", {
      method: "POST",
      body: JSON.stringify({
        orderId: testOrder.id,
        razorpayOrderId: testRzpOrderId,
        razorpayPaymentId: "pay_test_001",
        razorpaySignature: fakeSignature,
      }),
    });
    const res = await verifySignaturePOST(req);
    assert(res.status === 400, "P3: Rejects invalid payment signature with 400");
    const json = await res.json();
    assert(json.error.includes("verification failed"), "P3: Correct signature verification failure message");
  }

  // Test P4: Wrong Razorpay order ID (signature generated for different order)
  {
    const otherOrderId = `order_rzp_other_victim_${runId}`;
    const paymentId = "pay_test_001";
    const signatureForOther = crypto
      .createHmac("sha256", testSecret)
      .update(`${otherOrderId}|${paymentId}`)
      .digest("hex");

    const req = new NextRequest("http://localhost:3000/api/payments/verify-signature", {
      method: "POST",
      body: JSON.stringify({
        orderId: testOrder.id, // Target order
        razorpayOrderId: otherOrderId, // Mismatched Razorpay order
        razorpayPaymentId: paymentId,
        razorpaySignature: signatureForOther,
      }),
    });
    const res = await verifySignaturePOST(req);
    assert(res.status === 400, "P4: Rejects mismatched Razorpay order ID with 400");
    const json = await res.json();
    assert(json.error.includes("mismatch"), "P4: Identifies order ID mismatch");
  }

  // Test P5 & P6: Webhook rejects incorrect payment amount and currency
  {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!;
    const tamperedPayload = JSON.stringify({
      event: "payment.captured",
      id: `evt_tampered_amount_${runId}`,
      payload: {
        payment: {
          entity: {
            id: `pay_tampered_${runId}`,
            order_id: testRzpOrderId,
            amount: 100, // 1 INR instead of 19900 paise (199 INR)
            currency: "INR",
            status: "captured",
          },
        },
      },
    });
    const validSig = crypto.createHmac("sha256", webhookSecret).update(tamperedPayload).digest("hex");

    const req = new NextRequest("http://localhost:3000/api/payments/webhook", {
      method: "POST",
      headers: { "x-razorpay-signature": validSig },
      body: tamperedPayload,
    });
    const res = await webhookPOST(req);
    assert(res.status === 400, "P5: Webhook rejects tampered payment amount with 400 Bad Request");
    const json = await res.json();
    assert(json.error.includes("amount mismatch"), "P5: Error identifies amount mismatch");
  }

  // Test P6: Webhook rejects incorrect currency
  {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!;
    const tamperedCurrencyPayload = JSON.stringify({
      event: "payment.captured",
      id: `evt_tampered_currency_${runId}`,
      payload: {
        payment: {
          entity: {
            id: `pay_tampered_curr_${runId}`,
            order_id: testRzpOrderId,
            amount: 19900,
            currency: "USD", // Mismatched currency
            status: "captured",
          },
        },
      },
    });
    const validSig = crypto.createHmac("sha256", webhookSecret).update(tamperedCurrencyPayload).digest("hex");

    const req = new NextRequest("http://localhost:3000/api/payments/webhook", {
      method: "POST",
      headers: { "x-razorpay-signature": validSig },
      body: tamperedCurrencyPayload,
    });
    const res = await webhookPOST(req);
    assert(res.status === 400, "P6: Webhook rejects mismatched currency with 400 Bad Request");
  }

  // Test P7: Failed payment event does NOT unlock report
  {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!;
    const failedPayload = JSON.stringify({
      event: "payment.failed",
      id: `evt_payment_failed_${runId}`,
      payload: {
        payment: {
          entity: {
            id: `pay_failed_${runId}`,
            order_id: testRzpOrderId,
            amount: 19900,
            currency: "INR",
            status: "failed",
          },
        },
      },
    });
    const validSig = crypto.createHmac("sha256", webhookSecret).update(failedPayload).digest("hex");

    const req = new NextRequest("http://localhost:3000/api/payments/webhook", {
      method: "POST",
      headers: { "x-razorpay-signature": validSig },
      body: failedPayload,
    });
    const res = await webhookPOST(req);
    assert(res.status === 200, "P7: Webhook acknowledges failed payment event");
    const updatedOrder = await db.getOrderById(testOrder.id);
    assert(updatedOrder?.status === "failed", "P7: Order status marked as failed");
    assert(!updatedOrder?.accessToken, "P7: No access token or report issued for failed payment");
  }

  // Test P8: Duplicate webhook event deduplication
  {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!;
    const duplicateEvtId = `evt_valid_capture_unique_${runId}`;
    const validCapturePayload = JSON.stringify({
      event: "payment.captured",
      id: duplicateEvtId,
      payload: {
        payment: {
          entity: {
            id: `pay_valid_${runId}`,
            order_id: testRzpOrderId,
            amount: 19900,
            currency: "INR",
            status: "captured",
          },
        },
      },
    });
    const validSig = crypto.createHmac("sha256", webhookSecret).update(validCapturePayload).digest("hex");

    // First delivery
    const req1 = new NextRequest("http://localhost:3000/api/payments/webhook", {
      method: "POST",
      headers: { "x-razorpay-signature": validSig },
      body: validCapturePayload,
    });
    const res1 = await webhookPOST(req1);
    assert(res1.status === 200, "P8: First webhook delivery processed successfully");

    // Duplicate delivery with same event ID
    const req2 = new NextRequest("http://localhost:3000/api/payments/webhook", {
      method: "POST",
      headers: { "x-razorpay-signature": validSig },
      body: validCapturePayload,
    });
    const res2 = await webhookPOST(req2);
    assert(res2.status === 200, "P8: Duplicate webhook acknowledged without re-executing");
    const json2 = await res2.json();
    assert(json2.status === "already_processed", "P8: Correctly flagged as already_processed");
  }

  // Test P9: Duplicate fulfillment check in verify-signature (idempotency)
  {
    const updatedOrder = (await db.getOrderById(testOrder.id))!;
    const paymentId = updatedOrder.razorpayPaymentId || "pay_valid_001";
    const sig = crypto
      .createHmac("sha256", testSecret)
      .update(`${testOrder.razorpayOrderId}|${paymentId}`)
      .digest("hex");

    const req = new NextRequest("http://localhost:3000/api/payments/verify-signature", {
      method: "POST",
      body: JSON.stringify({
        orderId: testOrder.id,
        razorpayOrderId: testOrder.razorpayOrderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: sig,
      }),
    });
    const res = await verifySignaturePOST(req);
    assert(res.status === 200, "P9: Idempotent verification returns 200");
    const json = await res.json();
    assert(json.alreadyProcessed === true, "P9: Correctly identifies alreadyProcessed");
  }

  // Test P10: Missing payment configuration in production fails closed
  {
    const unpaidOrderForP10 = await db.createOrder({
      guestSessionToken: `gst_p10_${runId}`,
      assessmentSlug: "personality-archetype",
      customerName: "Pending User",
      customerEmail: "pending@example.com",
      amountPaise: 19900,
      resultPayload,
      razorpayOrderId: `order_rzp_p10_${runId}`,
    });

    const origEnv = process.env.NODE_ENV;
    const origSecret = process.env.RAZORPAY_KEY_SECRET;
    try {
      (process.env as any).NODE_ENV = "production";
      process.env.RAZORPAY_KEY_SECRET = "";

      const req = new NextRequest("http://localhost:3000/api/payments/verify-signature", {
        method: "POST",
        body: JSON.stringify({
          orderId: unpaidOrderForP10.id,
          razorpayOrderId: unpaidOrderForP10.razorpayOrderId,
          razorpayPaymentId: "pay_test",
          razorpaySignature: "a".repeat(64),
        }),
      });
      const res = await verifySignaturePOST(req);
      assert(res.status === 500, "P10: Missing gateway secret in production fails closed with 500");
    } finally {
      (process.env as any).NODE_ENV = origEnv;
      process.env.RAZORPAY_KEY_SECRET = origSecret;
    }
  }

  // ---------------------------------------------------------------------------
  // 2. REPORT ACCESS AUTHORIZATION (6 Scenarios)
  // ---------------------------------------------------------------------------
  console.log("\n--- 2. REPORT DOWNLOAD AUTHORIZATION TESTS ---");

  const paidOrder = (await db.getOrderById(testOrder.id))!;
  const fulfillment = await db.markOrderAsPaid(testOrder.id, "pay_valid_001", "sig_valid_001");
  const validToken = fulfillment.accessToken;

  // Create an unpaid order for testing
  const unpaidOrder = await db.createOrder({
    guestSessionToken: "gst_unpaid_test",
    assessmentSlug: "personality-archetype",
    customerName: "Unpaid User",
    customerEmail: "unpaid@example.com",
    amountPaise: 19900,
    resultPayload,
    razorpayOrderId: "order_unpaid_001",
  });

  // Test R1: Missing access token returns 401
  {
    const req = new NextRequest(`http://localhost:3000/api/reports/${paidOrder.id}/download`);
    const res = await downloadGET(req, { params: { orderId: paidOrder.id } });
    assert(res.status === 401, "R1: Missing access token returns 401 Unauthorized");
    assert(res.headers.get("Cache-Control")?.includes("no-store"), "R1: Sets no-store cache header");
    assert(res.headers.get("Referrer-Policy") === "no-referrer", "R1: Sets no-referrer header");
  }

  // Test R2: Incorrect access token returns 401
  {
    const req = new NextRequest(`http://localhost:3000/api/reports/${paidOrder.id}/download?token=acc_wrong_invalid_token_99`);
    const res = await downloadGET(req, { params: { orderId: paidOrder.id } });
    assert(res.status === 401, "R2: Incorrect access token returns 401 Unauthorized");
  }

  // Test R3: Valid token for unpaid order returns 403
  {
    const req = new NextRequest(`http://localhost:3000/api/reports/${unpaidOrder.id}/download?token=acc_some_token`);
    const res = await downloadGET(req, { params: { orderId: unpaidOrder.id } });
    assert(res.status === 403, "R3: Unpaid order returns 403 Forbidden");
  }

  // Test R4: Valid token for paid order returns 200 with PDF buffer and headers
  {
    const req = new NextRequest(`http://localhost:3000/api/reports/${paidOrder.id}/download?token=${validToken}`);
    const res = await downloadGET(req, { params: { orderId: paidOrder.id } });
    assert(res.status === 200, "R4: Authorized download returns 200 OK");
    assert(res.headers.get("Content-Type") === "application/pdf", "R4: Content-Type is application/pdf");
    assert(res.headers.get("Cache-Control")?.includes("no-store"), "R4: Cache-Control is strictly no-store");
    assert(res.headers.get("X-Robots-Tag")?.includes("noindex"), "R4: X-Robots-Tag blocks search indexing");
    const arrayBuffer = await res.arrayBuffer();
    assert(arrayBuffer.byteLength > 10000, "R4: PDF binary buffer is populated");
  }

  // Test R5: Non-existent order ID returns 404
  {
    const req = new NextRequest(`http://localhost:3000/api/reports/ord_non_existent_id/download?token=${validToken}`);
    const res = await downloadGET(req, { params: { orderId: "ord_non_existent_id" } });
    assert(res.status === 404, "R5: Non-existent order ID returns 404 Not Found");
  }

  // Test R6: Cross-customer token reuse (Customer A's token on Customer B's order)
  {
    const victimOrder = await db.createOrder({
      guestSessionToken: "gst_victim_01",
      assessmentSlug: "career-dna",
      customerName: "Victim Customer",
      customerEmail: "victim@example.com",
      amountPaise: 19900,
      resultPayload,
      razorpayOrderId: "order_victim_01",
    });
    await db.markOrderAsPaid(victimOrder.id, "pay_victim_01", "sig_victim");

    // Attacker uses validToken from testOrder to attempt access to victimOrder
    const req = new NextRequest(`http://localhost:3000/api/reports/${victimOrder.id}/download?token=${validToken}`);
    const res = await downloadGET(req, { params: { orderId: victimOrder.id } });
    assert(res.status === 401, "R6: Cross-order token reuse is rejected with 401 Unauthorized");
  }

  // ---------------------------------------------------------------------------
  // 3. CUSTOMER PRIVACY & ENUMERATION TESTS (3 Scenarios)
  // ---------------------------------------------------------------------------
  console.log("\n--- 3. CUSTOMER PRIVACY & ENUMERATION TESTS ---");

  // Test CP1: Unauthenticated email lookup is completely disabled
  {
    const req = new NextRequest("http://localhost:3000/api/user/reports?email=aanya@example.com");
    const res = await userReportsGET(req);
    assert(res.status === 403, "CP1: Unauthenticated email lookup returns 403 Forbidden");
  }

  // Test CP2: Attempt to retrieve another customer's report by email
  {
    const req = new NextRequest("http://localhost:3000/api/user/reports?email=victim@example.com");
    const res = await userReportsGET(req);
    assert(res.status === 403, "CP2: Victim email lookup is blocked with 403");
  }

  // Test CP3: No raw access tokens exposed in responses
  {
    const req = new NextRequest("http://localhost:3000/api/user/reports?email=aanya@example.com");
    const res = await userReportsGET(req);
    const text = await res.text();
    assert(!text.includes("acc_"), "CP3: Zero raw access tokens disclosed");
    assert(!text.includes("resultPayload"), "CP3: Zero personal results disclosed");
  }

  // ---------------------------------------------------------------------------
  // 4. ADMIN PORTAL SECURITY (4 Scenarios)
  // ---------------------------------------------------------------------------
  console.log("\n--- 4. ADMIN PORTAL SECURITY TESTS ---");

  // Test A1: Missing admin secret in environment fails closed (500)
  {
    const origAdminKey = process.env.ADMIN_SECRET_KEY;
    try {
      process.env.ADMIN_SECRET_KEY = "";
      const req = new NextRequest("http://localhost:3000/api/admin/metrics", {
        method: "POST",
        body: JSON.stringify({ secretKey: "some_key" }),
      });
      const res = await adminMetricsPOST(req);
      assert(res.status === 500, "A1: Unconfigured admin secret fails closed with 500");
    } finally {
      process.env.ADMIN_SECRET_KEY = origAdminKey;
    }
  }

  // Test A2: Incorrect authentication credentials return 401
  {
    const req = new NextRequest("http://localhost:3000/api/admin/metrics", {
      method: "POST",
      body: JSON.stringify({ secretKey: "wrong_password_attempt" }),
    });
    const res = await adminMetricsPOST(req);
    assert(res.status === 401, "A2: Incorrect admin key returns 401 Unauthorized");
  }

  // Test A3: Empty/Unauthorized API request returns 400 or 401
  {
    const req = new NextRequest("http://localhost:3000/api/admin/metrics", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await adminMetricsPOST(req);
    assert(res.status === 400 || res.status === 401, "A3: Empty body rejected with 400 or 401");
  }

  // Test A4: Valid administrator authentication returns 200 with sanitized data
  {
    const req = new NextRequest("http://localhost:3000/api/admin/metrics", {
      method: "POST",
      body: JSON.stringify({ secretKey: process.env.ADMIN_SECRET_KEY }),
    });
    const res = await adminMetricsPOST(req);
    assert(res.status === 200, "A4: Valid admin key returns 200 OK");
    const json = await res.json();
    assert(json.metrics !== undefined, "A4: Metrics payload populated");
    assert(json.orders !== undefined, "A4: Orders list populated");
    // Verify sanitization: NO access tokens in admin orders list!
    const hasExposedTokens = json.orders.some((o: any) => o.accessToken !== undefined || o.guestSessionToken !== undefined);
    assert(!hasExposedTokens, "A4: Admin orders list is sanitized (no accessToken or guestSessionToken)");
  }

  console.log("\n==================================================================");
  console.log(`   SECURITY AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED   `);
  console.log("==================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runSecuritySuite().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
