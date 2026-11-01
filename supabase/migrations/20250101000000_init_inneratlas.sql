-- ==============================================================================
-- INNERATLAS DATABASE SCHEMA (PostgreSQL / Supabase)
-- High-Performance Self-Discovery Digital Product Platform
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE (Integrated with Supabase Auth or standalone)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ASSESSMENTS CATALOGUE
CREATE TABLE IF NOT EXISTS public.assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    subtitle TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL, -- 'Personality', 'Career', 'Cognitive'
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

-- 3. SCORING DIMENSIONS
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

-- 4. QUESTIONS
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

-- 5. ANSWER OPTIONS
CREATE TABLE IF NOT EXISTS public.answer_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    label TEXT NOT NULL,
    value INTEGER NOT NULL, -- e.g. 1 to 5
    dimension_weights JSONB NOT NULL DEFAULT '{}'::jsonb, -- e.g. {"analytical": 1.0, "creative": -0.5}
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. ASSESSMENT SESSIONS (Guest-first + Registered users)
CREATE TABLE IF NOT EXISTS public.assessment_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    guest_session_token TEXT NOT NULL UNIQUE, -- Cryptographic random token stored on client
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

-- 7. USER RESPONSES
CREATE TABLE IF NOT EXISTS public.user_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.assessment_sessions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    selected_option_id UUID REFERENCES public.answer_options(id) ON DELETE SET NULL,
    numeric_value INTEGER NOT NULL,
    response_time_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(session_id, question_id)
);

-- 8. CALCULATED RESULTS
CREATE TABLE IF NOT EXISTS public.calculated_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL UNIQUE REFERENCES public.assessment_sessions(id) ON DELETE CASCADE,
    primary_archetype_key TEXT NOT NULL,
    primary_archetype_title TEXT NOT NULL,
    secondary_archetype_key TEXT,
    secondary_archetype_title TEXT,
    dimension_scores JSONB NOT NULL DEFAULT '{}'::jsonb, -- normalized 0-100 scores per dimension
    executive_summary TEXT NOT NULL,
    preview_data JSONB NOT NULL DEFAULT '{}'::jsonb, -- free preview highlights
    full_report_data JSONB NOT NULL DEFAULT '{}'::jsonb, -- locked full payload
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT NOT NULL UNIQUE,
    session_id UUID NOT NULL REFERENCES public.assessment_sessions(id) ON DELETE RESTRICT,
    assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE RESTRICT,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    customer_email TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    amount_paise INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'processing', 'paid', 'failed', 'refunded')),
    razorpay_order_id TEXT UNIQUE,
    razorpay_payment_id TEXT UNIQUE,
    razorpay_signature TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. PAYMENTS (Audit log of transactions)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    gateway TEXT NOT NULL DEFAULT 'razorpay',
    transaction_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. REPORTS (Generated Dossiers)
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.assessment_sessions(id) ON DELETE CASCADE,
    report_code TEXT NOT NULL UNIQUE, -- e.g. INA-2025-XXXXX
    access_token TEXT NOT NULL UNIQUE, -- Secure token to view/download
    file_url TEXT,
    storage_path TEXT,
    page_count INTEGER NOT NULL DEFAULT 12,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. REPORT DOWNLOAD LOGS
CREATE TABLE IF NOT EXISTS public.report_downloads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    downloaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_hash TEXT,
    user_agent TEXT
);

-- 13. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_assessments_slug ON public.assessments(slug);
CREATE INDEX IF NOT EXISTS idx_questions_assessment_order ON public.questions(assessment_id, order_index);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON public.assessment_sessions(guest_session_token);
CREATE INDEX IF NOT EXISTS idx_user_responses_session ON public.user_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_orders_razorpay ON public.orders(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_email ON public.orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_reports_code ON public.reports(report_code);
CREATE INDEX IF NOT EXISTS idx_reports_access ON public.reports(access_token);

-- 14. ROW LEVEL SECURITY (RLS) POLICIES
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

-- Assessments, Dimensions, Questions and Options are publicly readable
CREATE POLICY "Public assessments read" ON public.assessments FOR SELECT USING (is_active = true);
CREATE POLICY "Public dimensions read" ON public.scoring_dimensions FOR SELECT USING (true);
CREATE POLICY "Public questions read" ON public.questions FOR SELECT USING (true);
CREATE POLICY "Public answer options read" ON public.answer_options FOR SELECT USING (true);

-- User Profiles: users can read and update their own profile
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Sessions: Guests can insert sessions and read only their own session by matching guest_session_token
CREATE POLICY "Anyone can create session" ON public.assessment_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Read own session" ON public.assessment_sessions FOR SELECT USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
    (guest_session_token = current_setting('request.headers', true)::json->>'x-session-token')
);
