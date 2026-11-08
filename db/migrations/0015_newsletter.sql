-- 0015：网站后台“邮件通讯”（东哥 11/7）
-- ------------------------------------------------------------------
-- 只追加，可重复执行。
-- 规则：只发给验证过邮箱的人；每封带一键退订和商会地址；退订立即生效；退信、投诉自动停发；
--       东哥看过预览、收到测试邮件、在后台点“确认发送”后才群发（confirmed_at 为空的期数，系统一封都不发）。

CREATE TABLE IF NOT EXISTS newsletter_issues (
  id            bigserial PRIMARY KEY,
  subject       text NOT NULL DEFAULT '',
  body          text NOT NULL DEFAULT '',          -- 简单排版：空行分段、## 小标题、- 列表、[文字](链接)、**加粗**；可插入 {姓名}{公司}{上次参加的活动}
  source        text NOT NULL DEFAULT 'manual',    -- manual / ai
  ai_model      text,
  ai_reviewed_at timestamptz,                       -- AI 草稿：东哥点“我已审核”后才能发测试、确认发送
  ai_reviewed_by text,
  filters       jsonb NOT NULL DEFAULT '{}',        -- { audience: all|member|registered, eventTypes: [], industries: [], channels: [] }
  status        text NOT NULL DEFAULT 'draft',      -- draft / sending / sent / cancelled
  content_hash  text,                               -- 测试邮件发出时的内容指纹；改过内容就要重发测试
  test_sent_at  timestamptz,
  test_sent_to  text,
  test_hash     text,
  confirmed_at  timestamptz,
  confirmed_by  text,
  sent_at       timestamptz,
  recipient_count int,
  created_by    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS newsletter_sends (
  id            bigserial PRIMARY KEY,
  issue_id      bigint NOT NULL REFERENCES newsletter_issues(id) ON DELETE CASCADE,
  contact_id    uuid REFERENCES contacts(id) ON DELETE SET NULL,
  email         text NOT NULL,
  status        text NOT NULL DEFAULT 'queued',     -- queued / sent / skipped / failed
  resend_id     text,
  error         text,
  sent_at       timestamptz,
  delivered_at  timestamptz,
  opened_at     timestamptz,
  clicked_at    timestamptz,
  bounced_at    timestamptz,
  complained_at timestamptz,
  unsubscribed_at timestamptz,
  UNIQUE (issue_id, email)
);
CREATE INDEX IF NOT EXISTS newsletter_sends_queue_idx ON newsletter_sends (issue_id) WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS newsletter_sends_resend_idx ON newsletter_sends (resend_id);

-- 退订 / 投诉名单（按邮箱）：在名单里的永远不再发邮件通讯
CREATE TABLE IF NOT EXISTS email_unsubscribes (
  email       text PRIMARY KEY,
  contact_id  uuid REFERENCES contacts(id) ON DELETE SET NULL,
  reason      text NOT NULL DEFAULT 'unsubscribe',  -- unsubscribe / complaint / bounce
  issue_id    bigint,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 每天实际发出的邮件数（所有邮件：通知 + 邮件通讯），用来控制在 Resend 现有套餐内
CREATE TABLE IF NOT EXISTS email_send_counts (
  day         date PRIMARY KEY,
  sent        int NOT NULL DEFAULT 0,
  newsletter  int NOT NULL DEFAULT 0
);
