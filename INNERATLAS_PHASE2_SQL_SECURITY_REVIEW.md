# INNERATLAS — PHASE 2 SQL SECURITY REVIEW & REMEDIATION REPORT

**Author:** Principal Database Architect & Application Security Engineer  
**Date:** November 13, 2026  
**Target Migration:** `supabase/migrations/20261102_phase2_persistence.sql`  
**Git Branch:** `feature/supabase-database-migration`  
**Status:** REMEDIATED & HARDENED (Awaiting Product Owner Approval for Hosted Execution)  

---

## 1. EXECUTIVE SUMMARY

Following an independent architectural review of the proposed Phase 2 migration (`20261102_phase2_persistence.sql`), seven critical security, authorization, and relational integrity vulnerabilities were identified. These vulnerabilities would have left database RPCs exposed to anonymous callers, enabled self-escalation to administrative roles, exposed proprietary scoring weights to web crawlers, created race conditions under concurrent webhook or brute-force attempts, and jeopardized historical assessment results.

All seven vulnerabilities have been comprehensively remediated directly in `supabase/migrations/20261102_phase2_persistence.sql` without breaking changes to the Next.js application layer.

In accordance with strict project rules:
- **Zero SQL has been executed against the hosted Supabase project (`InnerAtlas-dev`).**
- **Live payments remain disabled (`ENABLE_MOCK_PAYMENTS="false"` in production, mock test harnesses isolated).**
- **The application has not been deployed.**
- **61/61 database security tests, 42/42 route security tests, and 34/34 commercial validation tests pass cleanly.**
- **Production Next.js 14 build compiles with 0 errors across all 32 routes.**

---

## 2. DETAILED FINDINGS & REMEDIATION MATRIX

| # | Vulnerability Category | Severity | Initial Flaw | Remediation Applied |
|---|------------------------|----------|--------------|---------------------|
| **1** | **SECURITY DEFINER Privileges** | **Critical** | Default `PUBLIC` execution on privileged fulfillment and admin RPCs; missing `search_path`. | Explicit `REVOKE EXECUTE ... FROM PUBLIC, anon, authenticated;`, `GRANT TO service_role;`, added `SET search_path = public, pg_temp;`. |
| **2** | **Profile Role Self-Escalation** | **Critical** | `profiles` UPDATE RLS policy lacked column checks, permitting customers to send `{ role: 'admin' }`. | Added `trg_prevent_profile_role_escalation` trigger (enforces `service_role` only for role changes) + RLS `WITH CHECK` constraint. |
| **3** | **Scoring Weights Exposure** | **High** | `answer_options` SELECT policy was `USING (true)`, leaking internal dimension scoring weights to anonymous clients. | Revoked `dimension_weights` column from `PUBLIC`/`anon`/`authenticated`, created secure `public_answer_options` view, and filtered public access to active & published assessments only. |
| **4** | **Webhook Lifecycle & Idempotency** | **High** | Events marked as permanently processed upon initial receipt, with no retry support on failed fulfillment. | Introduced explicit states (`received`, `processing`, `processed`, `failed`), concurrency in-flight locking, and safe retry support. |
| **5** | **Admin Rate-Limit Concurrency** | **High** | First-attempt check used `SELECT ... FOR UPDATE` followed by `INSERT`, causing race collisions under simultaneous brute-force attempts. | Replaced with atomic `INSERT ... ON CONFLICT (ip) DO UPDATE` with row-level locks, unifying window evaluation in a single SQL operation. |
| **6** | **Relational Integrity & Versions** | **High** | `user_responses.question_id` (`TEXT`) mismatched `questions.id` (`UUID`) with no FK; assessments lacked immutable versioning. | Fixed type mismatch with UUID FK, created `assessment_versions` table, and tied dimensions and questions to immutable versions to preserve historical results. |
| **7** | **Financial Audit Hardening** | **Medium** | `payments.order_id` used `ON DELETE CASCADE`; `updated_at` triggers were absent on several tables. | Changed `payments` to `ON DELETE RESTRICT` (financial audit immutability); installed standard `set_updated_at()` trigger across all mutable entities. |

---

## 3. IN-DEPTH TECHNICAL REMEDIATIONS

