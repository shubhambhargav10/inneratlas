-- ==============================================================================
-- INNERATLAS PHASE 2 DATABASE MIGRATION (REMEDIATED & HARDENED)
-- Production PostgreSQL Relational Schema, RLS Security & Storage Engine
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. UTILITY TRIGGER FUNCTIONS
-- ==============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

-- Prevent non-service-role users from escalating profile role
-- Declared as SECURITY INVOKER (omitting SECURITY DEFINER) so that current_user reflects
-- the actual caller session role rather than switching to the function owner (postgres).
CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    v_jwt_role TEXT;
BEGIN
    -- 1. If role is not being modified, allow update immediately
    IF (NEW.role IS NOT DISTINCT FROM OLD.role) THEN
        RETURN NEW;
    END IF;

    -- 2. Role is being modified. Extract PostgREST JWT claim if invoked over HTTP API
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
END;
$$;

-- ==============================================================================
-- 3. CORE IDENTITY & USER PROFILES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_prevent_profile_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_role_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_profile_role_escalation();

-- ==============================================================================
-- 4. ASSESSMENT CATALOGUE & IMMUTABLE VERSIONS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    subtitle TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Personality', 'Career', 'Cognitive')),
    current_version INTEGER NOT NULL DEFAULT 1,
    estimated_minutes INTEGER NOT NULL DEFAULT 12,
    price_inr INTEGER NOT NULL DEFAULT 199 CHECK (price_inr > 0),
    compare_price_inr INTEGER NOT NULL DEFAULT 499 CHECK (compare_price_inr >= price_inr),
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 1,
    cover_image TEXT,
    badge_label TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

DROP TRIGGER IF EXISTS trg_assessments_updated_at ON public.assessments;
CREATE TRIGGER trg_assessments_updated_at
    BEFORE UPDATE ON public.assessments
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Immutable assessment versions preserve historical integrity
CREATE TABLE IF NOT EXISTS public.assessment_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE RESTRICT,
    version_number INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
    changelog TEXT,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(assessment_id, version_number),
    UNIQUE(id, assessment_id) -- Enables composite foreign key from assessment_sessions
);

DROP TRIGGER IF EXISTS trg_assessment_versions_updated_at ON public.assessment_versions;
CREATE TRIGGER trg_assessment_versions_updated_at
    BEFORE UPDATE ON public.assessment_versions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Scoring Dimensions tied to immutable assessment version
CREATE TABLE IF NOT EXISTS public.scoring_dimensions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES public.assessment_versions(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    low_label TEXT NOT NULL,
    high_label TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(version_id, key)
);

DROP TRIGGER IF EXISTS trg_scoring_dimensions_updated_at ON public.scoring_dimensions;
CREATE TRIGGER trg_scoring_dimensions_updated_at
    BEFORE UPDATE ON public.scoring_dimensions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Questions tied to immutable assessment version
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES public.assessment_versions(id) ON DELETE CASCADE,
    question_code TEXT NOT NULL, -- Stable key, e.g. 'pa_q1'
    order_index INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    context_hint TEXT,
    question_type TEXT NOT NULL DEFAULT 'likert_5' CHECK (question_type IN ('likert_5', 'single_choice')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(version_id, question_code),
    UNIQUE(version_id, order_index),
    UNIQUE(id, version_id) -- Enables composite foreign key from user_responses
);

DROP TRIGGER IF EXISTS trg_questions_updated_at ON public.questions;
CREATE TRIGGER trg_questions_updated_at
    BEFORE UPDATE ON public.questions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Answer Options with strictly confidential scoring weights
CREATE TABLE IF NOT EXISTS public.answer_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    label TEXT NOT NULL,
    value INTEGER NOT NULL,
    dimension_weights JSONB NOT NULL DEFAULT '{}'::jsonb, -- Confidential internal scoring weights
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(question_id, order_index)
);

-- ------------------------------------------------------------------------------
-- Published Assessment Immutability Triggers
-- Prevents modification or deletion of published/archived versions, questions,
-- scoring dimensions, and answer options, while allowing full editing for drafts.
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_assessment_version_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.status IN ('published', 'archived') THEN
            RAISE EXCEPTION 'Cannot delete % assessment version % (id: %). Published and archived versions are permanently immutable for historical integrity.',
                OLD.status, OLD.version_number, OLD.id;
        END IF;
        RETURN OLD;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        -- If already published or archived, enforce strict field immutability
        IF OLD.status IN ('published', 'archived') THEN
            IF NEW.assessment_id IS DISTINCT FROM OLD.assessment_id THEN
                RAISE EXCEPTION 'Cannot change assessment_id of % version %', OLD.status, OLD.id;
            END IF;
            IF NEW.version_number IS DISTINCT FROM OLD.version_number THEN
                RAISE EXCEPTION 'Cannot change version_number of % version %', OLD.status, OLD.id;
            END IF;
            IF NEW.published_at IS DISTINCT FROM OLD.published_at THEN
                RAISE EXCEPTION 'Cannot change published_at timestamp of % version %', OLD.status, OLD.id;
            END IF;
            IF OLD.status = 'published' AND NEW.status NOT IN ('published', 'archived') THEN
                RAISE EXCEPTION 'Cannot revert published assessment version % back to draft.', OLD.id;
            END IF;
            IF OLD.status = 'archived' AND NEW.status != 'archived' THEN
                RAISE EXCEPTION 'Cannot modify status of archived assessment version %.', OLD.id;
            END IF;
            -- Permitted updates on published version: transition status to 'archived', changelog updates
        END IF;
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assessment_versions_immutability ON public.assessment_versions;
CREATE TRIGGER trg_assessment_versions_immutability
    BEFORE UPDATE OR DELETE ON public.assessment_versions
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_assessment_version_immutability();

