-- 0017：1.3.1 C 加入商会（小程序入会申请）
-- ------------------------------------------------------------------
-- 只追加，可重复执行。小程序里全程不出现金额、价格、付款：申请只记意向，
-- 助理在后台确认后一键把网站缴费链接用短信或邮件发给申请人；7 天没付提醒助理跟进一次（不自动催客户）。
CREATE TABLE IF NOT EXISTS join_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id    uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  name          text NOT NULL,
  company       text,
  industry      text,
  phone         text,
  email         text,
  source        text NOT NULL DEFAULT 'home',          -- home / checkin / welcome / me / ...
  event_id      uuid REFERENCES events(id) ON DELETE SET NULL,
  status        text NOT NULL DEFAULT 'new' CHECK (status IN ('new','link_sent','paid','closed')),
  link_sent_at  timestamptz,
  link_sent_by  text,
  link_channel  text,                                   -- sms / email / copy
  followup_at   timestamptz,                            -- 7 天没付已提醒助理
  note          text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS join_requests_status_idx ON join_requests (status, created_at DESC);
-- 同一人同时只有一份进行中的申请
CREATE UNIQUE INDEX IF NOT EXISTS join_requests_open_uidx ON join_requests (contact_id) WHERE status IN ('new','link_sent');
