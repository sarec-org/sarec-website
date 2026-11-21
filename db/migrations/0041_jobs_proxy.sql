-- 后台优化 D（指令 13 第 3 条）：找工人 · 接活儿 —— 工作人员代登记接活人
-- 幂等（IF NOT EXISTS / ON CONFLICT DO NOTHING），可重复跑；不依赖 0037。依赖 0038（jobs_pros 已在 main 上）。
--
-- 1. jobs_pros 加“商会代登记”和“本人确认”字段（只在后台显示，接活人卡片和公开接口不出）
ALTER TABLE IF EXISTS jobs_pros ADD COLUMN IF NOT EXISTS proxy_by text;               -- 代登记的工作人员（staff:名字）；NULL = 本人自己登记
ALTER TABLE IF EXISTS jobs_pros ADD COLUMN IF NOT EXISTS proxy_at timestamptz;
ALTER TABLE IF EXISTS jobs_pros ADD COLUMN IF NOT EXISTS business_reg_no text;         -- 营业登记号（代登记一次贴表时只能填号码，工作人员照号码核验）
ALTER TABLE IF EXISTS jobs_pros ADD COLUMN IF NOT EXISTS self_confirmed_at timestamptz;  -- 本人已确认（点确认链接，或本人登录改过并提交）
ALTER TABLE IF EXISTS jobs_pros ADD COLUMN IF NOT EXISTS self_confirm_via text;        -- link 点链接确认 / edit 本人登录改资料提交
ALTER TABLE IF EXISTS jobs_pros ADD COLUMN IF NOT EXISTS self_declined_at timestamptz;  -- 本人点了“不是我 / 不要登记”
ALTER TABLE IF EXISTS jobs_pros ADD COLUMN IF NOT EXISTS confirm_sms_status text;      -- NULL 未发 / logged 已记录待发（总闸关着 / 测试站不是测试身份）/ sent 已发 / failed 发送失败
ALTER TABLE IF EXISTS jobs_pros ADD COLUMN IF NOT EXISTS confirm_sms_at timestamptz;
ALTER TABLE IF EXISTS jobs_pros ADD COLUMN IF NOT EXISTS confirm_nonce text;           -- 确认链接的一次性随机串（用过 / 重发即作废）；链接另带签名
ALTER TABLE IF EXISTS jobs_pros ADD COLUMN IF NOT EXISTS confirm_nonce_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS jobs_pros_confirm_nonce_uq ON jobs_pros (confirm_nonce) WHERE confirm_nonce IS NOT NULL;
CREATE INDEX IF NOT EXISTS jobs_pros_proxy_idx ON jobs_pros (proxy_at DESC) WHERE proxy_by IS NOT NULL;

-- 2. 发消息总闸：沿用子任务 B 的 lib/crm/notifyGate.ts（feat/admin-b-today，0039 建 notify_log；总闸 crm_settings.notify_live，没有这一行 = 关）。
--    D 的分支要能单独跑，这里原样 CREATE TABLE IF NOT EXISTS 同一份（和 0039 逐字一致，谁先跑都一样）。
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

-- 3. 代登记的人没本人确认前上不上公开列表：默认上（核验通过即上，和本人登记一致）；后台代登记页可关
INSERT INTO crm_settings (key, value, updated_by) VALUES ('jobs_proxy_list_before_confirm', 'true', 'migration:0041') ON CONFLICT (key) DO NOTHING;