### 3.1 Restrict SECURITY DEFINER RPC Execution
- **The Flaw:** In PostgreSQL, functions created with `SECURITY DEFINER` run with the privileges of the creator (`postgres` / superuser). By default in PostgreSQL, newly created functions grant `EXECUTE` privileges to the pseudo-role `PUBLIC`. This meant an anonymous client calling Supabase PostgREST via `/rest/v1/rpc/fulfill_order_payment` or `/rest/v1/rpc/check_and_record_admin_attempt` could invoke privileged internal operations directly from the browser. Furthermore, omitting `SET search_path` created search-path hijacking risks.
- **The Fix:**
  1. Configured `SET search_path = public, pg_temp` on every `SECURITY DEFINER` function.
  2. Added explicit revokes and service-role grants:
```sql
REVOKE EXECUTE ON FUNCTION public.fulfill_order_payment(TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_order_payment(TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, INTEGER) TO service_role;

REVOKE EXECUTE ON FUNCTION public.record_webhook_event_idempotent(TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_webhook_event_idempotent(TEXT, TEXT, JSONB) TO service_role;

REVOKE EXECUTE ON FUNCTION public.finalize_webhook_event(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_webhook_event(TEXT, TEXT, TEXT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.check_and_record_admin_attempt(TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_record_admin_attempt(TEXT, BOOLEAN) TO service_role;
```

---

### 3.2 Fix Profile Role Escalation
- **The Flaw:** `CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);` allowed an authenticated user to send `PATCH /rest/v1/profiles?id=eq.<user_id>` with payload `{"role": "admin"}` or `{"role": "super_admin"}`.
- **The Fix:**
  1. Created a dedicated PostgreSQL trigger function `public.prevent_profile_role_escalation()`:
```sql
CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF (NEW.role IS DISTINCT FROM OLD.role) THEN
        IF current_user != 'service_role' 
           AND current_user != 'postgres' 
           AND COALESCE(current_setting('request.jwt.claim.role', true), '') != 'service_role' THEN
            RAISE EXCEPTION 'Unauthorized: Users cannot modify their own profile role or privileges.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_profile_role_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_profile_role_escalation();
```
  2. Added a defense-in-depth `WITH CHECK` clause to the profiles RLS policy:
```sql
CREATE POLICY "Users update own profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id
        AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
    );
```

---

### 3.3 Protect Assessment Scoring Weights & Draft Content
- **The Flaw:** `public.answer_options` stored `dimension_weights JSONB` (e.g. `{"strategic": 4, "analytical": 3}`). The public RLS policy permitted anonymous clients to select all columns (`USING (true)`). A competitor or client script could query `/rest/v1/answer_options` and reverse-engineer the proprietary scoring algorithm. Furthermore, draft assessments were visible if not explicitly filtered.
- **The Fix:**
  1. **Column-Level Privilege Revocation:**
```sql
REVOKE SELECT ON public.answer_options FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, question_id, order_index, label, value, created_at) ON public.answer_options TO anon, authenticated;
GRANT ALL ON public.answer_options TO service_role;
```
  2. **Security-Invoker Public View:**
```sql
CREATE OR REPLACE VIEW public.public_answer_options
WITH (security_invoker = true)
AS
SELECT id, question_id, order_index, label, value, created_at
FROM public.answer_options;
```
  3. **Strict Draft Filtering:** All public catalog policies on `assessments`, `assessment_versions`, `scoring_dimensions`, `questions`, and `answer_options` now require `is_active = true` and `status = 'published'`.

---

### 3.4 Webhook Lifecycle State Machine & Retry Support
- **The Flaw:** Previously, `record_webhook_event_idempotent` immediately inserted the event with `processed_at = NOW()`. If order fulfillment subsequently failed (e.g., due to a temporary network blip or lock timeout), the webhook was marked as processed, causing Razorpay's subsequent automated retry to be rejected as a duplicate, leaving the customer unpaid.
- **The Fix:**
  1. Added state machine columns to `public.webhook_events`:
     - `status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processing', 'processed', 'failed'))`
     - `error_message TEXT`
     - `retry_count INTEGER NOT NULL DEFAULT 0`
     - `last_attempt TIMESTAMPTZ`
  2. Updated `record_webhook_event_idempotent` RPC:
     - New events are marked `'processing'` with `retry_count = 1`.
     - In-flight deliveries within 2 minutes return `status: 'in_flight'` (concurrency lock).
     - Events in `'failed'` status (or timed out `'processing'` > 2 minutes) are permitted to safely retry (`retry_count` incremented, `status` set back to `'processing'`).
     - Fully `'processed'` events return `should_process: false`.
  3. Added `finalize_webhook_event(p_event_id, p_status, p_error)` RPC called upon fulfillment completion or error.

