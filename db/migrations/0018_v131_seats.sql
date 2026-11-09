-- 0018：1.3.1 B 报名人数与确认候补
-- ------------------------------------------------------------------
-- 只追加，可重复执行；只加可空列和新表。
--  - 每场两个数：当前上限（events.capacity，原有）+ 硬上限（hard_capacity，场地坐得下的极限）。
--  - 活动前确认时间线：前 24 小时问“来吗”，前 22 小时再问，前 21 小时没回的转候补，候补按顺序递补（4 小时内确认）。
--  - 消息全部发不出去的进异常名单，不记爽约；连续两次报了名、没确认也没来，下次报名进候补（后台可解除）。
ALTER TABLE events ADD COLUMN IF NOT EXISTS hard_capacity integer;
ALTER TABLE events ADD COLUMN IF NOT EXISTS cap_alert_at timestamptz;          -- 报到当前上限时已提醒工作人员
ALTER TABLE prep_templates ADD COLUMN IF NOT EXISTS default_hard_capacity integer;

ALTER TABLE registrations ADD COLUMN IF NOT EXISTS waitlisted_at timestamptz;   -- 候补排序（转候补的人排到原候补后面）
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS confirm_status text NOT NULL DEFAULT 'none';
DO $$ BEGIN
  ALTER TABLE registrations ADD CONSTRAINT registrations_confirm_status_check
    CHECK (confirm_status IN ('none','asked','confirmed','declined','released','offered','offer_expired'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS asked_at timestamptz;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS reminded_at timestamptz;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS released_at timestamptz;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS offer_expires_at timestamptz;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS unreachable boolean NOT NULL DEFAULT false;  -- 所有渠道都发不出去：不记爽约、不转候补
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS noshow_waitlisted boolean NOT NULL DEFAULT false; -- 因连续爽约进的候补

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS noshow_exempt boolean NOT NULL DEFAULT false;     -- 后台解除“连续爽约进候补”

CREATE TABLE IF NOT EXISTS confirm_sends (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id  uuid NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  kind             text NOT NULL,        -- ask / remind / released / offer / offer_expired
  channel          text NOT NULL,        -- wx / sms / none
  ok               boolean NOT NULL,
  error            text,                 -- 只记错误码
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (registration_id, kind, channel)
);

-- 默认值：一般活动当前上限 30、硬上限 60；企业家圆桌 20 / 24（只在模板没设过时填）
UPDATE prep_templates SET default_hard_capacity = 24 WHERE default_hard_capacity IS NULL AND key = 'face';
-- 一般活动硬上限 60；模板里当前上限已经设得比 60 大的（例如讲座 100），硬上限取当前上限，不改东哥设过的值
UPDATE prep_templates SET default_hard_capacity = GREATEST(60, coalesce(default_capacity, 30)) WHERE default_hard_capacity IS NULL AND key <> 'face';
UPDATE prep_templates SET default_hard_capacity = GREATEST(24, coalesce(default_capacity, 20)) WHERE key = 'face' AND default_hard_capacity < coalesce(default_capacity, 0);
