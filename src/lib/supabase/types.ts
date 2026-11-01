import { AssessmentResult } from "@/data/assessments/types";

export type OrderStatus = "created" | "processing" | "paid" | "failed" | "refunded";

export interface OrderRecord {
  id: string;
  orderNumber: string;
  sessionId?: string;
  guestSessionToken: string;
  assessmentSlug: string;
  customerName: string;
  customerEmail: string;
  amountPaise: number;
  currency: string;
  status: OrderStatus;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  resultPayload: AssessmentResult;
  reportCode?: string;
  accessToken?: string; // Plaintext token returned only upon initial creation/payment
  createdAt: string;
  updatedAt: string;
}

export interface ReportRecord {
  id: string;
  orderId: string;
  reportCode: string;
  accessTokenHash: string; // SHA-256 hash
  customerName: string;
  customerEmail: string;
  assessmentSlug: string;
  resultPayload: AssessmentResult;
  pageCount: number;
  generatedAt: string;
  downloadCount: number;
}

export interface WebhookEventRecord {
  id: string;
  eventId: string;
  eventType: string;
  payload: Record<string, any>;
  processedAt: string;
}

export interface AdminRateLimitRecord {
  ip: string;
  attempts: number;
  lastAttempt: string;
  lockedUntil?: string;
}

export interface AssessmentSessionRecord {
  id: string;
  assessmentSlug: string;
  guestSessionToken: string;
  guestEmail?: string;
  guestName?: string;
  status: "in_progress" | "completed" | "abandoned";
  currentQuestionIndex: number;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}