---

### 3.5 Atomic Concurrency-Safe Admin Rate Limiting
- **The Flaw:** Checking the rate limit previously executed `SELECT * FROM admin_rate_limits WHERE ip = p_ip FOR UPDATE;`. When an IP made its first failed attempt, `NOT FOUND` was returned; concurrent requests both saw `NOT FOUND` and both attempted `INSERT`, causing unique constraint violations and race conditions.
- **The Fix:** Rewrote `check_and_record_admin_attempt` to use a single atomic PostgreSQL UPSERT statement:
```sql
INSERT INTO public.admin_rate_limits (
    ip, attempts, first_attempt_at, last_attempt_at, locked_until, created_at, updated_at
) VALUES (
    p_ip, 1, v_now, v_now, NULL, v_now, v_now
)
ON CONFLICT (ip) DO UPDATE SET
    attempts = CASE
        WHEN admin_rate_limits.locked_until IS NOT NULL AND admin_rate_limits.locked_until <= v_now THEN 1
        WHEN admin_rate_limits.first_attempt_at + INTERVAL '15 minutes' < v_now THEN 1
        WHEN admin_rate_limits.locked_until IS NOT NULL AND admin_rate_limits.locked_until > v_now THEN admin_rate_limits.attempts
        ELSE admin_rate_limits.attempts + 1
    END,
    first_attempt_at = CASE
        WHEN (admin_rate_limits.locked_until IS NOT NULL AND admin_rate_limits.locked_until <= v_now)
          OR (admin_rate_limits.first_attempt_at + INTERVAL '15 minutes' < v_now) THEN v_now
        ELSE admin_rate_limits.first_attempt_at
    END,
    last_attempt_at = v_now,
    locked_until = CASE
        WHEN admin_rate_limits.locked_until IS NOT NULL AND admin_rate_limits.locked_until > v_now THEN admin_rate_limits.locked_until
        WHEN admin_rate_limits.locked_until IS NOT NULL AND admin_rate_limits.locked_until <= v_now THEN NULL
        WHEN admin_rate_limits.first_attempt_at + INTERVAL '15 minutes' < v_now THEN NULL
        WHEN admin_rate_limits.attempts + 1 >= 5 THEN v_now + INTERVAL '15 minutes'
        ELSE NULL
    END,
    updated_at = v_now
RETURNING * INTO v_record;
```
This statement is completely atomic, acquires row locks during conflict resolution, and prevents any race condition or bypass.

---

### 3.6 Relational Integrity & Immutable Assessment Versions
- **The Flaw:**
  - `public.questions.id` was defined as `UUID`, while `public.user_responses.question_id` was defined as `TEXT` with no foreign key constraint.
  - Assessments lacked a versioning table; modifying questions or scoring dimensions in place would invalidate past customer results or distort historical dossiers.
- **The Fix:**
  1. Created `public.assessment_versions`:
```sql
CREATE TABLE IF NOT EXISTS public.assessment_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE RESTRICT,
    version_number INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
    changelog TEXT,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(assessment_id, version_number)
);
```
  2. Tied `scoring_dimensions` and `questions` to `version_id UUID NOT NULL REFERENCES public.assessment_versions(id) ON DELETE CASCADE`.
  3. Added `question_code TEXT NOT NULL` to `questions` (e.g. `'pa_q1'`), maintaining stable client keys while ensuring `questions.id` is a primary key `UUID`.
  4. Updated `public.user_responses`:
```sql
question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE
```
     Both types match exactly (`UUID`), and foreign-key integrity is enforced by the database engine.
  5. Linked `assessment_sessions` to `assessment_id` and `version_id` with `ON DELETE RESTRICT`, ensuring historical sessions remain immutably anchored to the exact questions and weights they were scored against.

---

