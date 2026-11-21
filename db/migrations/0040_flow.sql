-- 后台综合优化 C（11/21）：通知总闸、工作人员手机通知、入会申请自动发链接、专委会意向补填、
-- 活动自动结束 / 筹备提醒、重复档案自动合并、内部账号 / 审核演示账号。
-- 幂等（IF NOT EXISTS / ON CONFLICT），可以重复跑；不依赖 0037。不删任何列、不删任何数据。

-- ── 1. 通知总闸 notify_live（lib/crm/notifyGate.ts，B 定义）：正式环境默认关；关着只记录（收件人打码），不真发 ───────────────
INSERT INTO crm_settings (key, value) VALUES ('notify_live', 'false') ON CONFLICT (key) DO NOTHING;

-- 发送记录表和 B 的 0039 完全同一份（B 的 lib/crm/notifyGate.ts 写这张表）；这里再写一遍是为了 0040 不依赖 0039 的执行顺序
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

-- ── 2. 工作人员通知：每人的渠道、收哪几类 ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_notify_prefs (
  staff_key    text PRIMARY KEY,                     -- staff_roles.email（小程序加的人是 mp:…）
  channel      text NOT NULL DEFAULT 'sms' CHECK (channel IN ('sms', 'wecom', 'email')),
  categories   text[],                               -- NULL = 按默认规则
  wecom_userid text,
  updated_by   text,
  updated_at   timestamptz NOT NULL DEFAULT now()
);
-- 谁是“东哥”（钱和异常同时发给他、每日汇总默认发给他）：设置里的 staff key，不写死手机号
INSERT INTO crm_settings (key, value) VALUES ('notify_owner', '""') ON CONFLICT (key) DO NOTHING;

-- 一件事一条（同一件事不重复通知）；晚 9 点到早 8 点攒到早上；每天超 10 条合并
CREATE TABLE IF NOT EXISTS staff_notices (
  id           bigserial PRIMARY KEY,
  staff_key    text NOT NULL,
  category     text NOT NULL,
  dedupe_key   text NOT NULL,
  title        text NOT NULL,                        -- 不放客户完整个人信息
  href         text,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'held', 'sent', 'merged', 'digest', 'skipped')),
  send_after   timestamptz,
  la_day       date NOT NULL,
  sent_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_key, dedupe_key)
);
CREATE INDEX IF NOT EXISTS staff_notices_held_idx ON staff_notices (status, send_after) WHERE status = 'held';
CREATE INDEX IF NOT EXISTS staff_notices_day_idx ON staff_notices (staff_key, la_day);
-- 每日汇总：每人每天一条
CREATE TABLE IF NOT EXISTS staff_digests (
  staff_key   text NOT NULL,
  la_day      date NOT NULL,
  items       int NOT NULL DEFAULT 0,
  status      text NOT NULL,                         -- sent / logged / failed / empty
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (staff_key, la_day)
);

-- ── 3. 入会申请自动发缴费链接：发了什么、什么时候发的，记在申请上 ───────────────────────
ALTER TABLE join_requests ADD COLUMN IF NOT EXISTS link_log jsonb NOT NULL DEFAULT '[]';
ALTER TABLE join_requests ADD COLUMN IF NOT EXISTS auto_link_at timestamptz;     -- 系统自动发过（或总闸关着时记录过）
ALTER TABLE join_requests ADD COLUMN IF NOT EXISTS nudged_at timestamptz;        -- 3 天没缴费，工作人员已跟过一次
ALTER TABLE join_requests ADD COLUMN IF NOT EXISTS nudged_by text;

-- ── 4. 专委会 / 俱乐部意向：必须有姓名和手机号；老的匿名意向标“待补填” ──────────────────
ALTER TABLE committee_interests ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE committee_interests ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE committee_interests ADD COLUMN IF NOT EXISTS needs_fill boolean NOT NULL DEFAULT false;
UPDATE committee_interests ci SET needs_fill = true
  FROM contacts c
 WHERE c.id = ci.contact_id AND ci.needs_fill = false AND ci.phone IS NULL
   AND (NULLIF(NULLIF(trim(c.name), ''), '微信用户') IS NULL
        OR (c.phone_e164 IS NULL AND NOT EXISTS (SELECT 1 FROM contact_methods m WHERE m.contact_id = c.id AND m.kind = 'phone' AND m.is_current)));

-- ── 5. 活动：自动“已结束”；筹备清单一项没人动，活动前 3 天提醒东哥一次 ──────────────────
ALTER TABLE events ADD COLUMN IF NOT EXISTS auto_completed_at timestamptz;
ALTER TABLE event_prep ADD COLUMN IF NOT EXISTS idle_reminded_at timestamptz;

-- ── 6. 重复档案：自动合并留记录（可撤销） ───────────────────────────────────────────────
ALTER TABLE contact_merges ADD COLUMN IF NOT EXISTS auto boolean NOT NULL DEFAULT false;

-- ── 7. 内部账号 / 审核演示账号：不进待办、统计、推荐排行、跟进提醒 ─────────────────────────
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS account_kind text;
DO $$ BEGIN
  ALTER TABLE contacts ADD CONSTRAINT contacts_account_kind_chk CHECK (account_kind IS NULL OR account_kind IN ('internal', 'review_demo', 'test'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS contacts_account_kind_idx ON contacts (account_kind) WHERE account_kind IS NOT NULL;

-- 重复档案每天自动合并的开关：默认关（正式库第一次批量等东哥点头，用 scripts/admin-oneoff-merge-dups.ts 跑完后打开）
INSERT INTO crm_settings (key, value) VALUES ('dup_auto_merge', 'false') ON CONFLICT (key) DO NOTHING;
