-- 0026：1.3.1 I 自动运营：所有流程共用一套触达记录（谁、什么类型、什么渠道、什么时候），做频率控制：
-- 同一个人一天内不连续收到多条不同类型的推送（推广类改为首页显示；确认 / 候补等服务通知不受限制）。只追加，可重复执行。
CREATE TABLE IF NOT EXISTS contact_touches (
  id          bigserial PRIMARY KEY,
  contact_id  uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  kind        text NOT NULL,      -- reminder / confirm / photos / newsletter / join_link / ...
  channel     text NOT NULL,      -- wx / sms / email
  service     boolean NOT NULL DEFAULT false,  -- 服务通知（已报名活动的确认、候补、提醒）
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contact_touches_recent_idx ON contact_touches (contact_id, created_at DESC);
