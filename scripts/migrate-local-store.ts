/**
 * INNERATLAS Local Store to Supabase PostgreSQL Migration Utility
 * 
 * Safely imports existing local store.json records to Supabase PostgreSQL.
 * Features:
 * - Dry-run mode (--dry-run)
 * - Idempotent: Skips existing records without overwriting
 * - Automatically hashes access tokens with SHA-256 for database storage
 * - Never prints plaintext tokens or secrets
 * - Never deletes the source store.json file
 */

import fs from "fs";
import path from "path";
import { getSupabaseAdminClient, isSupabaseConfigured } from "../src/lib/supabase/server";
import { hashAccessToken } from "../src/lib/supabase/repository";

const STORE_PATH = path.join(process.cwd(), ".data", "store.json");

interface LocalStoreSchema {
  orders?: Record<string, any>;
  reports?: Record<string, any>;
  processedWebhookEvents?: Record<string, any>;
}

async function runMigration() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log("\n=======================================================");
  console.log("   INNERATLAS LOCAL JSON TO SUPABASE MIGRATION TOOL    ");
  console.log("=======================================================\n");

  if (isDryRun) {
    console.log("🔍 DRY RUN MODE ACTIVATED. No changes will be written to Supabase.\n");
  }

  if (!fs.existsSync(STORE_PATH)) {
    console.log(`ℹ️  No local store found at ${STORE_PATH}. Nothing to migrate.`);
    return;
  }

  if (!isSupabaseConfigured()) {
    console.error("❌ Supabase PostgreSQL is not configured.");
    console.error("   Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your environment.");
    process.exit(1);
  }

  let store: LocalStoreSchema;
  try {
    const raw = fs.readFileSync(STORE_PATH, "utf-8");
    store = JSON.parse(raw);
  } catch (err: any) {
    console.error(`❌ Failed to read or parse ${STORE_PATH}:`, err.message);
    process.exit(1);
  }

  const client = getSupabaseAdminClient();
  const localOrders = Object.values(store.orders || {});
  const localReports = Object.values(store.reports || {});
  const localEvents = Object.values(store.processedWebhookEvents || {});

  console.log(`📊 Local Records Found:`);
  console.log(`   - Orders: ${localOrders.length}`);
  console.log(`   - Reports: ${localReports.length}`);
  console.log(`   - Webhook Events: ${localEvents.length}\n`);

  let ordersMigrated = 0;
  let ordersSkipped = 0;
  let reportsMigrated = 0;
  let reportsSkipped = 0;
  let eventsMigrated = 0;
  let eventsSkipped = 0;

  // 1. Migrate Orders
  console.log("--- 1. Migrating Orders ---");
  for (const order of localOrders) {
    const { data: existing } = await client
      .from("orders")
      .select("id")
      .eq("id", order.id)
      .maybeSingle();

    if (existing) {
      ordersSkipped++;
      continue;
    }

    if (!isDryRun) {
      const { error } = await client.from("orders").insert({
        id: order.id,
        order_number: order.orderNumber,
        session_id: order.sessionId || null,
        guest_session_token: order.guestSessionToken,
        assessment_slug: order.assessmentSlug,
        customer_name: order.customerName,
        customer_email: order.customerEmail,
        amount_paise: order.amountPaise,
        currency: order.currency || "INR",
        status: order.status,
        razorpay_order_id: order.razorpayOrderId || null,
        razorpay_payment_id: order.razorpayPaymentId || null,
        razorpay_signature: order.razorpaySignature || null,
        result_payload: order.resultPayload || {},
        report_code: order.reportCode || null,
        created_at: order.createdAt || new Date().toISOString(),
        updated_at: order.updatedAt || new Date().toISOString(),
      });

      if (error) {
        console.error(`   ❌ Failed to insert order ${order.id}:`, error.message);
        continue;
      }
    }
    ordersMigrated++;
  }
  console.log(`   ✅ Orders: ${ordersMigrated} migrated, ${ordersSkipped} already existed.\n`);

  // 2. Migrate Reports
  console.log("--- 2. Migrating Reports ---");
  for (const report of localReports) {
    const { data: existing } = await client
      .from("reports")
      .select("id")
      .eq("id", report.id)
      .maybeSingle();

    if (existing) {
      reportsSkipped++;
      continue;
    }

    const tokenHash = report.accessTokenHash || (report.accessToken ? hashAccessToken(report.accessToken) : null);
    if (!tokenHash) {
      console.warn(`   ⚠️  Report ${report.id} skipped (missing access token).`);
      continue;
    }

    if (!isDryRun) {
      const { error } = await client.from("reports").insert({
        id: report.id,
        order_id: report.orderId,
        report_code: report.reportCode,
        access_token_hash: tokenHash,
        customer_name: report.customerName,
        customer_email: report.customerEmail,
        assessment_slug: report.assessmentSlug,
        result_payload: report.resultPayload || {},
        page_count: report.pageCount || 12,
        download_count: report.downloadCount || 0,
        generated_at: report.generatedAt || new Date().toISOString(),
      });

      if (error) {
        console.error(`   ❌ Failed to insert report ${report.id}:`, error.message);
        continue;
      }
    }
    reportsMigrated++;
  }
  console.log(`   ✅ Reports: ${reportsMigrated} migrated, ${reportsSkipped} already existed.\n`);

  // 3. Migrate Webhook Events
  console.log("--- 3. Migrating Webhook Events ---");
  for (const evt of localEvents) {
    const eventId = evt.eventId || evt.id;
    if (!eventId) continue;

    const { data: existing } = await client
      .from("webhook_events")
      .select("event_id")
      .eq("event_id", eventId)
      .maybeSingle();

    if (existing) {
      eventsSkipped++;
      continue;
    }

    if (!isDryRun) {
      const { error } = await client.from("webhook_events").insert({
        event_id: eventId,
        event_type: evt.eventType || "unknown",
        payload: evt.payload || {},
        processed_at: evt.processedAt || new Date().toISOString(),
      });

      if (error) {
        console.error(`   ❌ Failed to insert webhook event ${eventId}:`, error.message);
        continue;
      }
    }
    eventsMigrated++;
  }
  console.log(`   ✅ Webhook Events: ${eventsMigrated} migrated, ${eventsSkipped} already existed.\n`);

  console.log("=======================================================");
  console.log(`   MIGRATION COMPLETE ${isDryRun ? "(DRY RUN)" : "(APPLIED)"}`);
  console.log(`   Orders: ${ordersMigrated} | Reports: ${reportsMigrated} | Webhooks: ${eventsMigrated}`);
  console.log(`   Source file ${STORE_PATH} preserved intact.`);
  console.log("=======================================================\n");
}

runMigration().catch((err) => {
  console.error("Migration failed with fatal exception:", err);
  process.exit(1);
});