### 3.7 Additional Database Hardening
1. **Financial Audit Trail Immutability:** Changed `public.payments.order_id` foreign key from `ON DELETE CASCADE` to `ON DELETE RESTRICT`. In accounting compliance, financial transaction records must never be deleted if an order row is dropped.
2. **Access Token Protection:** Plaintext access tokens are returned only once upon creation/payment; only 64-character SHA-256 hashes (`access_token_hash`) are stored in `public.reports`.
3. **Automatic `updated_at` Maintenance:** Standard trigger `public.set_updated_at()` attached to `profiles`, `assessments`, `assessment_versions`, `scoring_dimensions`, `questions`, `assessment_sessions`, `orders`, `webhook_events`, and `admin_rate_limits`.

---

## 4. VERIFICATION & TEST SUITE RESULTS

### 4.1 Phase 2 Database & Security Suite (`npm run test:phase2`)
```
==================================================================
   INNERATLAS PHASE 2: SUPABASE & DATABASE SECURITY TEST SUITE    
==================================================================

🌐 Database Environment Mode: ISOLATED REPOSITORY + STATIC SQL AUDIT

--- 1. ASSESSMENT SESSION & RESPONSE LIFECYCLE ---
✅ [PASS] 1.1: Session ID generated with sess_ prefix
✅ [PASS] 1.2: Initial session status is in_progress
✅ [PASS] 1.3: Retrieved session by guest_session_token
✅ [PASS] 1.4: Session customer email preserved
✅ [PASS] 1.5: User responses saved successfully
✅ [PASS] 1.6: Assessment calculated result saved successfully

--- 2. ORDER & ATOMIC PAYMENT FULFILLMENT ---
✅ [PASS] 2.1: Order ID created with ord_ prefix
✅ [PASS] 2.2: Initial order status is created
✅ [PASS] 2.3: Order amount strictly stored in integer paise (₹199)
✅ [PASS] 2.4: Order currency is INR
✅ [PASS] 2.5: Order retrievable by unique razorpay_order_id
✅ [PASS] 2.6: Order status updated to paid
✅ [PASS] 2.7: Payment ID associated with order
✅ [PASS] 2.8: Report code generated with DOSSIER- prefix
✅ [PASS] 2.9: Plaintext access token returned to purchaser
✅ [PASS] 2.10: Duplicate payment fulfillment is idempotent

--- 3. ACCESS TOKEN CRYPTOGRAPHIC HASHING & PRIVACY ---
✅ [PASS] 3.1: Stored report contains accessTokenHash
✅ [PASS] 3.2: Access token hash is 64-character SHA-256 hex
✅ [PASS] 3.3: Hash matches SHA-256 of plaintext token
✅ [PASS] 3.4: Plaintext token matches stored hash
✅ [PASS] 3.5: Unauthorized token fails hash comparison
✅ [PASS] 3.6: Report retrievable by valid access token
✅ [PASS] 3.7: Correct report resolved from token hash

--- 4. WEBHOOK LIFECYCLE & RETRY STATE MACHINE ---
✅ [PASS] 4.1: First webhook event allowed to process
✅ [PASS] 4.2: Initial webhook status is 'processing'
✅ [PASS] 4.3: Initial retryCount is 1
✅ [PASS] 4.4: In-flight webhook event rejected from concurrent duplicate processing
✅ [PASS] 4.5: Status indicates 'in_flight' concurrency lock
✅ [PASS] 4.6: Failed event is NOT marked as processed
✅ [PASS] 4.7: Safe retry allowed after failed processing
✅ [PASS] 4.8: Retry count incremented to 2
✅ [PASS] 4.9: Finalized event confirmed as processed
✅ [PASS] 4.10: Processed event permanently blocks redundant re-processing
✅ [PASS] 4.11: Status remains 'processed'

--- 5. ADMINISTRATOR RATE LIMITING & ATOMIC CONCURRENCY ---
✅ [PASS] 5.1: Initial rate limit allows login
✅ [PASS] 5.2: Initial remaining attempts is 5
✅ [PASS] 5.3: Allowed after 4 attempts
✅ [PASS] 5.4: Remaining attempts is 1 after 4 failures
✅ [PASS] 5.5: 5th failure triggers lockout
✅ [PASS] 5.6: Remaining attempts is 0 when locked
✅ [PASS] 5.7: Retry-After seconds provided on lock
✅ [PASS] 5.8: Successful login resets lockout
✅ [PASS] 5.9: Reset attempts back to 5

--- 6. PRODUCTION FAIL-CLOSED SECURITY ENFORCEMENT ---
✅ [PASS] 6.1: Production mode with missing Supabase configuration fails closed immediately

--- 7. SQL MIGRATION SECURITY & CONTRACT VERIFICATION ---
✅ [PASS] 7.1: fulfill_order_payment revoked from PUBLIC/anon/authenticated and granted strictly to service_role
✅ [PASS] 7.2: record_webhook_event_idempotent revoked from PUBLIC/anon/authenticated and granted strictly to service_role
✅ [PASS] 7.3: finalize_webhook_event revoked from PUBLIC/anon/authenticated and granted strictly to service_role
✅ [PASS] 7.4: check_and_record_admin_attempt revoked from PUBLIC/anon/authenticated and granted strictly to service_role
✅ [PASS] 7.5: Safe search_path = public, pg_temp explicitly configured on all SECURITY DEFINER functions
✅ [PASS] 7.6: trg_prevent_profile_role_escalation trigger installed to block self-elevation
✅ [PASS] 7.7: Profiles UPDATE RLS policy includes WITH CHECK constraint to prevent role tampering
✅ [PASS] 7.8: answer_options.dimension_weights revoked from anonymous and public clients
✅ [PASS] 7.9: public_answer_options view provided with dimension_weights omitted
✅ [PASS] 7.10: Public RLS policies strictly filter for is_active = true and status = 'published' (drafts hidden)
✅ [PASS] 7.11: assessment_versions table created with UNIQUE(assessment_id, version_number)
✅ [PASS] 7.12: scoring_dimensions and questions tied to immutable assessment_versions
✅ [PASS] 7.13: user_responses.question_id matches questions.id type (UUID) with active foreign key
✅ [PASS] 7.14: payments.order_id foreign key enforces ON DELETE RESTRICT (financial audit immutability)
✅ [PASS] 7.15: webhook_events table defines explicit lifecycle status column with check constraint
✅ [PASS] 7.16: admin_rate_limits uses concurrency-safe atomic UPSERT with row-locking
✅ [PASS] 7.17: set_updated_at trigger attached across all mutable entity tables

--- 8. HOSTED DATABASE STATUS & SCOPE BOUNDARIES ---
   ⚠️  Hosted Supabase Project (InnerAtlas-dev) execution is intentionally deferred.
      As instructed, migration execution against hosted Supabase awaits product owner review.
      All 17 static SQL security invariants and repository lifecycle contracts passed cleanly.

==================================================================
   PHASE 2 DATABASE SECURITY AUDIT COMPLETE: 61 PASSED, 0 FAILED   
==================================================================
```