CREATE OR REPLACE FUNCTION public.enforce_assessment_content_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    v_old_version_id UUID;
    v_new_version_id UUID;
    v_old_status TEXT;
    v_new_status TEXT;
BEGIN
    -- 1. Identify OLD parent version (for UPDATE and DELETE)
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        IF TG_TABLE_NAME = 'scoring_dimensions' THEN
            v_old_version_id := OLD.version_id;
        ELSIF TG_TABLE_NAME = 'questions' THEN
            v_old_version_id := OLD.version_id;
        ELSIF TG_TABLE_NAME = 'answer_options' THEN
            -- Acquire FOR SHARE lock on parent question to serialize against concurrent question modifications
            SELECT q.version_id INTO v_old_version_id
            FROM public.questions q
            WHERE q.id = OLD.question_id
            FOR SHARE;
        END IF;
    END IF;

    -- 2. Identify NEW parent version (for INSERT and UPDATE)
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        IF TG_TABLE_NAME = 'scoring_dimensions' THEN
            v_new_version_id := NEW.version_id;
        ELSIF TG_TABLE_NAME = 'questions' THEN
            v_new_version_id := NEW.version_id;
        ELSIF TG_TABLE_NAME = 'answer_options' THEN
            -- Acquire FOR SHARE lock on parent question to serialize against concurrent question modifications
            SELECT q.version_id INTO v_new_version_id
            FROM public.questions q
            WHERE q.id = NEW.question_id
            FOR SHARE;
        END IF;
    END IF;

    -- 3. Acquire conflicting FOR SHARE locks on assessment_versions in deterministic order
    -- FOR SHARE coordinates directly with publish_assessment_version (which acquires FOR UPDATE)
    -- Case A: Single version affected (INSERT, DELETE, or in-place UPDATE without reparenting)
    IF (v_old_version_id IS NOT NULL AND v_new_version_id IS NULL) THEN
        -- DELETE operation
        SELECT status INTO v_old_status
        FROM public.assessment_versions
        WHERE id = v_old_version_id
        FOR SHARE;

        IF v_old_status IN ('published', 'archived') THEN
            RAISE EXCEPTION 'Cannot % % on % assessment version (version_id: %). Content is immutable once published.',
                TG_OP, TG_TABLE_NAME, v_old_status, v_old_version_id;
        END IF;

    ELSIF (v_old_version_id IS NULL AND v_new_version_id IS NOT NULL) THEN
        -- INSERT operation
        SELECT status INTO v_new_status
        FROM public.assessment_versions
        WHERE id = v_new_version_id
        FOR SHARE;

        IF v_new_status IN ('published', 'archived') THEN
            RAISE EXCEPTION 'Cannot % % into % assessment version (version_id: %). Content is immutable once published.',
                TG_OP, TG_TABLE_NAME, v_new_status, v_new_version_id;
        END IF;

    ELSIF (v_old_version_id IS NOT NULL AND v_new_version_id IS NOT NULL) THEN
        -- UPDATE operation
        IF v_old_version_id = v_new_version_id THEN
            -- In-place update within same version: acquire single lock
            SELECT status INTO v_old_status
            FROM public.assessment_versions
            WHERE id = v_old_version_id
            FOR SHARE;

            IF v_old_status IN ('published', 'archived') THEN
                RAISE EXCEPTION 'Cannot % % on % assessment version (version_id: %). Content is immutable once published.',
                    TG_OP, TG_TABLE_NAME, v_old_status, v_old_version_id;
            END IF;
        ELSE
            -- Reparenting across two versions: acquire locks in deterministic ascending UUID order to avoid deadlocks
            IF v_old_version_id < v_new_version_id THEN
                SELECT status INTO v_old_status
                FROM public.assessment_versions
                WHERE id = v_old_version_id
                FOR SHARE;

                SELECT status INTO v_new_status
                FROM public.assessment_versions
                WHERE id = v_new_version_id
                FOR SHARE;
            ELSE
                SELECT status INTO v_new_status
                FROM public.assessment_versions
                WHERE id = v_new_version_id
                FOR SHARE;

                SELECT status INTO v_old_status
                FROM public.assessment_versions
                WHERE id = v_old_version_id
                FOR SHARE;
            END IF;

            -- Both locks acquired deterministically; verify both parent version statuses
            IF v_old_status IN ('published', 'archived') THEN
                RAISE EXCEPTION 'Cannot % % on % assessment version (version_id: %). Content is immutable once published.',
                    TG_OP, TG_TABLE_NAME, v_old_status, v_old_version_id;
            END IF;

            IF v_new_status IN ('published', 'archived') THEN
                RAISE EXCEPTION 'Cannot % % into % assessment version (version_id: %). Content is immutable once published.',
                    TG_OP, TG_TABLE_NAME, v_new_status, v_new_version_id;
            END IF;
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_scoring_dimensions_immutability ON public.scoring_dimensions;
CREATE TRIGGER trg_scoring_dimensions_immutability
    BEFORE INSERT OR UPDATE OR DELETE ON public.scoring_dimensions
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_assessment_content_immutability();

DROP TRIGGER IF EXISTS trg_questions_immutability ON public.questions;
CREATE TRIGGER trg_questions_immutability
    BEFORE INSERT OR UPDATE OR DELETE ON public.questions
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_assessment_content_immutability();

