-- 0011：SAREC 1.3
-- ------------------------------------------------------------------
-- 只追加，不改动已有数据；旧版小程序 1.2 用到的表和字段全部保留。可重复执行。

-- B. 带一位朋友 ------------------------------------------------------
-- 同行人：单独一条报名（单独占名额、单独签到），标记由谁代报名。
-- 不替朋友建正式账号：只建一份“占位档案”（is_placeholder = true，不能登录、不进营销名单），
-- 朋友第一次自己扫码 / 报名、手机号对上时并入他自己的档案。
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_placeholder boolean NOT NULL DEFAULT false;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS companion_of uuid REFERENCES registrations(id) ON DELETE SET NULL;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS added_by uuid REFERENCES contacts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS registrations_companion_of_idx ON registrations (companion_of) WHERE companion_of IS NOT NULL;
ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_source_check;
ALTER TABLE registrations ADD CONSTRAINT registrations_source_check CHECK (source = ANY (ARRAY['online', 'onsite', 'staff', 'companion']));

-- F. 渠道码 + L. 功能排行 ------------------------------------------
-- 渠道：合作商家、合作机构、副会长单位……每个渠道一个 code（c-xxxx），小程序码带 ?channel=c-xxxx。
-- 统计口径沿用 1.2：带来源的访问 → 报名 → 到场 → 入会 / 有效咨询。
-- 归因：报名记录上的 channel_code = 最后一次带来这个人的渠道 / 功能；contacts.first_channel = 首次来源（只写一次）。
CREATE TABLE IF NOT EXISTS channels (
  id          bigserial PRIMARY KEY,
  code        text UNIQUE NOT NULL CHECK (code ~ '^c-[a-z0-9]{3,16}$'),
  name        text NOT NULL,
  kind        text NOT NULL DEFAULT 'merchant' CHECK (kind IN ('merchant', 'org', 'vp_unit', 'partner', 'other')),
  note        text,
  active      boolean NOT NULL DEFAULT true,
  created_by  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS channel_code text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS first_channel text;
CREATE INDEX IF NOT EXISTS registrations_channel_code_idx ON registrations (channel_code) WHERE channel_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS track_events_channel_idx ON track_events (channel, created_at) WHERE channel IS NOT NULL;
