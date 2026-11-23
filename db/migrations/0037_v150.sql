-- 1.5.0 第二批（东哥 11/13 点头的默认规则；11/14 第二批连续工作令）
-- 1) 专委会与俱乐部：加入即生效、成员、群二维码、组局、负责人、禁人、关闭，都有记录
CREATE TABLE IF NOT EXISTS clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  intro text,
  members_only boolean NOT NULL DEFAULT false,
  leader_contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  group_qr_url text,
  group_qr_expires date,
  sort_order integer NOT NULL DEFAULT 0,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS club_members (
  club_id uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  removed_by text,
  PRIMARY KEY (club_id, contact_id)
);
CREATE TABLE IF NOT EXISTS club_meetups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  title text NOT NULL,
  starts_at timestamptz NOT NULL,
  location text,
  address text,
  capacity integer NOT NULL CHECK (capacity BETWEEN 2 AND 200),
  note text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'cancelled', 'taken_down')),
  sec_status text NOT NULL DEFAULT 'pending' CHECK (sec_status IN ('ok', 'pending', 'rejected')),
  taken_down_by text,
  taken_down_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS club_meetups_club_idx ON club_meetups (club_id, starts_at);
CREATE TABLE IF NOT EXISTS club_meetup_joins (
  meetup_id uuid NOT NULL REFERENCES club_meetups(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (meetup_id, contact_id)
);
CREATE TABLE IF NOT EXISTS club_bans (
  contact_id uuid PRIMARY KEY REFERENCES contacts(id) ON DELETE CASCADE,
  reason text,
  banned_by text NOT NULL,
  banned_at timestamptz NOT NULL DEFAULT now()
);

-- 2) 用户内容的通用操作记录（俱乐部、组局、个人主页、举报处理……谁、什么时候、做了什么）
CREATE TABLE IF NOT EXISTS ugc_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  target_id text,
  action text NOT NULL,
  actor text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ugc_actions_target_idx ON ugc_actions (kind, target_id, created_at DESC);

-- 3) 举报（组局、个人主页、名片、照片……）
CREATE TABLE IF NOT EXISTS ugc_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('meetup', 'profile', 'card', 'photo', 'club_member')),
  target_id text NOT NULL,
  reporter_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  reason text NOT NULL,
  detail text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done', 'dismissed')),
  handled_by text,
  handled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ugc_reports_open_idx ON ugc_reports (status, created_at DESC);

-- 4) 个人主页（在电子名片上加）：简介、公司介绍、项目 / 案例、我能提供、我在找；先审后发的图片
ALTER TABLE member_cards ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE member_cards ADD COLUMN IF NOT EXISTS company_intro text;
ALTER TABLE member_cards ADD COLUMN IF NOT EXISTS offers text[] NOT NULL DEFAULT '{}';
ALTER TABLE member_cards ADD COLUMN IF NOT EXISTS seeks text[] NOT NULL DEFAULT '{}';
ALTER TABLE member_cards ADD COLUMN IF NOT EXISTS profile_status text NOT NULL DEFAULT 'ok';
CREATE TABLE IF NOT EXISTS profile_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  images text[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('ok', 'pending', 'rejected', 'taken_down')),
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS profile_projects_contact_idx ON profile_projects (contact_id, sort_order);
-- 禁止某人发个人主页内容（可解除）
CREATE TABLE IF NOT EXISTS profile_bans (
  contact_id uuid PRIMARY KEY REFERENCES contacts(id) ON DELETE CASCADE,
  reason text,
  banned_by text NOT NULL,
  banned_at timestamptz NOT NULL DEFAULT now()
);

-- 5) 商会风采（官方）：副会长单位、战略合作方
CREATE TABLE IF NOT EXISTS showcase_orgs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('vice_president', 'partner')),
  name text NOT NULL,
  logo_url text,
  intro text,
  projects jsonb NOT NULL DEFAULT '[]',
  contact_contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6) 选填资料：年龄段、性别（东哥已点头：选填，不强制）
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS age_range text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS gender text;

-- 7) 群发：常用人群、每次群发（演练模式只记录"本来会发给谁"）
CREATE TABLE IF NOT EXISTS broadcast_audiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  filters jsonb NOT NULL,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filters jsonb NOT NULL,
  excluded uuid[] NOT NULL DEFAULT '{}',
  channels text[] NOT NULL,
  content jsonb NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'previewed', 'sent')),
  dry_run boolean NOT NULL DEFAULT true,
  counts jsonb NOT NULL DEFAULT '{}',
  created_by text NOT NULL,
  previewed_at timestamptz,
  confirmed_by text,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS broadcast_recipients (
  broadcast_id uuid NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  channel text NOT NULL,
  result text NOT NULL,
  PRIMARY KEY (broadcast_id, contact_id, channel)
);