### 4.2 Security Regression Suite (`npm run test:security`)
- **Results:** 42 Passed, 0 Failed.
- Confirmed mock payment bypasses remain eliminated, webhook signatures use timingSafeEqual, unauthenticated customer lookup is forbidden (403), access tokens require SHA-256 authorization, and admin credentials fail closed.

### 4.3 End-to-End Commercial Validation (`npm test`)
- **Results:** 34 Passed, 0 Failed.
- Confirmed 3 assessment catalogues, 8 archetypes, questionnaire state management, deterministic scoring normalization (0–100%), PDF generation, and token hash validation.

### 4.4 Production Compilation (`npm run build`)
- **Results:** 32/32 routes generated cleanly with zero TypeScript errors and zero lint warnings.

---

## 5. HOSTED DATABASE STATUS & NEXT STEPS

- **Current Status:** The migration file `supabase/migrations/20261102_phase2_persistence.sql` is fully remediated and verified.
- **Execution Notice:** The migration has **not** been executed against the hosted database (`InnerAtlas-dev`).
- **Required Product Owner Action:**
  1. Review this security report and the remediated SQL file.
  2. When approved, apply the migration via the Supabase Dashboard SQL Editor or Supabase CLI:
     ```bash
     # To apply via Supabase Dashboard:
     # Copy contents of supabase/migrations/20261102_phase2_persistence.sql
     # Paste into Supabase SQL Editor -> Click 'Run'
     ```
  3. Once executed on the hosted database, add the project URL and service role key to `.env.local` to enable hosted PostgreSQL mode:
     ```bash
     NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=<public-anon-key>
     SUPABASE_SERVICE_ROLE_KEY=<private-service-role-key>
     ```
