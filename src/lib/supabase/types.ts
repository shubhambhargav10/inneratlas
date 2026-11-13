import { AssessmentResult } from "@/data/assessments/types";

export type OrderStatus = "created" | "processing" | "paid" | "failed" | "refunded";

export type ProfileRole = "user" | "admin" | "super_admin";

export interface ProfileRecord {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  role: ProfileRole;
  createdAt: string;
  updatedAt: string;
}

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
  signatureVerified?: boolean;
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
  accessTokenHash: string; // Cryptographic SHA-256 hash
  customerName: string;
  customerEmail: string;
  assessmentSlug: string;
  resultPayload: AssessmentResult;
  pageCount: number;
  generatedAt: string;
  downloadCount: number;
}

export type WebhookEventStatus = "received" | "processing" | "processed" | "failed";

export interface WebhookEventRecord {
  id: string;
  eventId: string;
  eventType: string;
  status: WebhookEventStatus;
  payload: Record<string, any>;
  errorMessage?: string;
  retryCount: number;
  lastAttempt: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookProcessingResult {
  shouldProcess: boolean;
  status: WebhookEventStatus | "in_flight";
  isRetry: boolean;
  retryCount: number;
}

export interface AdminRateLimitRecord {
  ip: string;
  attempts: number;
  firstAttemptAt: string;
  lastAttemptAt: string;
  lockedUntil?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentRecord {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  category: "Personality" | "Career" | "Cognitive";
  currentVersion: number;
  estimatedMinutes: number;
  priceInr: number;
  comparePriceInr: number;
  isActive: boolean;
  displayOrder: number;
  coverImage?: string;
  badgeLabel?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentVersionRecord {
  id: string;
  assessmentId: string;
  versionNumber: number;
  status: "draft" | "published" | "archived";
  changelog?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScoringDimensionRecord {
  id: string;
  versionId: string;
  key: string;
  name: string;
  description: string;
  lowLabel: string;
  highLabel: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionRecord {
  id: string;
  versionId: string;
  questionCode: string;
  orderIndex: number;
  questionText: string;
  contextHint?: string;
  questionType: "likert_5" | "single_choice";
  createdAt: string;
  updatedAt: string;
}

export interface AnswerOptionRecord {
  id: string;
  questionId: string;
  orderIndex: number;
  label: string;
  value: number;
  dimensionWeights?: Record<string, number>; // Confidential internal scoring weights
  createdAt: string;
}

export interface AssessmentSessionRecord {
  id: string;
  assessmentId?: string;
  versionId?: string;
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
