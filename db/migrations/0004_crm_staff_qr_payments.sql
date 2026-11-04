-- SAREC CRM Phase 1 追加：工作人员角色 / 扫码登录 / 订单抵扣与 Stripe / 电子屏 / 商家优惠 / 配置项
-- ------------------------------------------------------------------
-- 只追加，不改 0001–0003。所有金额 integer cents。

-- ── 1. 工作人员后台角色（邮箱验证码登录后按此表授权；同一人可兼任多个角色）──
CREATE TABLE IF NOT EXISTS staff_roles (
  email       text PRIMARY KEY,                               -- 小写
  name        text NOT NULL,
  roles       text[] NOT NULL DEFAULT '{}',                   -- checkin / finance / ops / admin
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CHECK (roles <@ ARRAY['checkin','finance','ops','admin']::text[])
);

-- ── 2. 网站扫码登录：网站出码 → 小程序扫码确认 → 网站轮询拿到会话 ───────────
CREATE TABLE IF NOT EXISTS qr_logins (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash    text UNIQUE NOT NULL,                          -- sha256(公开码)
  poll_hash    text UNIQUE NOT NULL,                          -- sha256(网站轮询密钥)，防止别人拿码领会话
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','consumed','expired')),
  contact_id   uuid REFERENCES contacts(id) ON DELETE CASCADE,
  expires_at   timestamptz NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── 3. 订单：积分抵扣、Stripe 会话、拒收 ──────────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS gross_cents        integer;   -- 抵扣前金额（无抵扣时 = amount_cents）
ALTER TABLE orders ADD COLUMN IF NOT EXISTS points_redeemed    integer NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_session_id  text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS application_payment_id uuid REFERENCES payments(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS reject_reason      text;
CREATE INDEX IF NOT EXISTS idx_orders_related ON orders (related_id);
-- 一份会费申请只有一张未取消的订单
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_membership
  ON orders (related_id) WHERE purpose = 'membership' AND status <> 'cancelled';

-- ── 4. 电子屏轮播申请 ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS screen_ads (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id    uuid NOT NULL REFERENCES contacts(id),
  org_name      text NOT NULL,
  intro         text NOT NULL,
  service_area  text,
  qr_url        text,                                         -- 联系二维码（链接或上传后的地址）
  asset_url     text,                                         -- 素材
  months        integer NOT NULL DEFAULT 1 CHECK (months BETWEEN 1 AND 12),
  start_month   date,                                         -- 排期起始月（工作人员定）
  tier_at_apply text,
  amount_cents  integer NOT NULL DEFAULT 0,
  order_id      uuid REFERENCES orders(id),
  status        text NOT NULL DEFAULT 'submitted'
                CHECK (status IN ('submitted','approved','scheduled','rejected','cancelled')),
  staff_note    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ── 5. 商家优惠（后台维护，前台列表）────────────────────────────────
CREATE TABLE IF NOT EXISTS merchant_offers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant     text NOT NULL,
  category     text,
  offer        text NOT NULL,
  conditions   text,
  contact      text,
  valid_until  date,
  is_active    boolean NOT NULL DEFAULT true,
  sort_order   integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── 6. 配置项（会员价、屏幕费、积分抵扣比例等；后台可改）──────────────
CREATE TABLE IF NOT EXISTS crm_settings (
  key         text PRIMARY KEY,
  value       jsonb NOT NULL,
  updated_by  text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
INSERT INTO crm_settings (key, value) VALUES
  ('room_discount',        '{"member":0.9,"board":0.85,"exec_board":0.8,"vp":0.7,"strategic_partner":0.6}'),
  ('screen_fee_cents',     '{"none":5000,"member":4000,"board":3000,"exec_board":2000,"vp":0,"strategic_partner":0}'),
  ('member_prices_published', 'false'),
  ('points_per_dollar',    '10'),
  ('room_pass_cents',      '29900')
ON CONFLICT (key) DO NOTHING;

-- 默认会议室（价格为建议标准价，后台可改）
INSERT INTO rooms (name, hourly_cents)
SELECT '商会会议室', 5000 WHERE NOT EXISTS (SELECT 1 FROM rooms);

-- 会话最后使用时间（便于清理）
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;
