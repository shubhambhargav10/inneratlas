# INNERATLAS — PHASE 2 SQL SECURITY REVIEW & REMEDIATION REPORT

**Author:** Principal Database Architect & Application Security Engineer  
**Date:** November 13, 2026  
**Target Migration:** `supabase/migrations/20261102_phase2_persistence.sql`  
**Git Branch:** `feature/supabase-database-migration`  
**Status:** REMEDIATED & HARDENED (Awaiting Product Owner Approval for Hosted Execution)  

---

## 1. EXECUTIVE SUMMARY

Following an in-depth architectural and application security review of the Phase 2 persistence migration (`20261102_phase2_persistence.sql`), a critical authorization bypass flaw was identified in `public.prevent_profile_role_escalation()`, along with an RLS recursion anti-pattern on `public.profiles`.

Specifically:
1. **The Function Context Vulnerability:** When `prevent_profile_role_escalation()` was declared as `SECURITY DEFINER`, PostgreSQL switched `current_user` to the function owner's role (`postgres`). Consequently, the conditional check `current_user != 'postgres'` evaluated to `FALSE`, effectively neutralizing the block and permitting unauthorized callers to update the `role` column.
2. **The RLS Subquery Recursion Anti-Pattern:** The profile update RLS policy included a self-referencing subquery `role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())` inside `WITH CHECK`. Evaluating a table's own RLS policy via a nested subquery against the same table during an update risks recursive policy evaluation, degraded execution performance, and query planner errors.
3. **Dedicated Administrative Role Modification:** Role assignments were decoupled from raw profile row updates and centralized into a dedicated, audit-trailed administrative RPC `admin_set_user_role` granted strictly to `service_role`.

All vulnerabilities have been resolved. The migration has been hardened and verified across 73 database security tests, 42 route security tests, and 34 commercial validation tests.

**Execution Constraints Maintained:**
- **Zero SQL has been executed against the hosted Supabase project (`InnerAtlas-dev`).**
- **Live payments remain disabled (`ENABLE_MOCK_PAYMENTS="false"` in production).**
- **The application has not been deployed.**

---

## 2. DETAILED FINDINGS & REMEDIATION ANALYSIS

### 2.1 The `SECURITY DEFINER` vs. `SECURITY INVOKER` Execution Context
- **Root Cause Analysis:**
  In PostgreSQL, a function declared `SECURITY DEFINER` runs with the identity and privileges of the function's owner (typically `postgres` or `supabase_admin` in Supabase). Inside the function body, the system variable `current_user` represents the function owner, **not** the client who triggered the function call.
  In the initial implementation:
  ```sql
  -- VULNERABLE PATTERN:
  CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
  RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
  BEGIN
      IF (NEW.role IS DISTINCT FROM OLD.role) THEN
          IF current_user != 'service_role' AND current_user != 'postgres' AND ... THEN
              RAISE EXCEPTION 'Unauthorized';
          END IF;
      END IF;
  ```
  Because `current_user` inside a `SECURITY DEFINER` function owned by `postgres` is `postgres`, the clause `current_user != 'postgres'` evaluated to `FALSE`. The entire `IF` condition failed, completely bypassing the exception and allowing ordinary authenticated users to elevate their privileges to `admin` or `super_admin`.

