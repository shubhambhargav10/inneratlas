-- ==============================================================================
-- INNERATLAS PHASE 2 DATABASE MIGRATION
-- Production PostgreSQL Schema & Storage Engine for Supabase
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. USERS & PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. ASSESSMENTS CATALOGUE
CREATE TABLE IF NOT EXISTS public.assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    subtitle TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL, -- 'Personality', 'Career', 'Cognitive'
    version INTEGER NOT NULL DEFAULT 1,
    estimated_minutes INTEGER NOT NULL DEFAULT 12,
    price_inr INTEGER NOT NULL DEFAULT 199,
    compare_price_inr INTEGER NOT NULL DEFAULT 499,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 1,
    cover_image TEXT,
    badge_label TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. SCORING DIMENSIONS
CREATE TABLE IF NOT EXISTS public.scoring_dimensions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    low_label TEXT NOT NULL,
    high_label TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(assessment_id, key)
);

-- 5. QUESTIONS
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    context_hint TEXT,
    question_type TEXT NOT NULL DEFAULT 'likert_5' CHECK (question_type IN ('likert_5', 'single_choice')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(assessment_id, order_index)
);

-- 6. ANSWER OPTIONS
CREATE TABLE IF NOT EXISTS public.answer_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    label TEXT NOT NULL,
    value INTEGER NOT NULL,
    dimension_weights JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. ASSESSMENT SESSIONS (Guest-First + Registered Users)
