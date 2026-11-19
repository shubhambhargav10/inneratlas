import {
  DatabaseRepository,
  SupabasePostgresRepository,
  InMemoryRepository,
  hashAccessToken,
  getDeterministicAccessToken,
} from "@/lib/supabase/repository";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  OrderRecord,
  ReportRecord,
  OrderStatus,
  AssessmentSessionRecord,
  ProfileRecord,
  ProfileRole,
} from "@/lib/supabase/types";
import { AssessmentResult } from "@/data/assessments/types";

export type { OrderRecord, ReportRecord, OrderStatus, AssessmentSessionRecord, ProfileRecord, ProfileRole };
export { hashAccessToken, getDeterministicAccessToken };

let postgresRepoInstance: SupabasePostgresRepository | null = null;
let inMemoryRepoInstance: InMemoryRepository | null = null;
let customRepoOverride: DatabaseRepository | null = null;

export function setDatabaseRepositoryOverride(repo: DatabaseRepository | null): void {
  customRepoOverride = repo;
}

export function resetInMemoryRepository(): void {
  inMemoryRepoInstance = new InMemoryRepository();
}

function getActiveRepo(): DatabaseRepository {
  if (customRepoOverride) {
    return customRepoOverride;
  }

  const isProduction = process.env.NODE_ENV === "production";
  const configured = isSupabaseConfigured();

  if (configured) {
    if (!postgresRepoInstance) {
      postgresRepoInstance = new SupabasePostgresRepository();
    }
    return postgresRepoInstance;
  }

  if (isProduction) {
    throw new Error(
      "[FATAL SECURITY ERROR] Supabase PostgreSQL is not configured in production. " +
      "Production deployment strictly requires valid NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. " +
      "Filesystem or in-memory persistence is forbidden in production."
    );
  }

  if (!inMemoryRepoInstance) {
    inMemoryRepoInstance = new InMemoryRepository();
  }
  return inMemoryRepoInstance;
}

/**
 * Universal Database Data-Access Interface.
 * Transparently delegates to Supabase PostgreSQL or isolated test repository.
 * Enforces production fail-closed security.
 */
export const db = {
  createOrder(data: {
    guestSessionToken: string;
    assessmentSlug: string;
    customerName: string;
    customerEmail: string;
    amountPaise: number;
    resultPayload: AssessmentResult;
    razorpayOrderId?: string;
    sessionId?: string;
  }): Promise<OrderRecord> {
    return getActiveRepo().createOrder(data);
  },

  getOrderById(id: string): Promise<OrderRecord | null> {
    return getActiveRepo().getOrderById(id);
  },

  getOrderByRazorpayOrderId(rzpOrderId: string): Promise<OrderRecord | null> {
    return getActiveRepo().getOrderByRazorpayOrderId(rzpOrderId);
  },

  getAllOrders(): Promise<OrderRecord[]> {
    return getActiveRepo().getAllOrders();
  },

  markOrderAsFailed(orderId: string, reason?: string): Promise<OrderRecord> {
    return getActiveRepo().markOrderAsFailed(orderId, reason);
  },

  markOrderAsPaid(
    orderId: string,
    paymentId: string,
    signature?: string
  ): Promise<{ order: OrderRecord; report: ReportRecord; accessToken: string }> {
    return getActiveRepo().markOrderAsPaid(orderId, paymentId, signature);
  },

  getReportByOrderId(orderId: string): Promise<ReportRecord | null> {
    return getActiveRepo().getReportByOrderId(orderId);
  },

  getReportByAccessToken(token: string): Promise<ReportRecord | null> {
    return getActiveRepo().getReportByAccessToken(token);
  },

  verifyReportToken(orderId: string, token: string): Promise<boolean> {
    return getActiveRepo().verifyReportToken(orderId, token);
  },

  incrementReportDownload(reportId: string): Promise<void> {
    return getActiveRepo().incrementReportDownload(reportId);
  },

  isWebhookEventProcessed(eventId: string): Promise<boolean> {
    return getActiveRepo().isWebhookEventProcessed(eventId);
  },

  recordWebhookLifecycle(eventId: string, eventType: string, payload?: Record<string, any>) {
    return getActiveRepo().recordWebhookLifecycle(eventId, eventType, payload);
  },

  finalizeWebhookEvent(eventId: string, status: "processed" | "failed", errorMessage?: string): Promise<void> {
    return getActiveRepo().finalizeWebhookEvent(eventId, status, errorMessage);
  },

  recordWebhookEvent(eventId: string, eventType: string, payload?: Record<string, any>): Promise<boolean> {
    return getActiveRepo().recordWebhookEvent(eventId, eventType, payload);
  },

  checkAdminRateLimit(ip: string): Promise<{
    allowed: boolean;
    remainingAttempts: number;
    retryAfterSeconds?: number;
  }> {
    return getActiveRepo().checkAdminRateLimit(ip);
  },

  recordAdminAttempt(ip: string, success: boolean): Promise<void> {
    return getActiveRepo().recordAdminAttempt(ip, success);
  },

  createSession(data: {
    assessmentSlug: string;
    guestSessionToken: string;
    guestEmail?: string;
    guestName?: string;
  }): Promise<AssessmentSessionRecord> {
    return getActiveRepo().createSession(data);
  },

  getSession(guestSessionToken: string): Promise<AssessmentSessionRecord | null> {
    return getActiveRepo().getSession(guestSessionToken);
  },

  saveResponses(
    sessionId: string,
    responses: Array<{ questionId: string; numericValue: number }>
  ): Promise<void> {
    return getActiveRepo().saveResponses(sessionId, responses);
  },

  saveCalculatedResult(sessionId: string, result: AssessmentResult): Promise<void> {
    return getActiveRepo().saveCalculatedResult(sessionId, result);
  },

  getProfile(userId: string): Promise<ProfileRecord | null> {
    return getActiveRepo().getProfile(userId);
  },

  createProfile(data: { id: string; email: string; fullName?: string; avatarUrl?: string; role?: ProfileRole }): Promise<ProfileRecord> {
    return getActiveRepo().createProfile(data);
  },

  updateProfile(
    userId: string,
    updates: { fullName?: string; avatarUrl?: string; role?: ProfileRole },
    callerContext?: { jwtRole?: string; userId?: string }
  ): Promise<ProfileRecord> {
    return getActiveRepo().updateProfile(userId, updates, callerContext);
  },

  adminSetUserRole(
    userId: string,
    newRole: ProfileRole,
    callerContext?: { jwtRole?: string }
  ): Promise<ProfileRecord> {
    return getActiveRepo().adminSetUserRole(userId, newRole, callerContext);
  },

  publishAssessmentVersion(
    versionId: string,
    callerContext?: { jwtRole?: string }
  ): Promise<{ success: boolean; versionId: string; versionNumber: number; status: string }> {
    const repo = getActiveRepo();
    if (repo.publishAssessmentVersion) {
      return repo.publishAssessmentVersion(versionId, callerContext);
    }
    throw new Error("publishAssessmentVersion not supported on active repository");
  },
};
