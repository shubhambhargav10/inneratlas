"use client";

export interface StoredSession {
  assessmentSlug: string;
  guestSessionToken: string;
  answers: Record<string, number>;
  currentQuestionIndex: number;
  lastUpdated: string;
  isCompleted: boolean;
}

const STORAGE_PREFIX = "inneratlas_session_";

export function generateSessionToken(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "gst_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

export function getStoredSession(assessmentSlug: string): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${assessmentSlug}`);
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch (err) {
    console.warn("Failed to read stored session:", err);
    return null;
  }
}

export function saveStoredSession(
  assessmentSlug: string,
  answers: Record<string, number>,
  currentQuestionIndex: number,
  isCompleted: boolean = false
): StoredSession {
  if (typeof window === "undefined") {
    return {
      assessmentSlug,
      guestSessionToken: "mock_token",
      answers,
      currentQuestionIndex,
      lastUpdated: new Date().toISOString(),
      isCompleted,
    };
  }

  const existing = getStoredSession(assessmentSlug);
  const session: StoredSession = {
    assessmentSlug,
    guestSessionToken: existing?.guestSessionToken || generateSessionToken(),
    answers,
    currentQuestionIndex,
    lastUpdated: new Date().toISOString(),
    isCompleted,
  };

  try {
    localStorage.setItem(`${STORAGE_PREFIX}${assessmentSlug}`, JSON.stringify(session));
  } catch (err) {
    console.warn("Failed to persist session to localStorage:", err);
  }

  return session;
}

export function clearStoredSession(assessmentSlug: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${assessmentSlug}`);
  } catch (err) {
    console.warn("Failed to clear session:", err);
  }
}
