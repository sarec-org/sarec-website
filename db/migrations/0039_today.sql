-- 0039 后台综合优化 B：「今天」页、待跟进分类与联系回填、通知邮件三按钮、对外发送总闸记录
-- 幂等（IF NOT EXISTS），不依赖 0037。

-- 1. 对外发送总闸 notify_live 的记录（lib/crm/notifyGate.ts）。总闸本身是 crm_settings.notify_live，没有这一行 = 关。
CREATE TABLE IF NOT EXISTS notify_log (
  id          bigserial PRIMARY KEY,
  kind        text NOT NULL,                 -- 哪类通知：咨询通知 / 推销垃圾每日汇总 / ……
  channel     text NOT NULL,                 -- email / sms / wecom
  to_masked   text NOT NULL,                 -- 收件人（打码）
  subject     text,
  body        text,
  ref         text,
  dedupe_key  text,
  status      text NOT NULL,                 -- sent / held（正式站总闸关）/ blocked（测试站非测试身份）/ failed
  error       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notify_log_time ON notify_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notify_log_key ON notify_log (dedupe_key) WHERE dedupe_key IS NOT NULL;

-- 2. 咨询自动分类（四.1）：customer 客户咨询 / pitch 合作或推销 / spam 垃圾；lang 对方用的语言 zh / en
ALTER TABLE followups ADD COLUMN IF NOT EXISTS category      text;
ALTER TABLE followups ADD COLUMN IF NOT EXISTS category_by   text;          -- rule（规则）/ staff（工作人员改的）
ALTER TABLE followups ADD COLUMN IF NOT EXISTS lang          text;
ALTER TABLE followups ADD COLUMN IF NOT EXISTS digested_at   timestamptz;   -- 推销 / 垃圾已进过每日汇总
DO $$ BEGIN
  ALTER TABLE followups ADD CONSTRAINT followups_category_check CHECK (category IS NULL OR category IN ('customer','pitch','spam'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. 联系回填（四.5）：联系上了 / 没接 / 已约时间
ALTER TABLE followups ADD COLUMN IF NOT EXISTS last_contact_at     timestamptz;
ALTER TABLE followups ADD COLUMN IF NOT EXISTS last_contact_result text;    -- reached / no_answer / scheduled
ALTER TABLE followups ADD COLUMN IF NOT EXISTS last_contact_by     text;

-- 4. 通知邮件三按钮（四.2）：每封邮件一个随机口令，库里只存 sha256；还要求点的人是已登录工作人员
ALTER TABLE followups ADD COLUMN IF NOT EXISTS action_token_hash    text;
ALTER TABLE followups ADD COLUMN IF NOT EXISTS action_token_expires timestamptz;

CREATE INDEX IF NOT EXISTS idx_followups_cat ON followups (category, status, created_at DESC);