DROP TRIGGER IF EXISTS trg_answer_options_immutability ON public.answer_options;
CREATE TRIGGER trg_answer_options_immutability
    BEFORE INSERT OR UPDATE OR DELETE ON public.answer_options
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_assessment_content_immutability();

-- ==============================================================================
-- 5. SESSIONS, RESPONSES & RESULTS (RELATIONAL INTEGRITY ENFORCED)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.assessment_sessions (
    id TEXT PRIMARY KEY DEFAULT ('sess_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
    assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE RESTRICT,
    version_id UUID NOT NULL REFERENCES public.assessment_versions(id) ON DELETE RESTRICT,
    assessment_slug TEXT NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    guest_session_token TEXT NOT NULL UNIQUE,
    guest_email TEXT,
    guest_name TEXT,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    current_question_index INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMPTZ,
    ip_hash TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(id, version_id), -- Enables composite foreign key from user_responses
    CONSTRAINT fk_session_assessment_version
        FOREIGN KEY (version_id, assessment_id)
        REFERENCES public.assessment_versions(id, assessment_id)
        ON DELETE RESTRICT
);

DROP TRIGGER IF EXISTS trg_assessment_sessions_updated_at ON public.assessment_sessions;
CREATE TRIGGER trg_assessment_sessions_updated_at
    BEFORE UPDATE ON public.assessment_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Auto-resolve assessment_id and version_id from slug if omitted
CREATE OR REPLACE FUNCTION public.sync_assessment_session_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.assessment_id IS NULL THEN
        SELECT a.id INTO NEW.assessment_id
        FROM public.assessments a
        WHERE a.slug = NEW.assessment_slug;

        IF NEW.assessment_id IS NULL THEN
            RAISE EXCEPTION 'Assessment with slug % not found', NEW.assessment_slug;
        END IF;
    END IF;

    IF NEW.version_id IS NULL THEN
        SELECT av.id INTO NEW.version_id
        FROM public.assessment_versions av
        WHERE av.assessment_id = NEW.assessment_id AND av.status = 'published'
        ORDER BY av.version_number DESC
        LIMIT 1;

        IF NEW.version_id IS NULL THEN
            RAISE EXCEPTION 'No published version found for assessment %', NEW.assessment_slug;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_assessment_session_version ON public.assessment_sessions;
CREATE TRIGGER trg_sync_assessment_session_version
    BEFORE INSERT ON public.assessment_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_assessment_session_version();

-- User responses with composite foreign keys enforcing version alignment
CREATE TABLE IF NOT EXISTS public.user_responses (
    id TEXT PRIMARY KEY DEFAULT ('resp_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
    session_id TEXT NOT NULL,
    version_id UUID NOT NULL,
    question_id UUID NOT NULL,
    numeric_value INTEGER NOT NULL CHECK (numeric_value BETWEEN 1 AND 5),
    response_time_ms INTEGER CHECK (response_time_ms IS NULL OR response_time_ms >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(session_id, question_id),
    CONSTRAINT fk_response_session_version
        FOREIGN KEY (session_id, version_id)
        REFERENCES public.assessment_sessions(id, version_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_response_question_version
        FOREIGN KEY (question_id, version_id)
        REFERENCES public.questions(id, version_id)
        ON DELETE CASCADE
);

-- Auto-populate version_id from assessment_sessions if omitted
CREATE OR REPLACE FUNCTION public.sync_user_response_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.version_id IS NULL THEN
        SELECT version_id INTO NEW.version_id
        FROM public.assessment_sessions
        WHERE id = NEW.session_id;

        IF NEW.version_id IS NULL THEN
            RAISE EXCEPTION 'Assessment session % not found or has no version_id', NEW.session_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_user_response_version ON public.user_responses;
CREATE TRIGGER trg_sync_user_response_version
    BEFORE INSERT ON public.user_responses
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_user_response_version();

-- Calculated results for assessment sessions
CREATE TABLE IF NOT EXISTS public.calculated_results (
    id TEXT PRIMARY KEY DEFAULT ('res_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
    session_id TEXT NOT NULL UNIQUE REFERENCES public.assessment_sessions(id) ON DELETE CASCADE,
    primary_archetype_key TEXT NOT NULL,
    primary_archetype_title TEXT NOT NULL,
    secondary_archetype_key TEXT,
    secondary_archetype_title TEXT,
    dimension_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
    executive_summary TEXT NOT NULL,
    preview_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    full_report_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 6. ORDERS, PAYMENTS & REPORTS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY, -- e.g. ord_5922501fbd226785
    order_number TEXT NOT NULL UNIQUE, -- e.g. INA-839201
    session_id TEXT REFERENCES public.assessment_sessions(id) ON DELETE SET NULL,
    guest_session_token TEXT NOT NULL,
    assessment_slug TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
    currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
    status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'processing', 'paid', 'failed', 'refunded')),
    razorpay_order_id TEXT UNIQUE,
    razorpay_payment_id TEXT UNIQUE,
    signature_verified BOOLEAN NOT NULL DEFAULT false,
    result_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    report_code TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Financial audit trail: Immutable records. ON DELETE RESTRICT prevents loss of accounting records.
CREATE TABLE IF NOT EXISTS public.payments (
    id TEXT PRIMARY KEY DEFAULT ('pay_tx_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
    order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
    gateway TEXT NOT NULL DEFAULT 'razorpay',
    transaction_id TEXT NOT NULL UNIQUE, -- Razorpay Payment ID
    amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Generated Dossiers with Cryptographic Access Token Hashing (SHA-256)
CREATE TABLE IF NOT EXISTS public.reports (
    id TEXT PRIMARY KEY, -- e.g. rep_38a0bc7291fe928b
    order_id TEXT NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE RESTRICT,
    report_code TEXT NOT NULL UNIQUE, -- e.g. DOSSIER-839201
    access_token_hash TEXT NOT NULL UNIQUE, -- Cryptographic SHA-256 hash of plaintext access token
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    assessment_slug TEXT NOT NULL,
    result_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    page_count INTEGER NOT NULL DEFAULT 12,
    download_count INTEGER NOT NULL DEFAULT 0,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Download Audit Logs
CREATE TABLE IF NOT EXISTS public.report_downloads (
    id TEXT PRIMARY KEY DEFAULT ('dl_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
    report_id TEXT NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
    downloaded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    ip_hash TEXT,
    user_agent TEXT
);

-- ==============================================================================
-- 7. WEBHOOK LIFECYCLE & DEDUPLICATION (State Machine: received/processing/processed/failed)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.webhook_events (
    id TEXT PRIMARY KEY DEFAULT ('wh_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
    event_id TEXT NOT NULL UNIQUE, -- Razorpay Event ID (e.g. evt_xxxx)
    event_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processing', 'processed', 'failed')),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_attempt TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

DROP TRIGGER IF EXISTS trg_webhook_events_updated_at ON public.webhook_events;
CREATE TRIGGER trg_webhook_events_updated_at
    BEFORE UPDATE ON public.webhook_events
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- 8. ADMINISTRATOR RATE LIMITING (Persistent & Concurrency-Safe)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.admin_rate_limits (
    ip TEXT PRIMARY KEY,
    attempts INTEGER NOT NULL DEFAULT 1,
    first_attempt_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

DROP TRIGGER IF EXISTS trg_admin_rate_limits_updated_at ON public.admin_rate_limits;
CREATE TRIGGER trg_admin_rate_limits_updated_at
    BEFORE UPDATE ON public.admin_rate_limits
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- 9. PERFORMANCE & INTEGRITY INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_assessments_slug ON public.assessments(slug);
CREATE INDEX IF NOT EXISTS idx_assessment_versions_lookup ON public.assessment_versions(assessment_id, status);
CREATE INDEX IF NOT EXISTS idx_questions_version ON public.questions(version_id);
CREATE INDEX IF NOT EXISTS idx_questions_code ON public.questions(version_id, question_code);
CREATE INDEX IF NOT EXISTS idx_dimensions_version ON public.scoring_dimensions(version_id);
CREATE INDEX IF NOT EXISTS idx_options_question ON public.answer_options(question_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON public.assessment_sessions(guest_session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_assessment ON public.assessment_sessions(assessment_id, version_id);
CREATE INDEX IF NOT EXISTS idx_responses_session ON public.user_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_responses_session_version ON public.user_responses(session_id, version_id);
CREATE INDEX IF NOT EXISTS idx_responses_question_version ON public.user_responses(question_id, version_id);
CREATE INDEX IF NOT EXISTS idx_orders_razorpay ON public.orders(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_email ON public.orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_reports_code ON public.reports(report_code);
CREATE INDEX IF NOT EXISTS idx_reports_access_hash ON public.reports(access_token_hash);
CREATE INDEX IF NOT EXISTS idx_webhook_event_id ON public.webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_status ON public.webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_admin_rate_ip ON public.admin_rate_limits(ip);

-- ==============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES & COLUMN PRIVILEGES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scoring_dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answer_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calculated_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_rate_limits ENABLE ROW LEVEL SECURITY;

-- 10.1 Public Catalog Protection (Active & Published Only)
CREATE POLICY "Public active assessments read" ON public.assessments
    FOR SELECT USING (is_active = true);

CREATE POLICY "Public published versions read" ON public.assessment_versions
    FOR SELECT USING (
        status = 'published'
        AND EXISTS (
            SELECT 1 FROM public.assessments a
            WHERE a.id = assessment_versions.assessment_id AND a.is_active = true
        )
    );

CREATE POLICY "Public dimensions read" ON public.scoring_dimensions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.assessment_versions av
            JOIN public.assessments a ON a.id = av.assessment_id
            WHERE av.id = scoring_dimensions.version_id
              AND av.status = 'published'
              AND a.is_active = true
        )
    );

CREATE POLICY "Public questions read" ON public.questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.assessment_versions av
            JOIN public.assessments a ON a.id = av.assessment_id
            WHERE av.id = questions.version_id
              AND av.status = 'published'
              AND a.is_active = true
        )
    );

CREATE POLICY "Public answer options read" ON public.answer_options
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.questions q
            JOIN public.assessment_versions av ON av.id = q.version_id
            JOIN public.assessments a ON a.id = av.assessment_id
            WHERE q.id = answer_options.question_id
              AND av.status = 'published'
              AND a.is_active = true
        )
    );

-- 10.2 Scoring Weights Confidentiality (Column-Level Access Control)
-- Revoke all direct SELECT on answer_options from PUBLIC, anon, and authenticated
REVOKE SELECT ON public.answer_options FROM PUBLIC, anon, authenticated;
-- Grant SELECT ONLY on non-confidential columns to public clients
GRANT SELECT (id, question_id, order_index, label, value, created_at) ON public.answer_options TO anon, authenticated;
-- Grant full access strictly to trusted server-side role
GRANT ALL ON public.answer_options TO service_role;

-- Safe client view without dimension_weights
CREATE OR REPLACE VIEW public.public_answer_options
WITH (security_invoker = true)
AS
SELECT
    id,
    question_id,
    order_index,
    label,
    value,
    created_at
FROM public.answer_options;

-- 10.3 Profile Role Protection in RLS (Non-recursive: delegates column immutability to trigger)
CREATE POLICY "Users read own profile" ON public.profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

-- Authenticated users may update only their own row.
-- Role modification is intercepted and rejected by trg_prevent_profile_role_escalation.
-- Note: Self-referencing subqueries against public.profiles are avoided to prevent recursive RLS evaluation.
CREATE POLICY "Users update own profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 10.4 Private Tables: STRICT DEFAULT DENY for Anonymous and Public Access
-- All order queries, payments, reports, and rate limits MUST use service_role client on server
CREATE POLICY "Deny anon orders select" ON public.orders FOR SELECT TO anon USING (false);
CREATE POLICY "Deny anon orders insert" ON public.orders FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "Deny anon orders update" ON public.orders FOR UPDATE TO anon USING (false);

CREATE POLICY "Deny anon reports select" ON public.reports FOR SELECT TO anon USING (false);
CREATE POLICY "Deny anon payments select" ON public.payments FOR SELECT TO anon USING (false);
CREATE POLICY "Deny anon webhook_events" ON public.webhook_events FOR ALL TO anon USING (false);
CREATE POLICY "Deny anon admin_rate_limits" ON public.admin_rate_limits FOR ALL TO anon USING (false);

-- ==============================================================================
-- 11. ATOMIC DATABASE RPC FUNCTIONS & PRIVILEGE HARDENING
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- RPC 1: fulfill_order_payment
-- Transactionally validates payment, marks order paid, records audit payment, and generates report record
-- Strictly checks incoming payment ID against paid orders for idempotent conflict detection
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fulfill_order_payment(
    p_order_id TEXT,
    p_payment_id TEXT,
    p_signature TEXT,
    p_amount_paise INTEGER,
    p_currency TEXT,
    p_report_id TEXT,
    p_report_code TEXT,
    p_access_token_hash TEXT,
    p_page_count INTEGER DEFAULT 12
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_order RECORD;
    v_report RECORD;
    v_existing_payment RECORD;
    v_inserted_payment_id TEXT;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    -- 0. Fail closed immediately on missing or empty payment ID
    IF p_payment_id IS NULL OR trim(p_payment_id) = '' THEN
        RAISE EXCEPTION 'Payment fulfillment rejected: payment_id cannot be null or empty';
    END IF;

    -- 1. Select and lock order row
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order % not found', p_order_id;
    END IF;

    -- 2. Validate payment amount
    IF v_order.amount_paise != p_amount_paise THEN
        RAISE EXCEPTION 'Payment amount mismatch for order %. Expected: %, Received: %',
            p_order_id, v_order.amount_paise, p_amount_paise;
    END IF;

    -- 3. Validate payment currency
    IF v_order.currency != p_currency THEN
        RAISE EXCEPTION 'Payment currency mismatch for order %. Expected: %, Received: %',
            p_order_id, v_order.currency, p_currency;
    END IF;

    -- 4. Check if payment transaction ID already exists in payments audit log
    SELECT * INTO v_existing_payment
    FROM public.payments
    WHERE transaction_id = p_payment_id
    FOR UPDATE;

    IF FOUND THEN
        -- Transaction already recorded. Verify it belongs strictly to this order
        IF v_existing_payment.order_id != p_order_id THEN
            RAISE EXCEPTION 'Payment transaction conflict: Transaction % already belongs to order %, cannot be reused for order %',
                p_payment_id, v_existing_payment.order_id, p_order_id;
        END IF;

        -- Verify recorded amount matches
        IF v_existing_payment.amount_paise != p_amount_paise THEN
            RAISE EXCEPTION 'Payment transaction amount mismatch: Transaction % recorded with amount %, received %',
                p_payment_id, v_existing_payment.amount_paise, p_amount_paise;
        END IF;

        -- Verify recorded currency matches
        IF v_existing_payment.currency != p_currency THEN
            RAISE EXCEPTION 'Payment transaction currency mismatch: Transaction % recorded with currency %, received %',
                p_payment_id, v_existing_payment.currency, p_currency;
        END IF;
    END IF;

    -- 5. Check for idempotent already-paid state with strict payment validation
    IF v_order.status = 'paid' THEN
        -- If order is marked paid but has no recorded payment ID, fail closed on inconsistent payment state
        IF v_order.razorpay_payment_id IS NULL OR trim(v_order.razorpay_payment_id) = '' THEN
            RAISE EXCEPTION 'Inconsistent payment state: Order % is marked as paid but has no recorded payment ID', p_order_id;
        END IF;

        -- Recorded payment ID must match the incoming payment ID exactly
        IF v_order.razorpay_payment_id != p_payment_id THEN
            RAISE EXCEPTION 'Payment conflict: Order % is already paid with payment ID %, received conflicting payment ID %',
                p_order_id, v_order.razorpay_payment_id, p_payment_id;
        END IF;

        SELECT * INTO v_report FROM public.reports WHERE order_id = p_order_id;
        RETURN jsonb_build_object(
            'success', true,
            'already_processed', true,
            'order_id', v_order.id,
            'report_code', COALESCE(v_report.report_code, v_order.report_code),
            'status', v_order.status
        );
    END IF;

    -- 5. Mark order as paid
    UPDATE public.orders
    SET status = 'paid',
        razorpay_payment_id = p_payment_id,
        signature_verified = true,
        report_code = p_report_code,
        updated_at = v_now
    WHERE id = p_order_id
    RETURNING * INTO v_order;

    -- 6. Insert Report record with cryptographic access token hash
    INSERT INTO public.reports (
        id,
        order_id,
        report_code,
        access_token_hash,
        customer_name,
        customer_email,
        assessment_slug,
        result_payload,
        page_count,
        download_count,
        generated_at
    ) VALUES (
        p_report_id,
        v_order.id,
        p_report_code,
        p_access_token_hash,
        v_order.customer_name,
        v_order.customer_email,
        v_order.assessment_slug,
        v_order.result_payload,
        p_page_count,
        0,
        v_now
    )
    ON CONFLICT (order_id) DO UPDATE
    SET report_code = EXCLUDED.report_code,
        access_token_hash = EXCLUDED.access_token_hash
    RETURNING * INTO v_report;

    -- 7. Record payment transaction in audit log (immutable financial record)
    -- Handles concurrent race on previously unseen transaction IDs via ON CONFLICT DO NOTHING + RETURNING
    INSERT INTO public.payments (
        order_id,
        gateway,
        transaction_id,
        amount_paise,
        currency,
        status,
        payload,
        created_at
    ) VALUES (
        v_order.id,
        'razorpay',
        p_payment_id,
        p_amount_paise,
        p_currency,
        'captured',
        jsonb_build_object(
            'order_id', p_order_id, 
            'payment_id', p_payment_id,
            'verified_at', v_now
        ),
        v_now
    )
    ON CONFLICT (transaction_id) DO NOTHING
    RETURNING id INTO v_inserted_payment_id;

    -- If another concurrent transaction inserted the same transaction_id first,
    -- lock and verify the winning record to prevent cross-order transaction reuse
    IF v_inserted_payment_id IS NULL THEN
        SELECT * INTO v_existing_payment
        FROM public.payments
        WHERE transaction_id = p_payment_id
        FOR UPDATE;

        IF FOUND THEN
            IF v_existing_payment.order_id != p_order_id THEN
                RAISE EXCEPTION 'Payment transaction conflict: Transaction % already claimed by order %, cannot be reused for order %',
                    p_payment_id, v_existing_payment.order_id, p_order_id;
            END IF;

            IF v_existing_payment.amount_paise != p_amount_paise THEN
                RAISE EXCEPTION 'Payment transaction amount mismatch: Transaction % recorded with amount %, received %',
                    p_payment_id, v_existing_payment.amount_paise, p_amount_paise;
            END IF;

            IF v_existing_payment.currency != p_currency THEN
                RAISE EXCEPTION 'Payment transaction currency mismatch: Transaction % recorded with currency %, received %',
                    p_payment_id, v_existing_payment.currency, p_currency;
            END IF;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'already_processed', false,
        'order_id', v_order.id,
        'report_id', v_report.id,
        'report_code', v_report.report_code,
        'status', v_order.status
    );
END;
$$;

-- Restrict fulfill_order_payment: ONLY service_role can execute
REVOKE EXECUTE ON FUNCTION public.fulfill_order_payment(TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_order_payment(TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, INTEGER) TO service_role;

-- ------------------------------------------------------------------------------
-- RPC 2: record_webhook_event_idempotent
-- Implements robust webhook state machine: received -> processing -> processed / failed
-- Handles simultaneous first-time inserts atomically via ON CONFLICT DO NOTHING + FOR UPDATE
-- Supports safe retry on failure and concurrency locking
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_webhook_event_idempotent(
    p_event_id TEXT,
    p_event_type TEXT,
    p_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_existing RECORD;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    -- 1. Atomically ensure event row exists without duplicate key race conditions
    INSERT INTO public.webhook_events (
        event_id, event_type, status, payload, retry_count, last_attempt, created_at, updated_at
    ) VALUES (
        p_event_id, p_event_type, 'received', p_payload, 0, v_now, v_now, v_now
    )
    ON CONFLICT (event_id) DO NOTHING;

    -- 2. Acquire exclusive row-level lock on the guaranteed row
    SELECT * INTO v_existing
    FROM public.webhook_events
    WHERE event_id = p_event_id
    FOR UPDATE;

    -- 3. Case A: First-time processing (newly inserted row with status = 'received')
    IF v_existing.status = 'received' THEN
        UPDATE public.webhook_events
        SET status = 'processing',
            retry_count = 1,
            last_attempt = v_now,
            updated_at = v_now
        WHERE event_id = p_event_id;

        RETURN jsonb_build_object(
            'should_process', true,
            'status', 'processing',
            'is_retry', false,
            'retry_count', 1
        );
    END IF;

    -- 4. Case B: Event already successfully processed
    IF v_existing.status = 'processed' THEN
        RETURN jsonb_build_object(
            'should_process', false,
            'status', 'processed',
            'is_retry', false,
            'retry_count', v_existing.retry_count
        );
    END IF;

    -- 5. Case C: In-flight processing lock (processing started within last 2 minutes)
    IF v_existing.status = 'processing' AND v_existing.last_attempt > (v_now - INTERVAL '2 minutes') THEN
        RETURN jsonb_build_object(
            'should_process', false,
            'status', 'in_flight',
            'is_retry', true,
            'retry_count', v_existing.retry_count
        );
    END IF;

    -- 6. Case D: Safe retry (failed status OR stale processing timeout > 2 minutes)
    UPDATE public.webhook_events
    SET status = 'processing',
        retry_count = v_existing.retry_count + 1,
        last_attempt = v_now,
        updated_at = v_now,
        error_message = NULL
    WHERE event_id = p_event_id;

    RETURN jsonb_build_object(
        'should_process', true,
        'status', 'processing',
        'is_retry', true,
        'retry_count', v_existing.retry_count + 1
    );
END;
$$;

-- Restrict record_webhook_event_idempotent: ONLY service_role can execute
REVOKE EXECUTE ON FUNCTION public.record_webhook_event_idempotent(TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_webhook_event_idempotent(TEXT, TEXT, JSONB) TO service_role;

-- ------------------------------------------------------------------------------
-- RPC 3: finalize_webhook_event
-- Transition webhook to final status: processed or failed
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finalize_webhook_event(
    p_event_id TEXT,
    p_status TEXT,
    p_error TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_updated RECORD;
BEGIN
    IF p_status NOT IN ('processed', 'failed') THEN
        RAISE EXCEPTION 'Invalid final webhook status: %. Allowed: processed, failed', p_status;
    END IF;

    UPDATE public.webhook_events
    SET status = p_status,
        processed_at = CASE WHEN p_status = 'processed' THEN v_now ELSE NULL END,
        error_message = p_error,
        updated_at = v_now
    WHERE event_id = p_event_id
    RETURNING * INTO v_updated;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Webhook event % not found', p_event_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'event_id', p_event_id,
        'status', v_updated.status
    );
END;
$$;

-- Restrict finalize_webhook_event: ONLY service_role can execute
REVOKE EXECUTE ON FUNCTION public.finalize_webhook_event(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_webhook_event(TEXT, TEXT, TEXT) TO service_role;

-- ------------------------------------------------------------------------------
-- RPC 4: check_and_record_admin_attempt
-- Concurrency-safe atomic UPSERT with row-locking for administrator rate limiting
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_and_record_admin_attempt(
    p_ip TEXT,
    p_success BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_record RECORD;
    v_remaining INTEGER;
BEGIN
    -- 1. If login succeeded, reset any failed attempts for this IP
    IF p_success THEN
        DELETE FROM public.admin_rate_limits WHERE ip = p_ip;
        RETURN jsonb_build_object(
            'allowed', true,
            'remaining_attempts', 5,
            'retry_after_seconds', 0
        );
    END IF;

    -- 2. Concurrency-safe atomic UPSERT with row-level locking
    INSERT INTO public.admin_rate_limits (
        ip,
        attempts,
        first_attempt_at,
        last_attempt_at,
        locked_until,
        created_at,
        updated_at
    ) VALUES (
        p_ip,
        1,
        v_now,
        v_now,
        NULL,
        v_now,
        v_now
    )
    ON CONFLICT (ip) DO UPDATE SET
        attempts = CASE
            -- If currently locked and lockout expired: reset to 1
            WHEN admin_rate_limits.locked_until IS NOT NULL AND admin_rate_limits.locked_until <= v_now
                THEN 1
            -- If 15-minute window expired since first attempt: reset to 1
            WHEN admin_rate_limits.first_attempt_at + INTERVAL '15 minutes' < v_now
                THEN 1
            -- If currently locked and lockout is active: do not increment past max, keep locked
            WHEN admin_rate_limits.locked_until IS NOT NULL AND admin_rate_limits.locked_until > v_now
                THEN admin_rate_limits.attempts
            -- Otherwise increment attempt counter
            ELSE admin_rate_limits.attempts + 1
        END,
        first_attempt_at = CASE
            WHEN (admin_rate_limits.locked_until IS NOT NULL AND admin_rate_limits.locked_until <= v_now)
              OR (admin_rate_limits.first_attempt_at + INTERVAL '15 minutes' < v_now)
                THEN v_now
            ELSE admin_rate_limits.first_attempt_at
        END,
        last_attempt_at = v_now,
        locked_until = CASE
            -- If currently locked and still in lockout window: preserve lockout
            WHEN admin_rate_limits.locked_until IS NOT NULL AND admin_rate_limits.locked_until > v_now
                THEN admin_rate_limits.locked_until
            -- If lock expired: clear lock
            WHEN admin_rate_limits.locked_until IS NOT NULL AND admin_rate_limits.locked_until <= v_now
                THEN NULL
            -- If window expired: clear lock
            WHEN admin_rate_limits.first_attempt_at + INTERVAL '15 minutes' < v_now
                THEN NULL
            -- If this attempt reaches or exceeds limit (>= 5 attempts): lock for 15 minutes
            WHEN admin_rate_limits.attempts + 1 >= 5
                THEN v_now + INTERVAL '15 minutes'
            ELSE NULL
        END,
        updated_at = v_now
    RETURNING * INTO v_record;

    -- 3. Calculate status and remaining attempts
    IF v_record.locked_until IS NOT NULL AND v_record.locked_until > v_now THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'remaining_attempts', 0,
            'retry_after_seconds', GREATEST(1, EXTRACT(EPOCH FROM (v_record.locked_until - v_now))::INTEGER)
        );
    END IF;

    v_remaining := GREATEST(0, 5 - v_record.attempts);
    RETURN jsonb_build_object(
        'allowed', v_remaining > 0,
        'remaining_attempts', v_remaining,
        'retry_after_seconds', 0
    );
END;
$$;

-- Restrict check_and_record_admin_attempt: ONLY service_role can execute
REVOKE EXECUTE ON FUNCTION public.check_and_record_admin_attempt(TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_record_admin_attempt(TEXT, BOOLEAN) TO service_role;

-- ------------------------------------------------------------------------------
-- RPC 5: admin_set_user_role
-- Trusted server-side administrative operation for setting profile roles
-- ------------------------------------------------------------------------------
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

-- Restrict admin_set_user_role: STRICTLY service_role only
REVOKE EXECUTE ON FUNCTION public.admin_set_user_role(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(UUID, TEXT) TO service_role;

-- ------------------------------------------------------------------------------
-- RPC 6: publish_assessment_version
-- Administrative RPC to publish an assessment version, archiving prior versions
-- and bumping the assessment's current_version pointer
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.publish_assessment_version(
    p_version_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_version RECORD;
    v_assessment RECORD;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_jwt_role TEXT;
BEGIN
    -- Verify caller context is trusted service_role
    v_jwt_role := COALESCE(
        current_setting('request.jwt.claim.role', true),
        (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'),
        ''
    );

    IF v_jwt_role IN ('authenticated', 'anon') OR current_user IN ('authenticated', 'anon') THEN
        RAISE EXCEPTION 'Unauthorized: RPC publish_assessment_version requires trusted service_role privileges.';
    END IF;

    -- Select and lock target version
    SELECT * INTO v_version
    FROM public.assessment_versions
    WHERE id = p_version_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Assessment version % not found', p_version_id;
    END IF;

    IF v_version.status = 'published' THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_published', true,
            'version_id', v_version.id,
            'version_number', v_version.version_number
        );
    END IF;

    IF v_version.status = 'archived' THEN
        RAISE EXCEPTION 'Cannot publish archived version %', p_version_id;
    END IF;

    -- Lock parent assessment row
    SELECT * INTO v_assessment
    FROM public.assessments
    WHERE id = v_version.assessment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Assessment % not found for version %', v_version.assessment_id, p_version_id;
    END IF;

    -- Reject version number regression or duplicate published version number
    IF v_version.version_number <= v_assessment.current_version THEN
        RAISE EXCEPTION 'Version regression rejected: Target version number % must be strictly greater than current published version number % for assessment % (id: %).',
            v_version.version_number, v_assessment.current_version, v_assessment.slug, v_assessment.id;
    END IF;

    -- Archive existing published version(s) for this assessment
    UPDATE public.assessment_versions
    SET status = 'archived',
        updated_at = v_now
    WHERE assessment_id = v_version.assessment_id
      AND status = 'published'
      AND id != p_version_id;

    -- Mark target version as published
    UPDATE public.assessment_versions
    SET status = 'published',
        published_at = v_now,
        updated_at = v_now
    WHERE id = p_version_id;

    -- Update assessment current_version
    UPDATE public.assessments
    SET current_version = v_version.version_number,
        updated_at = v_now
    WHERE id = v_version.assessment_id;

    RETURN jsonb_build_object(
        'success', true,
        'version_id', v_version.id,
        'version_number', v_version.version_number,
        'assessment_id', v_version.assessment_id,
        'status', 'published'
    );
END;
$$;

-- Restrict publish_assessment_version: STRICTLY service_role only
REVOKE EXECUTE ON FUNCTION public.publish_assessment_version(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_assessment_version(UUID) TO service_role;

-- ==============================================================================
-- 12. EXPLICIT DATABASE PRIVILEGES & ACCESS CONTROL (LEAST PRIVILEGE)
-- ==============================================================================

-- 12.0 Explicit Schema-Level Privileges on Schema public
-- Ensure PUBLIC has zero privileges on schema public
REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

-- Ensure anon and authenticated have zero CREATE privileges on schema public
REVOKE ALL ON SCHEMA public FROM anon, authenticated;
REVOKE CREATE ON SCHEMA public FROM anon, authenticated;

-- Grant USAGE strictly (needed for schema object resolution by legitimate client queries)
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant full schema administration privileges strictly to service_role
GRANT ALL ON SCHEMA public TO service_role;

-- 12.1 Revoke default schema privileges from PUBLIC
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;

-- 12.2 Revoke table privileges from anon and authenticated across all tables
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

-- 12.3 Explicit SELECT grants on Public Assessment Catalog
GRANT SELECT ON public.assessments TO anon, authenticated;
GRANT SELECT ON public.assessment_versions TO anon, authenticated;
GRANT SELECT ON public.scoring_dimensions TO anon, authenticated;
GRANT SELECT ON public.questions TO anon, authenticated;
GRANT SELECT ON public.public_answer_options TO anon, authenticated;

-- 12.4 Answer options: Restrictive column-level grant (dimension_weights omitted)
GRANT SELECT (id, question_id, order_index, label, value, created_at) ON public.answer_options TO anon, authenticated;

-- 12.5 User Profiles: Authenticated users can view and update their own profiles
GRANT SELECT, UPDATE ON public.profiles TO authenticated;

-- 12.6 Explicitly verify private business tables have NO privileges granted to anon or authenticated
REVOKE ALL ON public.orders FROM anon, authenticated;
REVOKE ALL ON public.payments FROM anon, authenticated;
REVOKE ALL ON public.reports FROM anon, authenticated;
REVOKE ALL ON public.report_downloads FROM anon, authenticated;
REVOKE ALL ON public.webhook_events FROM anon, authenticated;
REVOKE ALL ON public.admin_rate_limits FROM anon, authenticated;
REVOKE ALL ON public.assessment_sessions FROM anon, authenticated;
REVOKE ALL ON public.user_responses FROM anon, authenticated;
REVOKE ALL ON public.calculated_results FROM anon, authenticated;

-- 12.7 Service Role: Full administrative privileges for trusted server-side operations
GRANT ALL ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;
