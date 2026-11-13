import crypto from "crypto";
import { getSupabaseAdminClient } from "./server";
import {
  OrderRecord,
  ReportRecord,
  OrderStatus,
  AssessmentSessionRecord,
  WebhookEventRecord,
  WebhookEventStatus,
  WebhookProcessingResult,
  AdminRateLimitRecord,
} from "./types";
import { AssessmentResult } from "@/data/assessments/types";

/**
 * Computes deterministic SHA-256 hash of access tokens.
 * Access tokens are stored ONLY as hashes in the database.
 */
export function hashAccessToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export interface DatabaseRepository {
  createOrder(data: {
    guestSessionToken: string;
    assessmentSlug: string;
    customerName: string;
    customerEmail: string;
    amountPaise: number;
    resultPayload: AssessmentResult;
    razorpayOrderId?: string;
    sessionId?: string;
  }): Promise<OrderRecord>;

  getOrderById(id: string): Promise<OrderRecord | null>;
  getOrderByRazorpayOrderId(rzpOrderId: string): Promise<OrderRecord | null>;
  getAllOrders(): Promise<OrderRecord[]>;
  markOrderAsFailed(orderId: string, reason?: string): Promise<OrderRecord>;
  markOrderAsPaid(
    orderId: string,
    paymentId: string,
    signature?: string
  ): Promise<{ order: OrderRecord; report: ReportRecord; accessToken: string }>;

  getReportByOrderId(orderId: string): Promise<ReportRecord | null>;
  getReportByAccessToken(token: string): Promise<ReportRecord | null>;
  verifyReportToken(orderId: string, token: string): Promise<boolean>;
  incrementReportDownload(reportId: string): Promise<void>;

  isWebhookEventProcessed(eventId: string): Promise<boolean>;
  recordWebhookEvent(eventId: string, eventType: string, payload?: Record<string, any>): Promise<boolean>;
  recordWebhookLifecycle(eventId: string, eventType: string, payload?: Record<string, any>): Promise<WebhookProcessingResult>;
  finalizeWebhookEvent(eventId: string, status: "processed" | "failed", errorMessage?: string): Promise<void>;

  checkAdminRateLimit(ip: string): Promise<{ allowed: boolean; remainingAttempts: number; retryAfterSeconds?: number }>;
  recordAdminAttempt(ip: string, success: boolean): Promise<void>;

  createSession(data: {
    assessmentSlug: string;
    guestSessionToken: string;
    guestEmail?: string;
    guestName?: string;
    assessmentId?: string;
    versionId?: string;
  }): Promise<AssessmentSessionRecord>;
  getSession(guestSessionToken: string): Promise<AssessmentSessionRecord | null>;
  saveResponses(sessionId: string, responses: Array<{ questionId: string; numericValue: number }>): Promise<void>;
  saveCalculatedResult(sessionId: string, result: AssessmentResult): Promise<void>;
}

// ==============================================================================
// 1. SUPABASE POSTGRESQL REPOSITORY
// ==============================================================================

export class SupabasePostgresRepository implements DatabaseRepository {
  private get client() {
    return getSupabaseAdminClient();
  }

