import fs from "fs";
import path from "path";
import crypto from "crypto";
import { AssessmentResult } from "@/data/assessments/types";

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
  status: "created" | "processing" | "paid" | "failed" | "refunded";
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  resultPayload: AssessmentResult;
  reportCode?: string;
  accessToken?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportRecord {
  id: string;
  orderId: string;
  reportCode: string;
  accessToken: string;
  customerName: string;
  customerEmail: string;
  assessmentSlug: string;
  resultPayload: AssessmentResult;
  pageCount: number;
  generatedAt: string;
  downloadCount: number;
}

interface LocalStoreSchema {
  orders: Record<string, OrderRecord>;
  reports: Record<string, ReportRecord>;
  processedWebhookEvents?: Record<string, { eventId: string; eventType: string; processedAt: string }>;
  adminLoginAttempts?: Record<string, { attempts: number; lastAttempt: number; lockedUntil?: number }>;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_FILE = path.join(DATA_DIR, "store.json");

function ensureStore(): LocalStoreSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORE_FILE)) {
    const initial: LocalStoreSchema = {
      orders: {},
      reports: {},
      processedWebhookEvents: {},
      adminLoginAttempts: {},
    };
    fs.writeFileSync(STORE_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  try {
    const content = fs.readFileSync(STORE_FILE, "utf-8");
    const parsed = JSON.parse(content);
    if (!parsed.orders) parsed.orders = {};
    if (!parsed.reports) parsed.reports = {};
    if (!parsed.processedWebhookEvents) parsed.processedWebhookEvents = {};
    if (!parsed.adminLoginAttempts) parsed.adminLoginAttempts = {};
    return parsed;
  } catch (err) {
    return {
      orders: {},
      reports: {},
      processedWebhookEvents: {},
      adminLoginAttempts: {},
    };
  }
}

function saveStore(store: LocalStoreSchema): void {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2));
  } catch (err) {
    console.error("Failed to write store.json:", err);
  }
}

