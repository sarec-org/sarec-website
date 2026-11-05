-- 0008：SAREC 1.2 —— 主动获客（推荐与点击统计、电子名片、活动相册、会议室咨询制、待跟进任务、咨询记录、专委会意向）
-- ------------------------------------------------------------------
-- 只追加，不改动已有数据；旧版小程序 1.1.3 用到的表和字段全部保留。
-- 推荐统计记真实结果：带来源的访问（track_events.name = 'visit'）→ 报名（registrations.ref_contact_id）→ 到场 → 入会 / 有效咨询。
-- 首次推荐人存 contacts.referred_by（只写一次）；本次活动来源存 registrations.ref_contact_id / channel_code，两者分开。
-- ------------------------------------------------------------------

-- ── 1. 点击与访问统计（首页入口、分享、海报生成、名片打开、带来源访问）──────────
CREATE TABLE IF NOT EXISTS track_events (
  id              bigserial PRIMARY KEY,
  name            text NOT NULL,                              -- home_entry / share / poster / card_open / visit / ...
  client          text NOT NULL CHECK (client IN ('mp','web','agent','server')),
  contact_id      uuid REFERENCES contacts(id) ON DELETE SET NULL,
  ref_contact_id  uuid REFERENCES contacts(id) ON DELETE SET NULL,
  target          text,                                       -- 入口名 / 活动 slug / 文章 / 名片
  channel         text,                                       -- poster / share / timeline / card / web ...
  visitor         text,                                       -- 未登录访客的匿名标识（网站 cookie）
  meta            jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_track_name_time ON track_events (name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_track_ref ON track_events (ref_contact_id, created_at DESC) WHERE ref_contact_id IS NOT NULL;

-- 首次推荐人的渠道与时间（referred_by 已在 0003）
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS referred_channel text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS referred_at timestamptz;
-- 头像（海报、名片用；本人上传）
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS avatar_url text;

-- 签到时勾选“同意现场照片用于商会宣传”（默认不勾）
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS photo_consent boolean NOT NULL DEFAULT false;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS photo_consent_at timestamptz;

-- ── 2. 电子名片 ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS member_cards (
  contact_id    uuid PRIMARY KEY REFERENCES contacts(id) ON DELETE CASCADE,
  token         text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(8), 'hex'),  -- 名片码里带的公开编号
  company       text,
  title         text,
  intro         text,
  wechat_id     text,
  show_phone    boolean NOT NULL DEFAULT false,
  show_email    boolean NOT NULL DEFAULT false,
  show_wechat   boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ── 3. 活动相册（后台上传，自动加商会水印）────────────────────────────
ALTER TABLE events ADD COLUMN IF NOT EXISTS cover_url text;            -- 活动封面（分享卡片、海报、大图卡片）
ALTER TABLE events ADD COLUMN IF NOT EXISTS recap text;                -- 一行回顾说明
ALTER TABLE events ADD COLUMN IF NOT EXISTS album_published_at timestamptz;

CREATE TABLE IF NOT EXISTS event_photos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  url          text NOT NULL,                                -- 加水印后的大图
  thumb_url    text NOT NULL,                                -- 缩略图
  width        integer,
  height       integer,
  caption      text,
  sort_order   integer NOT NULL DEFAULT 0,
  is_hidden    boolean NOT NULL DEFAULT false,
  uploaded_by  text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_event_photos_event ON event_photos (event_id, sort_order, created_at);

-- “照片已上传”通知：授权过订阅消息的人推送；没授权（或模板未配置）的在首页状态卡看到
CREATE TABLE IF NOT EXISTS event_photo_notices (
  event_id    uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  contact_id  uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  channel     text NOT NULL DEFAULT 'home' CHECK (channel IN ('subscribe','home')),
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','skipped','seen')),
  error       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  sent_at     timestamptz,
  seen_at     timestamptz,
  PRIMARY KEY (event_id, contact_id)
);
ALTER TABLE event_reminder_subs DROP CONSTRAINT IF EXISTS event_reminder_subs_kind_check;
ALTER TABLE event_reminder_subs ADD CONSTRAINT event_reminder_subs_kind_check CHECK (kind IN ('confirm','day_before','two_hours','photos'));

-- ── 4. 会议室改咨询制：小程序只展示；后台登记线下谈好的预约（日历防撞期沿用 0003 的排他约束）──
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS capacity integer;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS equipment text;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS intro text;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS photo_urls text[] NOT NULL DEFAULT '{}';
ALTER TABLE room_bookings ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'member';
ALTER TABLE room_bookings DROP CONSTRAINT IF EXISTS room_bookings_source_check;
ALTER TABLE room_bookings ADD CONSTRAINT room_bookings_source_check CHECK (source IN ('member','staff'));
ALTER TABLE room_bookings ADD COLUMN IF NOT EXISTS note text;
ALTER TABLE room_bookings ADD COLUMN IF NOT EXISTS created_by text;

-- ── 5. 咨询记录（网站表单 / AI 助手 / 小程序“联系商会”）────────────────────
CREATE TABLE IF NOT EXISTS inquiries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id   uuid REFERENCES contacts(id) ON DELETE SET NULL,
  source       text NOT NULL CHECK (source IN ('web_form','agent','mp')),
  intent       text,                                         -- 加入商会 / 找商会谈项目 / 合作 / 其他
  name         text,
  phone        text,
  email        text,
  wechat       text,
  message      text,
  fields       jsonb,
  ref_contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inquiries_time ON inquiries (created_at DESC);

-- ── 6. 待跟进任务 + 待处理（失败 / 异常）────────────────────────────────
CREATE TABLE IF NOT EXISTS followups (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source           text NOT NULL CHECK (source IN ('agent_lead','post_event_interest','inquiry','expiring_member','manual')),
  dedupe_key       text UNIQUE NOT NULL,                     -- 同一触发只生成一条（重试不重复）
  contact_id       uuid REFERENCES contacts(id) ON DELETE SET NULL,
  name             text,
  contact_text     text,                                     -- 联系方式（工作人员可见）
  need             text,                                     -- 需求摘要
  detail           jsonb,
  draft            text,                                     -- 建议联系内容
  draft_by         text NOT NULL DEFAULT 'template' CHECK (draft_by IN ('ai','template')),
  status           text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','contacted','meeting','won','dropped')),
  owner            text,
  next_date        date,
  event_id         uuid REFERENCES events(id) ON DELETE SET NULL,
  inquiry_id       uuid REFERENCES inquiries(id) ON DELETE SET NULL,
  notified_at      timestamptz,                              -- 邮件通知已发
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_followups_status ON followups (status, next_date NULLS FIRST, created_at DESC);

CREATE TABLE IF NOT EXISTS followup_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  followup_id  uuid NOT NULL REFERENCES followups(id) ON DELETE CASCADE,
  actor        text NOT NULL,
  from_status  text,
  to_status    text,
  note         text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_followup_log ON followup_log (followup_id, created_at);

CREATE TABLE IF NOT EXISTS ops_exceptions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind         text NOT NULL,                                -- email_notify / photo_notice / followup_scan / ...
  dedupe_key   text UNIQUE NOT NULL,
  ref          text,
  error        text,
  payload      jsonb,
  attempts     integer NOT NULL DEFAULT 1,
  status       text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','ignored')),
  resolved_by  text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ops_exceptions_open ON ops_exceptions (status, created_at DESC);

-- ── 7. 专委会与俱乐部意向 ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS committee_interests (
  contact_id  uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  committee   text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (contact_id, committee)
);

-- ── 8. 配置项（后台可改；不存密钥）────────────────────────────────────
INSERT INTO crm_settings (key, value) VALUES
  ('wechat_qr_url',      '""'),
  ('channels_finder_id', '""'),
  ('committees',         '[{"key":"investment","name":"投资委员会","status":"preparing"},{"key":"design","name":"设计联盟","status":"preparing"},{"key":"guandan","name":"掼蛋俱乐部","status":"preparing"},{"key":"golf","name":"高尔夫俱乐部","status":"preparing"}]'),
  ('content_visibility', '{}'),
  ('room_notice',        '"会员按等级享受会议室优惠，具体请联系商会工作人员。"')
ON CONFLICT (key) DO NOTHING;