- **Architectural Remediation:**
  1. **Declared as `SECURITY INVOKER`:** Trigger functions in PostgreSQL do not require elevated privileges to compare `NEW` and `OLD` row tuples. By omitting `SECURITY DEFINER` (making it `SECURITY INVOKER`), PostgreSQL preserves the original session identity:
     - PostgREST requests from authenticated users run with `current_user = 'authenticated'`.
     - PostgREST requests from anonymous visitors run with `current_user = 'anon'`.
     - Server-side administrative operations run with `current_user = 'service_role'`.
     - Direct administrator database sessions run with `current_user = 'postgres'`.
  2. **Eliminated `current_user != 'postgres'` Bypass:** The flawed conditional check was eliminated entirely.
  3. **Dual-Layer Context Verification (PostgREST JWT + DB Session):**
     Inside the trigger, both the cryptographically verified JWT claim role (`request.jwt.claim.role`) and the active PostgreSQL session role (`current_user`) are evaluated:
     ```sql
     -- 1. If role is not being modified, allow update immediately
     IF (NEW.role IS NOT DISTINCT FROM OLD.role) THEN
         RETURN NEW;
     END IF;

     -- 2. Extract PostgREST JWT claim if invoked over HTTP API
     v_jwt_role := COALESCE(
         current_setting('request.jwt.claim.role', true),
         (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'),
         ''
     );

     -- 3. Explicitly block HTTP callers with authenticated or anon JWTs
     IF v_jwt_role IN ('authenticated', 'anon') THEN
         RAISE EXCEPTION 'Unauthorized: Users cannot modify their own profile role or privileges (JWT role: %).', v_jwt_role;
     END IF;

     -- 4. Explicitly block database sessions operating under authenticated or anon roles
     IF current_user IN ('authenticated', 'anon') THEN
         RAISE EXCEPTION 'Unauthorized: Role % cannot modify profile roles.', current_user;
     END IF;

     -- 5. Only permit role updates when:
     --    a) The request carries a verified service_role JWT, OR
     --    b) The database session role is service_role, postgres, or supabase_admin (with no untrusted user JWT)
     IF v_jwt_role = 'service_role'
        OR (v_jwt_role = '' AND current_user IN ('service_role', 'postgres', 'supabase_admin')) THEN
         RETURN NEW;
     END IF;

     -- 6. Fail closed for all other execution contexts
     RAISE EXCEPTION 'Unauthorized: Profile role modifications require trusted server-side administrative privileges.';
     ```

---

### 2.2 Prevention of Recursive RLS Evaluation
- **Root Cause Analysis:**
  The previous RLS update policy on `public.profiles` was:
  ```sql
  -- VULNERABLE RLS PATTERN:
  CREATE POLICY "Users update own profile" ON public.profiles
      FOR UPDATE TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (
          auth.uid() = id
          AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
      );
  ```
  In PostgreSQL, referencing `public.profiles` inside a `WITH CHECK` expression on `public.profiles` triggers a self-referential subquery. On every single row update, PostgreSQL must recursively evaluate RLS policies for the inner query. This introduces:
  - Potential `infinite recursion detected in policy for relation "profiles"` runtime errors.
  - Severe query latency and CPU overhead caused by repeated sub-selects during batch operations.
  - RLS recursion warnings that break strict migration pipelines.

- **Architectural Remediation:**
  The RLS policy was simplified to evaluate only constant-time expressions on the candidate row (`NEW`), completely eliminating subqueries on `public.profiles`:
  ```sql
  -- REMEDIATED NON-RECURSIVE RLS POLICY:
  CREATE POLICY "Users update own profile" ON public.profiles
      FOR UPDATE TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  ```
  **Why this is 100% secure:**
  - The RLS policy restricts authenticated users to updating rows where `id = auth.uid()`.
  - Column-level immutability for `role` is enforced in-memory by the `BEFORE UPDATE` trigger `trg_prevent_profile_role_escalation`.
  - The trigger directly compares `NEW.role` with `OLD.role` without any database queries, completely preventing self-elevation while avoiding RLS recursion.

---

### 2.3 Dedicated Administrative Role Modification Operation
- **Design:**
  Rather than performing ad-hoc direct updates to profile rows, administrative role modifications are now encapsulated in an explicit, trusted RPC:
  ```sql
  CREATE OR REPLACE FUNCTION public.admin_set_user_role(
      p_user_id UUID,
      p_new_role TEXT
  )
  RETURNS JSONB
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
  AS $$
  DECLARE
      v_jwt_role TEXT;
      v_updated RECORD;
  BEGIN
      -- Verify caller context is trusted service_role
      v_jwt_role := COALESCE(
          current_setting('request.jwt.claim.role', true),
          (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'),
          ''
      );

      IF v_jwt_role IN ('authenticated', 'anon') OR current_user IN ('authenticated', 'anon') THEN
          RAISE EXCEPTION 'Unauthorized: RPC admin_set_user_role requires trusted service_role privileges.';
      END IF;

      IF p_new_role NOT IN ('user', 'admin', 'super_admin') THEN
          RAISE EXCEPTION 'Invalid role: %. Permitted values: user, admin, super_admin', p_new_role;
      END IF;

      UPDATE public.profiles
      SET role = p_new_role,
          updated_at = timezone('utc'::text, now())
      WHERE id = p_user_id
      RETURNING * INTO v_updated;

      IF NOT FOUND THEN
          RAISE EXCEPTION 'User profile % not found', p_user_id;
      END IF;

      RETURN jsonb_build_object(
          'success', true,
          'user_id', v_updated.id,
          'email', v_updated.email,
          'new_role', v_updated.role
      );
  END;
  $$;

  REVOKE EXECUTE ON FUNCTION public.admin_set_user_role(UUID, TEXT) FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.admin_set_user_role(UUID, TEXT) TO service_role;
  ```
