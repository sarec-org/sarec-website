-- SAREC 会员 / 战略合作伙伴 V1 —— 数据地基 (Gate 2 M1)
-- ------------------------------------------------------------------
-- Postgres (Vercel Postgres / Neon)。统一 DATABASE_URL。
-- 价格一律 integer cents（列名带 _cents），展示层再格式化为美元。
-- 本 migration 只建表；不含 Stripe / webhook / 邮件 / Cron / admin API / 页面。
-- gen_random_uuid() 为 Postgres 13+ 内置；Neon / Vercel Postgres 均满足。
-- ------------------------------------------------------------------

-- ── 1. 档位配置（定价单一真源；页面/checkout 读本表，不信客户端传价）──────
CREATE TABLE IF NOT EXISTS membership_tiers (
  id                        serial PRIMARY KEY,
  slug                      text UNIQUE NOT NULL,          -- member / board / exec_board / vp / svp / strategic_partner
  category                  text NOT NULL
                            CHECK (category IN ('membership','strategic_partner')),
  name_zh                   text,
  name_en                   text,
  standard_price_cents      integer NOT NULL,
  current_price_cents       integer NOT NULL,
  currency                  text NOT NULL DEFAULT 'usd',
  promotion_label           text,
  promotion_start_date      date,
  promotion_end_date        date,
  is_promotion_active       boolean NOT NULL DEFAULT false,
  stripe_product_name       text,
  membership_term_months    integer NOT NULL DEFAULT 12,
  supports_semi_annual      boolean NOT NULL DEFAULT false,
  first_payment_amount_cents  integer,                     -- semiAnnual 首期（仅 strategic_partner 用）
  second_payment_amount_cents integer,                     -- semiAnnual 第二期
  is_active                 boolean NOT NULL DEFAULT true,  -- svp = false（不开放购买）
  sort_order                integer NOT NULL DEFAULT 0,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

-- ── 2. 申请主表（membership + strategic_partner 统一，靠 application_type 区分）──
CREATE TABLE IF NOT EXISTS applications (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_type          text NOT NULL
                            CHECK (application_type IN ('membership','strategic_partner')),
  selected_tier_id          integer REFERENCES membership_tiers(id),
  selected_tier_slug        text,
  payment_plan              text
                            CHECK (payment_plan IN ('annual','semiAnnual','offline')),
  application_status        text NOT NULL DEFAULT 'draft'
                            CHECK (application_status IN
                              ('draft','pending_payment','paid','under_review','approved',
                               'rejected','second_payment_due','past_due','cancelled')),
  payment_status            text NOT NULL DEFAULT 'unpaid'
                            CHECK (payment_status IN
                              ('unpaid','pending_payment','paid','partially_paid','refunded','failed')),
  -- 申请人资料
  company_name              text,
  contact_name              text,
  contact_title             text,
  email                     text NOT NULL,
  phone                     text,
  company_address           text,
  website_url               text,
  industry_category         text,
  service_area              text,
  company_description       text,
  project_description       text,
  notes                     text,
  -- 定价快照（付款时定价）
  standard_price_cents      integer,
  current_price_cents       integer,
  paid_amount_cents         integer,
  currency                  text NOT NULL DEFAULT 'usd',
  promotion_label           text,
  -- 有效期 & semiAnnual
  membership_start_date         date,
  membership_end_date           date,
  first_payment_paid_at         timestamptz,
  second_payment_due_date       date,
  second_payment_due_date_source text
                                CHECK (second_payment_due_date_source IN ('auto_calculated','manual_override')),
  second_payment_due_date_note   text,
  second_payment_paid_at         timestamptz,
  -- 二期展示系统预留（V1 存不展示）
  display_on_website        boolean NOT NULL DEFAULT false,
  display_category          text,                          -- member_company / member_project / strategic_partner / leadership
  display_priority          integer,
  display_start_date        date,
  display_end_date          date,
  logo_url                  text,
  cover_image_url           text,
  project_location          text,
  project_type              text,
  leadership_title          text,
  is_leadership_member      boolean NOT NULL DEFAULT false,
  is_featured               boolean NOT NULL DEFAULT false,
  is_approved_for_display   boolean NOT NULL DEFAULT false,
  display_status            text NOT NULL DEFAULT 'not_submitted'
                            CHECK (display_status IN
                              ('not_submitted','pending_review','approved','rejected','published','expired','hidden')),
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_applications_status        ON applications (application_status);
CREATE INDEX IF NOT EXISTS idx_applications_payment       ON applications (payment_status);
CREATE INDEX IF NOT EXISTS idx_applications_end_date      ON applications (membership_end_date);
CREATE INDEX IF NOT EXISTS idx_applications_second_due    ON applications (second_payment_due_date);
CREATE INDEX IF NOT EXISTS idx_applications_email         ON applications (email);

-- ── 3. 付款记录（支持未来 Stripe + 线下；semiAnnual 两期各一行）──────────────
CREATE TABLE IF NOT EXISTS payments (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id            uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  payment_provider          text NOT NULL
                            CHECK (payment_provider IN ('stripe','offline','zelle','check','bank_transfer')),
  payment_plan              text
                            CHECK (payment_plan IN ('annual','semiAnnual')),
  installment_number        integer                        -- 1 或 2
                            CHECK (installment_number IN (1,2)),
  amount_cents              integer NOT NULL,
  currency                  text NOT NULL DEFAULT 'usd',
  payment_status            text NOT NULL DEFAULT 'pending'
                            CHECK (payment_status IN ('pending','paid','failed','refunded','cancelled')),
  stripe_checkout_session_id text,
  stripe_payment_intent_id  text,
  stripe_customer_id        text,
  stripe_event_id           text,
  offline_payment_method    text,
  offline_payment_reference text,
  admin_marked_paid_at      timestamptz,
  admin_marked_paid_by      text,
  paid_at                   timestamptz,
  refunded_at               timestamptz,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payments_application ON payments (application_id);

-- ── 4. 协议全文存档（不可变；agreement_acceptances.agreement_snapshot_id 引用）──
CREATE TABLE IF NOT EXISTS agreement_snapshots (
  id                        serial PRIMARY KEY,
  agreement_type            text NOT NULL
                            CHECK (agreement_type IN
                              ('membership_agreement','strategic_partnership_agreement','privacy_policy')),
  version                   text NOT NULL,
  url                       text,
  language_mode             text NOT NULL DEFAULT 'bilingual_english_controls',
  content_hash              text NOT NULL,                 -- sha256(full_text)
  full_text                 text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agreement_type, version)
);

-- ── 5. agree 留档（用户勾选同意的不可抵赖记录）──────────────────────────────
CREATE TABLE IF NOT EXISTS agreement_acceptances (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id            uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  agreement_type            text NOT NULL
                            CHECK (agreement_type IN
                              ('membership_agreement','strategic_partnership_agreement','privacy_policy')),
  agreement_version         text,
  agreement_title           text,
  agreement_url             text,
  agreement_hash            text,                          -- sha256 快照，或
  agreement_snapshot_id     integer REFERENCES agreement_snapshots(id),
  agreement_language_mode   text NOT NULL DEFAULT 'bilingual_english_controls'
                            CHECK (agreement_language_mode IN ('bilingual_english_controls')),
  selected_tier             text,
  standard_price_cents      integer,
  actual_paid_price_cents   integer,
  promotion_label           text,
  payment_plan              text,
  company_name              text,
  contact_name              text,
  email                     text,
  phone                     text,
  agree_time                timestamptz,
  ip_address                text,
  user_agent                text,
  stripe_checkout_session_id text,
  stripe_payment_intent_id  text,
  stripe_customer_id        text,
  payment_status            text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agreement_acceptances_application ON agreement_acceptances (application_id);

-- ── 6. Stripe events 幂等（webhook 未来去重，防重复落款/发邮件/改有效期）──────
CREATE TABLE IF NOT EXISTS stripe_events (
  stripe_event_id           text PRIMARY KEY,              -- 唯一
  event_type                text,
  livemode                  boolean,
  processing_status         text NOT NULL DEFAULT 'processed'
                            CHECK (processing_status IN ('processed','failed','ignored')),
  related_application_id     uuid REFERENCES applications(id),
  related_payment_id         uuid REFERENCES payments(id),
  raw_event_created         timestamptz,
  error_message             text,
  processed_at              timestamptz NOT NULL DEFAULT now(),
  created_at                timestamptz NOT NULL DEFAULT now()
);

-- ── 7. 提醒日志（到期 + semiAnnual 第二期提醒去重）──────────────────────────
CREATE TABLE IF NOT EXISTS reminder_log (
  id                        serial PRIMARY KEY,
  application_id            uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  reminder_type             text NOT NULL,                 -- expiry_30 / expiry_7 / expiry_0 / second_payment_30 / second_payment_7 / second_payment_0
  reminder_target           text NOT NULL
                            CHECK (reminder_target IN ('applicant','admin')),
  scheduled_for             date,
  sent_at                   timestamptz,
  email                     text,
  resend_email_id           text,
  status                    text NOT NULL DEFAULT 'sent'
                            CHECK (status IN ('sent','failed','skipped')),
  error_message             text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  -- 同一 application + type + target 不得重复发送
  UNIQUE (application_id, reminder_type, reminder_target)
);

-- ── 8. 管理员操作审计（标 paid / 改第二期到期日 / 审核 / 展示状态 等）────────
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id            uuid REFERENCES applications(id) ON DELETE SET NULL,
  admin_action_type         text NOT NULL,                 -- mark_offline_paid / update_second_payment_due_date / approve / reject / update_display_status / update_membership_status / mark_second_payment_paid / refund_note
  previous_status           text,
  new_status                text,
  previous_value            text,
  new_value                 text,
  admin_identifier          text,
  admin_note                text,
  ip_address                text,
  user_agent                text,
  action_at                 timestamptz NOT NULL DEFAULT now(),
  created_at                timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_application ON admin_audit_log (application_id);