export const db = {
  createOrder(data: {
    guestSessionToken: string;
    assessmentSlug: string;
    customerName: string;
    customerEmail: string;
    amountPaise: number;
    resultPayload: AssessmentResult;
    razorpayOrderId?: string;
  }): OrderRecord {
    const store = ensureStore();
    const id = "ord_" + crypto.randomBytes(8).toString("hex");
    const orderNumber = "INA-" + Math.floor(100000 + Math.random() * 900000);
    const now = new Date().toISOString();

    const order: OrderRecord = {
      id,
      orderNumber,
      guestSessionToken: data.guestSessionToken,
      assessmentSlug: data.assessmentSlug,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      amountPaise: data.amountPaise,
      currency: "INR",
      status: "created",
      razorpayOrderId: data.razorpayOrderId,
      resultPayload: data.resultPayload,
      createdAt: now,
      updatedAt: now,
    };

    store.orders[id] = order;
    saveStore(store);
    return order;
  },

  getOrderById(id: string): OrderRecord | null {
    const store = ensureStore();
    return store.orders[id] || null;
  },

  getOrderByRazorpayOrderId(rzpOrderId: string): OrderRecord | null {
    const store = ensureStore();
    return Object.values(store.orders).find((o) => o.razorpayOrderId === rzpOrderId) || null;
  },

  getOrdersByEmail(email: string): OrderRecord[] {
    const store = ensureStore();
    const normalized = email.toLowerCase().trim();
    return Object.values(store.orders).filter((o) => o.customerEmail.toLowerCase().trim() === normalized);
  },

  getAllOrders(): OrderRecord[] {
    const store = ensureStore();
    return Object.values(store.orders).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  markOrderAsFailed(orderId: string, reason?: string): OrderRecord {
    const store = ensureStore();
    const order = store.orders[orderId];
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }
    order.status = "failed";
    order.updatedAt = new Date().toISOString();
    saveStore(store);
    return order;
  },

  markOrderAsPaid(
    orderId: string,
    paymentId: string,
    signature?: string
  ): { order: OrderRecord; report: ReportRecord } {
    const store = ensureStore();
    const order = store.orders[orderId];
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    const now = new Date().toISOString();
    order.status = "paid";
    order.razorpayPaymentId = paymentId;
    if (signature) order.razorpaySignature = signature;
    order.updatedAt = now;

    // Generate Report if not exists
    let report = Object.values(store.reports).find((r) => r.orderId === orderId);
    if (!report) {
      const reportId = "rep_" + crypto.randomBytes(8).toString("hex");
      const reportCode = "DOSSIER-" + Math.floor(100000 + Math.random() * 900000);
      const accessToken = "acc_" + crypto.randomBytes(16).toString("hex");

      report = {
        id: reportId,
        orderId: order.id,
        reportCode,
        accessToken,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        assessmentSlug: order.assessmentSlug,
        resultPayload: order.resultPayload,
        pageCount: 12,
        generatedAt: now,
        downloadCount: 0,
      };

      store.reports[reportId] = report;
      order.reportCode = reportCode;
      order.accessToken = accessToken;
    }

    saveStore(store);
    return { order, report };
  },

  getReportByOrderId(orderId: string): ReportRecord | null {
    const store = ensureStore();
    return Object.values(store.reports).find((r) => r.orderId === orderId) || null;
  },

  getReportByAccessToken(token: string): ReportRecord | null {
    const store = ensureStore();
    return Object.values(store.reports).find((r) => r.accessToken === token) || null;
  },

  incrementReportDownload(reportId: string): void {
    const store = ensureStore();
    if (store.reports[reportId]) {
      store.reports[reportId].downloadCount += 1;
      saveStore(store);
    }
  },

  isWebhookEventProcessed(eventId: string): boolean {
    const store = ensureStore();
    return Boolean(store.processedWebhookEvents && store.processedWebhookEvents[eventId]);
  },

  recordWebhookEvent(eventId: string, eventType: string): void {
    const store = ensureStore();
    if (!store.processedWebhookEvents) store.processedWebhookEvents = {};
    store.processedWebhookEvents[eventId] = {
      eventId,
      eventType,
      processedAt: new Date().toISOString(),
    };
    saveStore(store);
  },

  checkAdminRateLimit(ip: string): { allowed: boolean; remainingAttempts: number; retryAfterSeconds?: number } {
    const store = ensureStore();
    if (!store.adminLoginAttempts) store.adminLoginAttempts = {};
    const record = store.adminLoginAttempts[ip];
    const now = Date.now();

    if (!record) {
      return { allowed: true, remainingAttempts: 5 };
    }

    if (record.lockedUntil && record.lockedUntil > now) {
      const retryAfterSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      return { allowed: false, remainingAttempts: 0, retryAfterSeconds };
    }

    // Reset window after 15 minutes of inactivity
    if (now - record.lastAttempt > 15 * 60 * 1000) {
      record.attempts = 0;
      record.lockedUntil = undefined;
      saveStore(store);
      return { allowed: true, remainingAttempts: 5 };
    }

    const remaining = Math.max(0, 5 - record.attempts);
    return { allowed: remaining > 0, remainingAttempts: remaining };
  },

  recordAdminAttempt(ip: string, success: boolean): void {
    const store = ensureStore();
    if (!store.adminLoginAttempts) store.adminLoginAttempts = {};
    const now = Date.now();

    if (success) {
      // Clear failed attempts on successful login
      delete store.adminLoginAttempts[ip];
      saveStore(store);
      return;
    }

    const record = store.adminLoginAttempts[ip] || { attempts: 0, lastAttempt: now };
    record.attempts += 1;
    record.lastAttempt = now;

    if (record.attempts >= 5) {
      // Lock for 15 minutes
      record.lockedUntil = now + 15 * 60 * 1000;
    }

    store.adminLoginAttempts[ip] = record;
    saveStore(store);
  },
};