CREATE TABLE IF NOT EXISTS public.assessment_sessions (
    id TEXT PRIMARY KEY DEFAULT ('sess_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
    assessment_slug TEXT NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    guest_session_token TEXT NOT NULL UNIQUE,
    guest_email TEXT,
    guest_name TEXT,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    current_question_index INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    ip_hash TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. USER RESPONSES
CREATE TABLE IF NOT EXISTS public.user_responses (
    id TEXT PRIMARY KEY DEFAULT ('resp_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
    session_id TEXT NOT NULL REFERENCES public.assessment_sessions(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL,
    numeric_value INTEGER NOT NULL,
    response_time_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(session_id, question_id)
);

-- 9. CALCULATED RESULTS
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
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY, -- e.g. ord_5922501fbd226785
    order_number TEXT NOT NULL UNIQUE, -- e.g. INA-839201
    session_id TEXT,
    guest_session_token TEXT NOT NULL,
    assessment_slug TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
    currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
    status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'processing', 'paid', 'failed', 'refunded')),
    razorpay_order_id TEXT UNIQUE,
    razorpay_payment_id TEXT UNIQUE,
    razorpay_signature TEXT,
    result_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    report_code TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. PAYMENTS (Audit log of all gateway transactions)
CREATE TABLE IF NOT EXISTS public.payments (
    id TEXT PRIMARY KEY DEFAULT ('pay_tx_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
    order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    gateway TEXT NOT NULL DEFAULT 'razorpay',
    transaction_id TEXT NOT NULL UNIQUE, -- Razorpay Payment ID
    amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL,
    signature TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. REPORTS (Generated Dossiers with Cryptographic Access Token Hashing)
CREATE TABLE IF NOT EXISTS public.reports (
    id TEXT PRIMARY KEY, -- e.g. rep_38a0bc7291fe928b
    order_id TEXT NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
    report_code TEXT NOT NULL UNIQUE, -- e.g. DOSSIER-839201
    access_token_hash TEXT NOT NULL UNIQUE, -- Cryptographic SHA-256 hash of access token
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    assessment_slug TEXT NOT NULL,
    result_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    page_count INTEGER NOT NULL DEFAULT 12,
    download_count INTEGER NOT NULL DEFAULT 0,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. REPORT DOWNLOAD AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.report_downloads (
    id TEXT PRIMARY KEY DEFAULT ('dl_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
    report_id TEXT NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    downloaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_hash TEXT,
    user_agent TEXT
);

-- 14. WEBHOOK EVENTS (Database-backed deduplication and audit trail)
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id TEXT PRIMARY KEY DEFAULT ('wh_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
    event_id TEXT NOT NULL UNIQUE, -- Razorpay Event ID (e.g. evt_xxxx)
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. ADMINISTRATOR RATE LIMITING (Persistent & Concurrency-Safe across instances)
CREATE TABLE IF NOT EXISTS public.admin_rate_limits (
    ip TEXT PRIMARY KEY,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_attempt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locked_until TIMESTAMPTZ
);

-- 16. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_assessments_slug ON public.assessments(slug);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON public.assessment_sessions(guest_session_token);
CREATE INDEX IF NOT EXISTS idx_orders_razorpay ON public.orders(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_email ON public.orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_reports_code ON public.reports(report_code);
CREATE INDEX IF NOT EXISTS idx_reports_access_hash ON public.reports(access_token_hash);
CREATE INDEX IF NOT EXISTS idx_webhook_event_id ON public.webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_admin_rate_ip ON public.admin_rate_limits(ip);

-- ==============================================================================
-- 17. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
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

-- Catalog tables are publicly readable (anonymous can view assessments, questions, dimensions)
CREATE POLICY "Public assessments read" ON public.assessments FOR SELECT USING (is_active = true);
CREATE POLICY "Public dimensions read" ON public.scoring_dimensions FOR SELECT USING (true);
CREATE POLICY "Public questions read" ON public.questions FOR SELECT USING (true);
CREATE POLICY "Public answer options read" ON public.answer_options FOR SELECT USING (true);

-- User Profiles: users can read and update only their own profile
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Private tables: STRICT DEFAULT DENY for anonymous and public access
-- Server-side API endpoints use the Supabase Service Role Key which bypasses RLS securely.
-- Any direct public/anon access to customer orders, payments, reports, or webhooks is BLOCKED.
CREATE POLICY "Deny anon orders select" ON public.orders FOR SELECT TO anon USING (false);
CREATE POLICY "Deny anon orders insert" ON public.orders FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "Deny anon orders update" ON public.orders FOR UPDATE TO anon USING (false);

CREATE POLICY "Deny anon reports select" ON public.reports FOR SELECT TO anon USING (false);
CREATE POLICY "Deny anon payments select" ON public.payments FOR SELECT TO anon USING (false);
CREATE POLICY "Deny anon webhook_events" ON public.webhook_events FOR ALL TO anon USING (false);
CREATE POLICY "Deny anon admin_rate_limits" ON public.admin_rate_limits FOR ALL TO anon USING (false);

-- ==============================================================================
-- 18. ATOMIC DATABASE RPC FUNCTIONS
-- ==============================================================================

-- RPC 1: Fulfill Order Payment Atomically
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
AS $$
DECLARE
    v_order RECORD;
    v_report RECORD;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- 1. Select and lock order row
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order % not found', p_order_id;
    END IF;

    -- 2. Check for idempotent already-paid state
    IF v_order.status = 'paid' THEN
        SELECT * INTO v_report FROM public.reports WHERE order_id = p_order_id;
        RETURN jsonb_build_object(
            'success', true,
            'already_processed', true,
            'order_id', v_order.id,
            'report_code', COALESCE(v_report.report_code, v_order.report_code),
            'status', v_order.status
        );
    END IF;

    -- 3. Validate payment amount
    IF v_order.amount_paise != p_amount_paise THEN
        RAISE EXCEPTION 'Payment amount mismatch for order %. Expected: %, Received: %',
            p_order_id, v_order.amount_paise, p_amount_paise;
    END IF;

    -- 4. Validate currency
    IF v_order.currency != p_currency THEN
        RAISE EXCEPTION 'Payment currency mismatch for order %. Expected: %, Received: %',
            p_order_id, v_order.currency, p_currency;
    END IF;

    -- 5. Mark order as paid
    UPDATE public.orders
    SET status = 'paid',
        razorpay_payment_id = p_payment_id,
        razorpay_signature = p_signature,
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

    -- 7. Record payment transaction in audit log
    INSERT INTO public.payments (
        order_id,
        gateway,
        transaction_id,
        amount_paise,
        currency,
        status,
        signature,
        payload,
        created_at
    ) VALUES (
        v_order.id,
        'razorpay',
        p_payment_id,
        p_amount_paise,
        p_currency,
        'captured',
        p_signature,
        jsonb_build_object('order_id', p_order_id, 'payment_id', p_payment_id),
        v_now
    )
    ON CONFLICT (transaction_id) DO NOTHING;

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

-- RPC 2: Record Webhook Event Idempotently
CREATE OR REPLACE FUNCTION public.record_webhook_event_idempotent(
    p_event_id TEXT,
    p_event_type TEXT,
    p_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.webhook_events (event_id, event_type, payload, processed_at)
    VALUES (p_event_id, p_event_type, p_payload, NOW());
    RETURN true; -- Newly inserted
EXCEPTION
    WHEN unique_violation THEN
        RETURN false; -- Already processed (duplicate event)
END;
$$;

-- RPC 3: Persistent Admin Rate Limiting
CREATE OR REPLACE FUNCTION public.check_and_record_admin_attempt(
    p_ip TEXT,
    p_success BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_record RECORD;
    v_now TIMESTAMPTZ := NOW();
    v_locked_until TIMESTAMPTZ;
    v_remaining INTEGER;
BEGIN
    SELECT * INTO v_record
    FROM public.admin_rate_limits
    WHERE ip = p_ip
    FOR UPDATE;

    IF p_success THEN
        -- Successful authentication resets failed attempts
        DELETE FROM public.admin_rate_limits WHERE ip = p_ip;
        RETURN jsonb_build_object('allowed', true, 'remaining_attempts', 5);
    END IF;

    IF FOUND THEN
        -- Check if currently locked
        IF v_record.locked_until IS NOT NULL AND v_record.locked_until > v_now THEN
            RETURN jsonb_build_object(
                'allowed', false,
                'remaining_attempts', 0,
                'retry_after_seconds', EXTRACT(EPOCH FROM (v_record.locked_until - v_now))::INTEGER
            );
        END IF;

        -- Reset window if last attempt was > 15 minutes ago
        IF v_now - v_record.last_attempt > INTERVAL '15 minutes' THEN
            UPDATE public.admin_rate_limits
            SET attempts = 1,
                last_attempt = v_now,
                locked_until = NULL
            WHERE ip = p_ip;
            RETURN jsonb_build_object('allowed', true, 'remaining_attempts', 4);
        END IF;

        -- Increment attempts
        IF v_record.attempts + 1 >= 5 THEN
            v_locked_until := v_now + INTERVAL '15 minutes';
            UPDATE public.admin_rate_limits
            SET attempts = v_record.attempts + 1,
                last_attempt = v_now,
                locked_until = v_locked_until
            WHERE ip = p_ip;
            RETURN jsonb_build_object(
                'allowed', false,
                'remaining_attempts', 0,
                'retry_after_seconds', 900
            );
        ELSE
            UPDATE public.admin_rate_limits
            SET attempts = v_record.attempts + 1,
                last_attempt = v_now
            WHERE ip = p_ip;
            v_remaining := 5 - (v_record.attempts + 1);
            RETURN jsonb_build_object('allowed', true, 'remaining_attempts', v_remaining);
        END IF;
    ELSE
        -- First failed attempt
        INSERT INTO public.admin_rate_limits (ip, attempts, last_attempt)
        VALUES (p_ip, 1, v_now);
        RETURN jsonb_build_object('allowed', true, 'remaining_attempts', 4);
    END IF;
END;
$$;