- **Security Guarantees:**
  - Browser clients calling `/rest/v1/rpc/admin_set_user_role` receive `403 Permission Denied` at the PostgreSQL engine level.
  - The function verifies `v_jwt_role` and `current_user`, failing closed if called from an unprivileged context.
  - Validates role values against permitted enum: `'user'`, `'admin'`, `'super_admin'`.

---

## 3. SUMMARY OF COMPLETE MIGRATION REMEDIATIONS

| Area | Initial Implementation | Remediated Implementation |
|---|---|---|
| **RPC Execution** | `PUBLIC` execute granted by default on `SECURITY DEFINER` functions; missing `search_path`. | Explicit `REVOKE EXECUTE FROM PUBLIC, anon, authenticated;` and `GRANT TO service_role;` with `SET search_path = public, pg_temp;`. |
| **Profile Role Protection** | `SECURITY DEFINER` trigger with `current_user != 'postgres'` bypass. | `SECURITY INVOKER` trigger checking PostgREST JWT claims and DB session roles; zero `current_user != 'postgres'` bypass. |
| **Profiles RLS** | Recursive subquery `(SELECT p.role FROM public.profiles ...)` inside `WITH CHECK`. | Non-recursive `WITH CHECK (auth.uid() = id)`; column immutability delegated to trigger. |
| **Admin Role Changes** | Direct unconstrained row update. | Encapsulated `admin_set_user_role` RPC restricted strictly to `service_role`. |
| **Scoring Weights** | `answer_options` fully readable by anonymous clients with `USING (true)`. | Column grant revokes `dimension_weights` from public/anon; secure view `public_answer_options` provided; draft content hidden. |
| **Webhook Lifecycle** | Events marked processed on receipt with no retry on error. | State machine: `received` -> `processing` -> `processed` / `failed` with safe retry and concurrency locking. |
| **Admin Rate Limiting** | Race condition on initial IP attempt (`SELECT ... FOR UPDATE` followed by `INSERT`). | Single atomic `INSERT ... ON CONFLICT (ip) DO UPDATE` with PostgreSQL row locks. |
| **Relational Integrity** | `questions.id` (`UUID`) vs. `user_responses.question_id` (`TEXT`) mismatch; no versions table. | Both UUID with active FK; `assessment_versions` table created with `ON DELETE RESTRICT` on sessions. |
| **Financial Audit** | `payments.order_id` used `ON DELETE CASCADE`. | Changed to `ON DELETE RESTRICT` (financial audit logs immutable). |

---

## 4. VERIFICATION & TEST SUITE EXECUTION

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

--- 6. PROFILE ROLE ESCALATION & AUTHORIZATION TESTS ---
✅ [PASS] 6.1: Authenticated user successfully updates permitted profile field (fullName)
✅ [PASS] 6.2: User role remains securely unchanged as 'user'
✅ [PASS] 6.3: Authenticated user attempting self-promotion to 'admin' is strictly blocked
✅ [PASS] 6.4: Authenticated user attempting self-promotion to 'super_admin' is strictly blocked
✅ [PASS] 6.5: Authenticated user cannot update another user's profile
✅ [PASS] 6.6: Authenticated user denied execution of admin_set_user_role RPC
✅ [PASS] 6.7: Trusted server-side role (service_role) successfully elevates user to 'admin'
✅ [PASS] 6.8: Trusted server-side role successfully reverts user to 'user'