  async createOrder(data: {
    guestSessionToken: string;
    assessmentSlug: string;
    customerName: string;
    customerEmail: string;
    amountPaise: number;
    resultPayload: AssessmentResult;
    razorpayOrderId?: string;
    sessionId?: string;
  }): Promise<OrderRecord> {
    const id = "ord_" + crypto.randomBytes(8).toString("hex");
    const orderNumber = "INA-" + Math.floor(100000 + Math.random() * 900000);
    const now = new Date().toISOString();

    const { data: inserted, error } = await this.client
      .from("orders")
      .insert({
        id,
        order_number: orderNumber,
        session_id: data.sessionId || null,
        guest_session_token: data.guestSessionToken,
        assessment_slug: data.assessmentSlug,
        customer_name: data.customerName,
        customer_email: data.customerEmail,
        amount_paise: data.amountPaise,
        currency: "INR",
        status: "created",
        razorpay_order_id: data.razorpayOrderId || null,
        result_payload: data.resultPayload,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error || !inserted) {
      console.error("[SupabaseRepository] Failed to insert order:", error);
      throw new Error(`Database error creating order: ${error?.message || "Unknown error"}`);
    }

    return this.mapOrderFromDb(inserted);
  }

  async getOrderById(id: string): Promise<OrderRecord | null> {
    const { data, error } = await this.client
      .from("orders")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;
    return this.mapOrderFromDb(data);
  }

  async getOrderByRazorpayOrderId(rzpOrderId: string): Promise<OrderRecord | null> {
    const { data, error } = await this.client
      .from("orders")
      .select("*")
      .eq("razorpay_order_id", rzpOrderId)
      .maybeSingle();

    if (error || !data) return null;
    return this.mapOrderFromDb(data);
  }

  async getAllOrders(): Promise<OrderRecord[]> {
    const { data, error } = await this.client
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data.map((d: any) => this.mapOrderFromDb(d));
  }

  async markOrderAsFailed(orderId: string, reason?: string): Promise<OrderRecord> {
    const now = new Date().toISOString();
    const { data, error } = await this.client
      .from("orders")
      .update({
        status: "failed",
        updated_at: now,
      })
      .eq("id", orderId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update order status to failed: ${error?.message}`);
    }

    return this.mapOrderFromDb(data);
  }

  async markOrderAsPaid(
    orderId: string,
    paymentId: string,
    signature?: string
  ): Promise<{ order: OrderRecord; report: ReportRecord; accessToken: string }> {
    const order = await this.getOrderById(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    const reportId = "rep_" + crypto.randomBytes(8).toString("hex");
    const reportCode = "DOSSIER-" + Math.floor(100000 + Math.random() * 900000);
    const plaintextAccessToken = "acc_" + crypto.randomBytes(16).toString("hex");
    const tokenHash = hashAccessToken(plaintextAccessToken);

    // Call atomic PostgreSQL RPC fulfill_order_payment
    try {
      const { data: rpcResult, error: rpcError } = await this.client.rpc("fulfill_order_payment", {
        p_order_id: orderId,
        p_payment_id: paymentId,
        p_signature: signature || "sig_verified",
        p_amount_paise: order.amountPaise,
        p_currency: order.currency,
        p_report_id: reportId,
        p_report_code: reportCode,
        p_access_token_hash: tokenHash,
        p_page_count: 12,
      });

      if (!rpcError && rpcResult?.success) {
        const updatedOrder = await this.getOrderById(orderId);
        const report = await this.getReportByOrderId(orderId);
        return {
          order: updatedOrder!,
          report: report!,
          accessToken: plaintextAccessToken,
        };
      }
    } catch (err) {
      console.warn("[SupabaseRepository] RPC fulfill_order_payment fallback:", err);
    }

    // Sequential fallback if RPC is not installed
    const now = new Date().toISOString();
    const { data: updatedOrderData, error: updateError } = await this.client
      .from("orders")
      .update({
        status: "paid",
        razorpay_payment_id: paymentId,
        signature_verified: true,
        report_code: reportCode,
        updated_at: now,
      })
      .eq("id", orderId)
      .select()
      .single();

    if (updateError || !updatedOrderData) {
      throw new Error(`Failed to update order: ${updateError?.message}`);
    }

    const { data: reportData, error: reportError } = await this.client
      .from("reports")
      .insert({
        id: reportId,
        order_id: orderId,
        report_code: reportCode,
        access_token_hash: tokenHash,
        customer_name: order.customerName,
        customer_email: order.customerEmail,
        assessment_slug: order.assessmentSlug,
        result_payload: order.resultPayload,
        page_count: 12,
        download_count: 0,
        generated_at: now,
      })
      .select()
      .single();

    if (reportError || !reportData) {
      throw new Error(`Failed to generate report record: ${reportError?.message}`);
    }

    // Log transaction in payments table (restricted delete)
    await this.client.from("payments").insert({
      order_id: orderId,
      gateway: "razorpay",
      transaction_id: paymentId,
      amount_paise: order.amountPaise,
      currency: order.currency,
      status: "captured",
      payload: { order_id: orderId, payment_id: paymentId },
      created_at: now,
    });

    return {
      order: this.mapOrderFromDb(updatedOrderData),
      report: this.mapReportFromDb(reportData),
      accessToken: plaintextAccessToken,
    };
  }

  async getReportByOrderId(orderId: string): Promise<ReportRecord | null> {
    const { data, error } = await this.client
      .from("reports")
      .select("*")
      .eq("order_id", orderId)
      .maybeSingle();

    if (error || !data) return null;
    return this.mapReportFromDb(data);
  }

  async getReportByAccessToken(token: string): Promise<ReportRecord | null> {
    const tokenHash = hashAccessToken(token);
    const { data, error } = await this.client
      .from("reports")
      .select("*")
      .eq("access_token_hash", tokenHash)
      .maybeSingle();

    if (error || !data) return null;
    return this.mapReportFromDb(data);
  }

  async verifyReportToken(orderId: string, token: string): Promise<boolean> {
    const report = await this.getReportByOrderId(orderId);
    if (!report) return false;

    const computedHash = hashAccessToken(token);
    const expectedBuf = Buffer.from(report.accessTokenHash, "hex");
    const actualBuf = Buffer.from(computedHash, "hex");

    if (expectedBuf.length !== actualBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, actualBuf);
  }

  async incrementReportDownload(reportId: string): Promise<void> {
    const { data: rep } = await this.client
      .from("reports")
      .select("download_count")
      .eq("id", reportId)
      .maybeSingle();

    if (rep) {
      await this.client
        .from("reports")
        .update({ download_count: (rep.download_count || 0) + 1 })
        .eq("id", reportId);
    }
  }

  async isWebhookEventProcessed(eventId: string): Promise<boolean> {
    const { data, error } = await this.client
      .from("webhook_events")
      .select("status")
      .eq("event_id", eventId)
      .maybeSingle();

    return Boolean(!error && data && data.status === "processed");
  }

  async recordWebhookLifecycle(
    eventId: string,
    eventType: string,
    payload: Record<string, any> = {}
  ): Promise<WebhookProcessingResult> {
    try {
      const { data, error } = await this.client.rpc("record_webhook_event_idempotent", {
        p_event_id: eventId,
        p_event_type: eventType,
        p_payload: payload,
      });

      if (!error && data && typeof data.should_process === "boolean") {
        return {
          shouldProcess: data.should_process,
          status: data.status,
          isRetry: Boolean(data.is_retry),
          retryCount: data.retry_count || 1,
        };
      }
    } catch {
      // Fallback to table insert/select
    }

    const { data: existing } = await this.client
      .from("webhook_events")
      .select("*")
      .eq("event_id", eventId)
      .maybeSingle();

    const now = new Date().toISOString();

    if (!existing) {
      await this.client.from("webhook_events").insert({
        event_id: eventId,
        event_type: eventType,
        status: "processing",
        payload,
        retry_count: 1,
        last_attempt: now,
        created_at: now,
        updated_at: now,
      });
      return { shouldProcess: true, status: "processing", isRetry: false, retryCount: 1 };
    }

    if (existing.status === "processed") {
      return { shouldProcess: false, status: "processed", isRetry: false, retryCount: existing.retry_count };
    }

    const lastAttemptTime = new Date(existing.last_attempt).getTime();
    if (existing.status === "processing" && Date.now() - lastAttemptTime < 2 * 60 * 1000) {
      return { shouldProcess: false, status: "in_flight", isRetry: true, retryCount: existing.retry_count };
    }

    const newRetryCount = (existing.retry_count || 1) + 1;
    await this.client
      .from("webhook_events")
      .update({
        status: "processing",
        retry_count: newRetryCount,
        last_attempt: now,
        updated_at: now,
        error_message: null,
      })
      .eq("event_id", eventId);

    return { shouldProcess: true, status: "processing", isRetry: true, retryCount: newRetryCount };
  }

  async recordWebhookEvent(
    eventId: string,
    eventType: string,
    payload: Record<string, any> = {}
  ): Promise<boolean> {
    const lifecycle = await this.recordWebhookLifecycle(eventId, eventType, payload);
    return lifecycle.shouldProcess;
  }

  async finalizeWebhookEvent(
    eventId: string,
    status: "processed" | "failed",
    errorMessage?: string
  ): Promise<void> {
    try {
      const { error } = await this.client.rpc("finalize_webhook_event", {
        p_event_id: eventId,
        p_status: status,
        p_error: errorMessage || null,
      });
      if (!error) return;
    } catch {
      // Fallback
    }

    const now = new Date().toISOString();
    await this.client
      .from("webhook_events")
      .update({
        status,
        processed_at: status === "processed" ? now : null,
        error_message: errorMessage || null,
        updated_at: now,
      })
      .eq("event_id", eventId);
  }

  async checkAdminRateLimit(ip: string): Promise<{
    allowed: boolean;
    remainingAttempts: number;
    retryAfterSeconds?: number;
  }> {
    const { data, error } = await this.client
      .from("admin_rate_limits")
      .select("*")
      .eq("ip", ip)
      .maybeSingle();

    if (error || !data) {
      return { allowed: true, remainingAttempts: 5 };
    }

    const now = Date.now();
    const lockedUntil = data.locked_until ? new Date(data.locked_until).getTime() : null;

    if (lockedUntil && lockedUntil > now) {
      const retryAfterSeconds = Math.ceil((lockedUntil - now) / 1000);
      return { allowed: false, remainingAttempts: 0, retryAfterSeconds };
    }

    const firstAttempt = data.first_attempt_at
      ? new Date(data.first_attempt_at).getTime()
      : new Date(data.last_attempt_at || data.last_attempt).getTime();

    if (now - firstAttempt > 15 * 60 * 1000) {
      return { allowed: true, remainingAttempts: 5 };
    }

    const remaining = Math.max(0, 5 - data.attempts);
    return { allowed: remaining > 0, remainingAttempts: remaining };
  }

  async recordAdminAttempt(ip: string, success: boolean): Promise<void> {
    try {
      const { error } = await this.client.rpc("check_and_record_admin_attempt", {
        p_ip: ip,
        p_success: success,
      });
      if (!error) return;
    } catch {
      // Fallback
    }

    const now = new Date().toISOString();
    if (success) {
      await this.client.from("admin_rate_limits").delete().eq("ip", ip);
      return;
    }

    const { data: existing } = await this.client
      .from("admin_rate_limits")
      .select("*")
      .eq("ip", ip)
      .maybeSingle();

    if (existing) {
      const attempts = existing.attempts + 1;
      const lockedUntil =
        attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;

      await this.client
        .from("admin_rate_limits")
        .update({
          attempts,
          last_attempt_at: now,
          locked_until: lockedUntil,
          updated_at: now,
        })
        .eq("ip", ip);
    } else {
      await this.client.from("admin_rate_limits").insert({
        ip,
        attempts: 1,
        first_attempt_at: now,
        last_attempt_at: now,
        created_at: now,
        updated_at: now,
      });
    }
  }

  async createSession(data: {
    assessmentSlug: string;
    guestSessionToken: string;
    guestEmail?: string;
    guestName?: string;
    assessmentId?: string;
    versionId?: string;
  }): Promise<AssessmentSessionRecord> {
    const now = new Date().toISOString();
    const { data: session, error } = await this.client
      .from("assessment_sessions")
      .insert({
        assessment_id: data.assessmentId || null,
        version_id: data.versionId || null,
        assessment_slug: data.assessmentSlug,
        guest_session_token: data.guestSessionToken,
        guest_email: data.guestEmail || null,
        guest_name: data.guestName || null,
        status: "in_progress",
        current_question_index: 0,
        started_at: now,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error || !session) {
      throw new Error(`Failed to create assessment session: ${error?.message}`);
    }

    return {
      id: session.id,
      assessmentId: session.assessment_id,
      versionId: session.version_id,
      assessmentSlug: session.assessment_slug,
      guestSessionToken: session.guest_session_token,
      guestEmail: session.guest_email,
      guestName: session.guest_name,
      status: session.status,
      currentQuestionIndex: session.current_question_index,
      startedAt: session.started_at,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
    };
  }

  async getSession(guestSessionToken: string): Promise<AssessmentSessionRecord | null> {
    const { data, error } = await this.client
      .from("assessment_sessions")
      .select("*")
      .eq("guest_session_token", guestSessionToken)
      .maybeSingle();

    if (error || !data) return null;
    return {
      id: data.id,
      assessmentId: data.assessment_id,
      versionId: data.version_id,
      assessmentSlug: data.assessment_slug,
      guestSessionToken: data.guest_session_token,
      guestEmail: data.guest_email,
      guestName: data.guest_name,
      status: data.status,
      currentQuestionIndex: data.current_question_index,
      startedAt: data.started_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async saveResponses(
    sessionId: string,
    responses: Array<{ questionId: string; numericValue: number }>
  ): Promise<void> {
    // Look up question UUID if question_code was provided
    const rows = await Promise.all(
      responses.map(async (r) => {
        let questionUuid = r.questionId;
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(r.questionId);
        if (!isUuid) {
          const { data: q } = await this.client
            .from("questions")
            .select("id")
            .eq("question_code", r.questionId)
            .maybeSingle();
          if (q?.id) {
            questionUuid = q.id;
          }
        }
        return {
          session_id: sessionId,
          question_id: questionUuid,
          numeric_value: r.numericValue,
          created_at: new Date().toISOString(),
        };
      })
    );

    const { error } = await this.client.from("user_responses").upsert(rows, {
      onConflict: "session_id,question_id",
    });

    if (error) {
      throw new Error(`Failed to save responses: ${error.message}`);
    }
  }

  async saveCalculatedResult(sessionId: string, result: AssessmentResult): Promise<void> {
    const { error } = await this.client.from("calculated_results").upsert(
      {
        session_id: sessionId,
        primary_archetype_key: result.primaryArchetype.key,
        primary_archetype_title: result.primaryArchetype.title,
        secondary_archetype_key: result.secondaryArchetype?.key || null,
        secondary_archetype_title: result.secondaryArchetype?.title || null,
        dimension_scores: result.dimensionScores,
        executive_summary: result.executiveSummary,
        preview_data: { synthesis: result.synthesis },
        full_report_data: result,
        calculated_at: new Date().toISOString(),
      },
      { onConflict: "session_id" }
    );

    if (error) {
      throw new Error(`Failed to save calculated result: ${error.message}`);
    }
  }

  private mapOrderFromDb(d: any): OrderRecord {
    return {
      id: d.id,
      orderNumber: d.order_number,
      sessionId: d.session_id,
      guestSessionToken: d.guest_session_token,
      assessmentSlug: d.assessment_slug,
      customerName: d.customer_name,
      customerEmail: d.customer_email,
      amountPaise: d.amount_paise,
      currency: d.currency,
      status: d.status as OrderStatus,
      razorpayOrderId: d.razorpay_order_id,
      razorpayPaymentId: d.razorpay_payment_id,
      signatureVerified: d.signature_verified,
      resultPayload: d.result_payload,
      reportCode: d.report_code,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    };
  }

  private mapReportFromDb(d: any): ReportRecord {
    return {
      id: d.id,
      orderId: d.order_id,
      reportCode: d.report_code,
      accessTokenHash: d.access_token_hash,
      customerName: d.customer_name,
      customerEmail: d.customer_email,
      assessmentSlug: d.assessment_slug,
      resultPayload: d.result_payload,
      pageCount: d.page_count,
      generatedAt: d.generated_at,
      downloadCount: d.download_count,
    };
  }
}

// ==============================================================================
// 2. IN-MEMORY REPOSITORY (For Local Testing & Disconnected Environments)
// ==============================================================================

export class InMemoryRepository implements DatabaseRepository {
  private orders = new Map<string, OrderRecord>();
  private reports = new Map<string, ReportRecord>();
  private webhookEvents = new Map<string, WebhookEventRecord>();
  private adminRateLimits = new Map<string, { attempts: number; firstAttempt: number; lastAttempt: number; lockedUntil?: number }>();
  private sessions = new Map<string, AssessmentSessionRecord>();
  private responses = new Map<string, Array<{ questionId: string; numericValue: number }>>();
  private calculatedResults = new Map<string, AssessmentResult>();

  async createOrder(data: {
    guestSessionToken: string;
    assessmentSlug: string;
    customerName: string;
    customerEmail: string;
    amountPaise: number;
    resultPayload: AssessmentResult;
    razorpayOrderId?: string;
    sessionId?: string;
  }): Promise<OrderRecord> {
    const id = "ord_" + crypto.randomBytes(8).toString("hex");
    const orderNumber = "INA-" + Math.floor(100000 + Math.random() * 900000);
    const now = new Date().toISOString();

    const order: OrderRecord = {
      id,
      orderNumber,
      sessionId: data.sessionId,
      guestSessionToken: data.guestSessionToken,
      assessmentSlug: data.assessmentSlug,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      amountPaise: data.amountPaise,
      currency: "INR",
      status: "created",
      razorpayOrderId: data.razorpayOrderId,
      signatureVerified: false,
      resultPayload: data.resultPayload,
      createdAt: now,
      updatedAt: now,
    };

    this.orders.set(id, order);
    return order;
  }

  async getOrderById(id: string): Promise<OrderRecord | null> {
    return this.orders.get(id) || null;
  }

  async getOrderByRazorpayOrderId(rzpOrderId: string): Promise<OrderRecord | null> {
    return Array.from(this.orders.values()).find((o) => o.razorpayOrderId === rzpOrderId) || null;
  }

  async getAllOrders(): Promise<OrderRecord[]> {
    return Array.from(this.orders.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async markOrderAsFailed(orderId: string): Promise<OrderRecord> {
    const order = this.orders.get(orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);
    order.status = "failed";
    order.updatedAt = new Date().toISOString();
    return order;
  }

  async markOrderAsPaid(
    orderId: string,
    paymentId: string,
    signature?: string
  ): Promise<{ order: OrderRecord; report: ReportRecord; accessToken: string }> {
    const order = this.orders.get(orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);

    const now = new Date().toISOString();
    order.status = "paid";
    order.razorpayPaymentId = paymentId;
    order.signatureVerified = true;
    if (signature) order.razorpaySignature = signature;
    order.updatedAt = now;

    const existingReport = Array.from(this.reports.values()).find((r) => r.orderId === orderId);
    if (existingReport) {
      return { order, report: existingReport, accessToken: order.accessToken || "acc_existing" };
    }

    const reportId = "rep_" + crypto.randomBytes(8).toString("hex");
    const reportCode = "DOSSIER-" + Math.floor(100000 + Math.random() * 900000);
    const plaintextAccessToken = "acc_" + crypto.randomBytes(16).toString("hex");
    const tokenHash = hashAccessToken(plaintextAccessToken);

    const report: ReportRecord = {
      id: reportId,
      orderId: order.id,
      reportCode,
      accessTokenHash: tokenHash,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      assessmentSlug: order.assessmentSlug,
      resultPayload: order.resultPayload,
      pageCount: 12,
      generatedAt: now,
      downloadCount: 0,
    };

    this.reports.set(reportId, report);
    order.reportCode = reportCode;
    order.accessToken = plaintextAccessToken;

    return { order, report, accessToken: plaintextAccessToken };
  }

  async getReportByOrderId(orderId: string): Promise<ReportRecord | null> {
    return Array.from(this.reports.values()).find((r) => r.orderId === orderId) || null;
  }

  async getReportByAccessToken(token: string): Promise<ReportRecord | null> {
    const tokenHash = hashAccessToken(token);
    return Array.from(this.reports.values()).find((r) => r.accessTokenHash === tokenHash) || null;
  }

  async verifyReportToken(orderId: string, token: string): Promise<boolean> {
    const report = await this.getReportByOrderId(orderId);
    if (!report) return false;

    const computedHash = hashAccessToken(token);
    const expectedBuf = Buffer.from(report.accessTokenHash, "hex");
    const actualBuf = Buffer.from(computedHash, "hex");

    if (expectedBuf.length !== actualBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, actualBuf);
  }

  async incrementReportDownload(reportId: string): Promise<void> {
    const rep = this.reports.get(reportId);
    if (rep) {
      rep.downloadCount += 1;
    }
  }

  async isWebhookEventProcessed(eventId: string): Promise<boolean> {
    const evt = this.webhookEvents.get(eventId);
    return Boolean(evt && evt.status === "processed");
  }

  async recordWebhookLifecycle(
    eventId: string,
    eventType: string,
    payload: Record<string, any> = {}
  ): Promise<WebhookProcessingResult> {
    const now = new Date().toISOString();
    const existing = this.webhookEvents.get(eventId);

    if (!existing) {
      const rec: WebhookEventRecord = {
        id: "wh_" + crypto.randomBytes(8).toString("hex"),
        eventId,
        eventType,
        status: "processing",
        payload,
        retryCount: 1,
        lastAttempt: now,
        createdAt: now,
        updatedAt: now,
      };
      this.webhookEvents.set(eventId, rec);
      return { shouldProcess: true, status: "processing", isRetry: false, retryCount: 1 };
    }

    if (existing.status === "processed") {
      return { shouldProcess: false, status: "processed", isRetry: false, retryCount: existing.retryCount };
    }

    const lastAttemptTime = new Date(existing.lastAttempt).getTime();
    if (existing.status === "processing" && Date.now() - lastAttemptTime < 2 * 60 * 1000) {
      return { shouldProcess: false, status: "in_flight", isRetry: true, retryCount: existing.retryCount };
    }

    // Safe retry for failed or timed out processing
    existing.status = "processing";
    existing.retryCount += 1;
    existing.lastAttempt = now;
    existing.updatedAt = now;
    existing.errorMessage = undefined;

    return { shouldProcess: true, status: "processing", isRetry: true, retryCount: existing.retryCount };
  }

  async recordWebhookEvent(
    eventId: string,
    eventType: string,
    payload: Record<string, any> = {}
  ): Promise<boolean> {
    const lifecycle = await this.recordWebhookLifecycle(eventId, eventType, payload);
    return lifecycle.shouldProcess;
  }

  async finalizeWebhookEvent(
    eventId: string,
    status: "processed" | "failed",
    errorMessage?: string
  ): Promise<void> {
    const rec = this.webhookEvents.get(eventId);
    if (rec) {
      rec.status = status;
      rec.errorMessage = errorMessage;
      rec.updatedAt = new Date().toISOString();
      if (status === "processed") {
        rec.processedAt = new Date().toISOString();
      }
    }
  }

  async checkAdminRateLimit(ip: string): Promise<{
    allowed: boolean;
    remainingAttempts: number;
    retryAfterSeconds?: number;
  }> {
    const record = this.adminRateLimits.get(ip);
    const now = Date.now();

    if (!record) {
      return { allowed: true, remainingAttempts: 5 };
    }

    if (record.lockedUntil && record.lockedUntil > now) {
      const retryAfterSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      return { allowed: false, remainingAttempts: 0, retryAfterSeconds };
    }

    if (now - record.firstAttempt > 15 * 60 * 1000) {
      record.attempts = 0;
      record.firstAttempt = now;
      record.lockedUntil = undefined;
      return { allowed: true, remainingAttempts: 5 };
    }

    const remaining = Math.max(0, 5 - record.attempts);
    return { allowed: remaining > 0, remainingAttempts: remaining };
  }

  async recordAdminAttempt(ip: string, success: boolean): Promise<void> {
    const now = Date.now();
    if (success) {
      this.adminRateLimits.delete(ip);
      return;
    }

    const record = this.adminRateLimits.get(ip);
    if (!record) {
      this.adminRateLimits.set(ip, {
        attempts: 1,
        firstAttempt: now,
        lastAttempt: now,
      });
      return;
    }

    // Window expiration check
    if ((record.lockedUntil && record.lockedUntil <= now) || (now - record.firstAttempt > 15 * 60 * 1000)) {
      record.attempts = 1;
      record.firstAttempt = now;
      record.lastAttempt = now;
      record.lockedUntil = undefined;
    } else {
      record.attempts += 1;
      record.lastAttempt = now;
      if (record.attempts >= 5) {
        record.lockedUntil = now + 15 * 60 * 1000;
      }
    }
  }

  async createSession(data: {
    assessmentSlug: string;
    guestSessionToken: string;
    guestEmail?: string;
    guestName?: string;
    assessmentId?: string;
    versionId?: string;
  }): Promise<AssessmentSessionRecord> {
    const now = new Date().toISOString();
    const id = "sess_" + crypto.randomBytes(8).toString("hex");
    const session: AssessmentSessionRecord = {
      id,
      assessmentId: data.assessmentId,
      versionId: data.versionId,
      assessmentSlug: data.assessmentSlug,
      guestSessionToken: data.guestSessionToken,
      guestEmail: data.guestEmail,
      guestName: data.guestName,
      status: "in_progress",
      currentQuestionIndex: 0,
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    this.sessions.set(data.guestSessionToken, session);
    return session;
  }

  async getSession(guestSessionToken: string): Promise<AssessmentSessionRecord | null> {
    return this.sessions.get(guestSessionToken) || null;
  }

  async saveResponses(
    sessionId: string,
    responses: Array<{ questionId: string; numericValue: number }>
  ): Promise<void> {
    this.responses.set(sessionId, responses);
  }

  async saveCalculatedResult(sessionId: string, result: AssessmentResult): Promise<void> {
    this.calculatedResults.set(sessionId, result);
  }
}
