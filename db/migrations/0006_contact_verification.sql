-- 0006：联系方式真实性（东哥 2026-11-04）
-- ------------------------------------------------------------------
-- 原则：
--   · contacts.email / contacts.phone_e164 是“身份”（可登录网站、可用来认人合并），只放已验证的值；
--     旧数据里的未验证值保持原样（登录时用验证码验证后才生效）。
--   · 报名填写的手机号、邮箱（未经验证）只存在 contact_methods，用来发通知；不参与登录和合并。
--   · 修改联系方式不删旧值：旧值 is_current = false 留作历史。
-- 只追加；唯一的放宽是去掉 contacts 的“至少一个身份”检查（工作人员代录、号码被占用时允许无身份档案）。
-- ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS contact_methods (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id          uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  kind                text NOT NULL CHECK (kind IN ('email','phone')),
  value               text NOT NULL,                          -- 小写邮箱 / E.164 手机号
  -- 邮箱：unconfirmed 未确认 / confirmed 已确认 / invalid 无效（退信）
  -- 手机：unconfirmed 未验证 / confirmed 已验证 / invalid 短信发送失败
  status              text NOT NULL DEFAULT 'unconfirmed' CHECK (status IN ('unconfirmed','confirmed','invalid')),
  is_current          boolean NOT NULL DEFAULT true,
  source              text NOT NULL DEFAULT 'self',           -- registration / profile / login / staff / backfill
  confirm_token_hash  text,                                   -- 邮箱一键确认链接（sha256）
  confirmed_at        timestamptz,
  invalid_at          timestamptz,
  invalid_reason      text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  replaced_at         timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_contact_methods_current ON contact_methods (contact_id, kind) WHERE is_current;
CREATE INDEX IF NOT EXISTS idx_contact_methods_value ON contact_methods (kind, value);
CREATE UNIQUE INDEX IF NOT EXISTS uq_contact_methods_token ON contact_methods (confirm_token_hash) WHERE confirm_token_hash IS NOT NULL;

-- “您的联系方式还是这些吗？”上次确认时间（满 6 个月再问一次）
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS contact_info_confirmed_at timestamptz;

-- 工作人员代录 / 号码已被别的档案占用时，档案可以暂时没有身份（只能由工作人员处理，不能登录）
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_check;

-- 手机验证码发送记录（同一号码 60 秒一次、一天最多 10 次）
CREATE TABLE IF NOT EXISTS phone_verify_sends (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       text NOT NULL,
  contact_id  uuid REFERENCES contacts(id) ON DELETE SET NULL,
  ok          boolean NOT NULL,
  error       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_phone_verify_sends ON phone_verify_sends (phone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_phone_verify_sends_contact ON phone_verify_sends (contact_id, created_at DESC);

-- 微信订阅消息：用户每允许一次，可推送一条（开课前 1 天 / 前 2 小时）
CREATE TABLE IF NOT EXISTS event_reminder_subs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  contact_id   uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  kind         text NOT NULL CHECK (kind IN ('day_before','two_hours')),
  openid       text NOT NULL,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','skipped')),
  accepted_at  timestamptz NOT NULL DEFAULT now(),
  sent_at      timestamptz,
  error        text,
  UNIQUE (event_id, contact_id, kind)
);
CREATE INDEX IF NOT EXISTS idx_event_reminder_subs_pending ON event_reminder_subs (status, event_id) WHERE status = 'pending';

-- 回填：现有档案的邮箱、手机号（已验证 → confirmed，未验证 → unconfirmed）
INSERT INTO contact_methods (contact_id, kind, value, status, source, confirmed_at, created_at)
SELECT c.id, 'email', c.email, CASE WHEN c.email_verified_at IS NOT NULL THEN 'confirmed' ELSE 'unconfirmed' END,
       'backfill', c.email_verified_at, c.created_at
  FROM contacts c
 WHERE c.email IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM contact_methods m WHERE m.contact_id = c.id AND m.kind = 'email');
INSERT INTO contact_methods (contact_id, kind, value, status, source, confirmed_at, created_at)
SELECT c.id, 'phone', c.phone_e164, CASE WHEN c.phone_verified_at IS NOT NULL THEN 'confirmed' ELSE 'unconfirmed' END,
       'backfill', c.phone_verified_at, c.created_at
  FROM contacts c
 WHERE c.phone_e164 IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM contact_methods m WHERE m.contact_id = c.id AND m.kind = 'phone');