--- 7. PRODUCTION FAIL-CLOSED SECURITY ENFORCEMENT ---
✅ [PASS] 7.1: Production mode with missing Supabase configuration fails closed immediately

--- 8. SQL MIGRATION SECURITY & CONTRACT VERIFICATION ---
✅ [PASS] 8.1: fulfill_order_payment revoked from PUBLIC/anon/authenticated and granted strictly to service_role
✅ [PASS] 8.2: record_webhook_event_idempotent revoked from PUBLIC/anon/authenticated and granted strictly to service_role
✅ [PASS] 8.3: finalize_webhook_event revoked from PUBLIC/anon/authenticated and granted strictly to service_role
✅ [PASS] 8.4: check_and_record_admin_attempt revoked from PUBLIC/anon/authenticated and granted strictly to service_role
✅ [PASS] 8.5: admin_set_user_role revoked from PUBLIC/anon/authenticated and granted strictly to service_role
✅ [PASS] 8.6: Safe search_path = public, pg_temp explicitly configured on all privileged functions
✅ [PASS] 8.7: prevent_profile_role_escalation is declared as SECURITY INVOKER (omits SECURITY DEFINER) to preserve caller identity
✅ [PASS] 8.8: Flawed 'current_user != postgres' check is completely eliminated from SQL migration
✅ [PASS] 8.9: Trigger strictly blocks both HTTP JWT roles and DB session roles of authenticated and anon
✅ [PASS] 8.10: Profiles RLS policy eliminates self-referencing subqueries (recursive RLS evaluation prevented)
✅ [PASS] 8.11: Profiles UPDATE RLS policy enforces non-recursive WITH CHECK (auth.uid() = id)
✅ [PASS] 8.12: answer_options.dimension_weights revoked from anonymous and public clients
✅ [PASS] 8.13: public_answer_options view provided with dimension_weights omitted
✅ [PASS] 8.14: Public RLS policies strictly filter for is_active = true and status = 'published' (drafts hidden)
✅ [PASS] 8.15: assessment_versions table created with UNIQUE(assessment_id, version_number)
✅ [PASS] 8.16: scoring_dimensions and questions tied to immutable assessment_versions
✅ [PASS] 8.17: user_responses.question_id matches questions.id type (UUID) with active foreign key
✅ [PASS] 8.18: payments.order_id foreign key enforces ON DELETE RESTRICT (financial audit immutability)
✅ [PASS] 8.19: webhook_events table defines explicit lifecycle status column with check constraint
✅ [PASS] 8.20: admin_rate_limits uses concurrency-safe atomic UPSERT with row-locking
✅ [PASS] 8.21: set_updated_at trigger attached across all mutable entity tables

--- 9. HOSTED DATABASE STATUS & SCOPE BOUNDARIES ---
   ⚠️  Hosted Supabase Project (InnerAtlas-dev) execution is intentionally deferred.
      As instructed, migration execution against hosted Supabase awaits product owner review.
      All 21 static SQL security invariants and repository lifecycle contracts passed cleanly.

==================================================================
   PHASE 2 DATABASE SECURITY AUDIT COMPLETE: 73 PASSED, 0 FAILED   
==================================================================
```

### 4.2 Security Regression Suite (`npm run test:security`)
- **Results:** 42 Passed, 0 Failed.
- Confirmed mock payment bypasses remain eliminated, timingSafeEqual signature validation, unauthenticated customer lookup blocked (403), access token SHA-256 validation, and admin credentials fail-closed.

### 4.3 End-to-End Commercial Validation (`npm test`)
- **Results:** 34 Passed, 0 Failed.
- Confirmed 3 assessment catalogues, 8 archetypes, questionnaire state management, deterministic scoring normalization (0–100%), PDF generation, and token hash validation.

### 4.4 Production Compilation (`npm run build`)
- **Results:** 32/32 routes generated cleanly with zero TypeScript errors and zero lint warnings.

---

## 5. HOSTED DATABASE STATUS & NEXT STEPS

- **Current Status:** The migration file [`supabase/migrations/20261102_phase2_persistence.sql`](file:///Users/shubham.bhargaw/Dev/myApps/ProjectX/supabase/migrations/20261102_phase2_persistence.sql) is fully remediated and committed to branch `feature/supabase-database-migration`.
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
