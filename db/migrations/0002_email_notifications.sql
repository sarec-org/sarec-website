-- SAREC 会员 / 战略合作伙伴 V1 —— 邮件通知留档 (Gate 2 M5)
-- ------------------------------------------------------------------
-- 记录 webhook 付款成功后发出的邮件，做发送幂等（防 webhook 重放重复发信）。
-- 追加 migration，不改动 0001；不含 Cron / 到期提醒（后续里程碑）。
-- 幂等键：UNIQUE(payment_id, notification_type, recipient_email)。
-- ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS email_notifications (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id     uuid REFERENCES applications(id) ON DELETE CASCADE,
  payment_id         uuid REFERENCES payments(id) ON DELETE CASCADE,
  notification_type  text NOT NULL
                     CHECK (notification_type IN
                       ('applicant_payment_confirmation','admin_new_paid_application')),
  recipient_email    text NOT NULL,
  recipient_role     text NOT NULL
                     CHECK (recipient_role IN ('applicant','admin')),
  status             text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','sent','failed','skipped')),
  resend_email_id    text,
  subject            text,
  error_message      text,
  sent_at            timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  -- 同一笔付款 + 同类型 + 同收件人 只发一次
  UNIQUE (payment_id, notification_type, recipient_email)
);
CREATE INDEX IF NOT EXISTS idx_email_notifications_application ON email_notifications (application_id);
CREATE INDEX IF NOT EXISTS idx_email_notifications_payment     ON email_notifications (payment_id);
