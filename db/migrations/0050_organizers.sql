-- 0050：1.6.0 活动工具开放给别的主办方（指令 48 / 49，11/23）。
-- 设计要点（见 ~/WeChatProjects/活动工具开放_方案.md「11/23 修正」）：
-- 1) 主办方的活动、报名放在自己的表里（org_events / org_regs），**不进商会的 events / registrations**：
--    商会的待跟进、今天、群发、邮件通讯、积分、补资料提醒、活动后总结、活动统计都只读 events / registrations，天然碰不到。
-- 2) 只通过主办方活动来过的人，在 contacts 上标 org_guest_since（"主办方的客人"）；realContact() 过滤掉他们，
--    所以客户列表、今天、数据页、群发这些按"真实客户"取人的地方也不出现。本人自己和商会发生关系（报名商会活动、申请入会等）时标记去掉，记下哪天、因为什么。
-- 3) 报名和接龙是同一套（org_events.mode = signup / chain），同一份名单、签到、统计；接龙模式由开关 org_chain_on 控制（没有记录 = 关）。
-- 4) 总开关 org_tool_on（没有记录 = 开；只有后台开通的主办方才看得到入口）。
-- 只加表、加列、放宽一个约束；可重复执行；老数据一行不动；不往 crm_settings 写任何东西。

CREATE TABLE IF NOT EXISTS organizers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  public_contact text,               -- 报名页"联系主办方"显示的一行（电话 / 微信号），主办方自己的对外联系方式
  staff_note text,                   -- 后台备注（只有工作人员看）
  status text NOT NULL DEFAULT 'pending',
  review_left int NOT NULL DEFAULT 3, -- 先审后发：还剩几场要工作人员放行（待东哥定，暂定 3）
  agreed_at timestamptz,             -- 负责人看完《主办方数据承诺》点同意的时间
  agreed_version text,
  agreed_by uuid REFERENCES contacts(id) ON DELETE SET NULL,
  suspended_at timestamptz,
  suspended_by text,
  suspend_reason text,
  helps int NOT NULL DEFAULT 0,      -- 试用看板：商会帮了几次（工作人员手动记）
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE organizers DROP CONSTRAINT IF EXISTS organizers_status_check;
ALTER TABLE organizers ADD CONSTRAINT organizers_status_check CHECK (status IN ('pending', 'active', 'suspended'));

CREATE TABLE IF NOT EXISTS organizer_members (
  organizer_id uuid NOT NULL REFERENCES organizers(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'helper')),
  added_at timestamptz NOT NULL DEFAULT now(),
  added_by text,
  removed_at timestamptz,
  PRIMARY KEY (organizer_id, contact_id)
);
CREATE INDEX IF NOT EXISTS organizer_members_contact_idx ON organizer_members (contact_id) WHERE removed_at IS NULL;

-- 开通码（负责人）/ 加帮手码：10 位，和工作人员 8 位绑定码分开
CREATE TABLE IF NOT EXISTS organizer_codes (
  code text PRIMARY KEY,
  organizer_id uuid NOT NULL REFERENCES organizers(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('owner', 'helper')),
  created_by text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  used_by uuid REFERENCES contacts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS org_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL REFERENCES organizers(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,         -- 对外编号（小程序码 scene 用），随机 10 位
  mode text NOT NULL DEFAULT 'signup',
  template text,
  title text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  timezone text NOT NULL DEFAULT 'America/Los_Angeles',
  location_name text,
  address text,
  capacity int,                      -- 空 = 不限
  deadline_at timestamptz,           -- 报名截止，空 = 开始前都能报
  description text,
  has_fee boolean NOT NULL DEFAULT false,
  fee_way text,                      -- 'onsite' 现场交 / 'contact' 联系主办方（第一版只这两种，不写金额数字、不写账号）
  form_fields text[] NOT NULL DEFAULT '{}', -- 报名表可勾的：party（共几人）、company、wechat、question
  question text,
  list_public text NOT NULL DEFAULT 'hidden', -- 接龙名单：nickname 公开称呼 / hidden 不公开
  status text NOT NULL DEFAULT 'review',
  sec_status text,                   -- 微信文本检测结果
  review_note text,
  reviewed_by text,
  reviewed_at timestamptz,
  taken_down_by text,
  taken_down_reason text,
  taken_down_at timestamptz,
  checkin_secret text NOT NULL,
  info_version int NOT NULL DEFAULT 1,   -- 改了时间 / 地点 +1
  poster_version int NOT NULL DEFAULT 0, -- 主办方生成海报时记下 info_version；不一样就提示"旧海报要重新生成"
  copied_from uuid,
  compose_secs int,                  -- 试用看板：从打开"发一场活动"到点发布用了几秒（小程序记）
  created_by uuid REFERENCES contacts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);
ALTER TABLE org_events DROP CONSTRAINT IF EXISTS org_events_mode_check;
ALTER TABLE org_events ADD CONSTRAINT org_events_mode_check CHECK (mode IN ('signup', 'chain'));
ALTER TABLE org_events DROP CONSTRAINT IF EXISTS org_events_status_check;
ALTER TABLE org_events ADD CONSTRAINT org_events_status_check CHECK (status IN ('review', 'published', 'rejected', 'taken_down', 'cancelled'));
ALTER TABLE org_events DROP CONSTRAINT IF EXISTS org_events_list_public_check;
ALTER TABLE org_events ADD CONSTRAINT org_events_list_public_check CHECK (list_public IN ('nickname', 'hidden'));
CREATE INDEX IF NOT EXISTS org_events_org_idx ON org_events (organizer_id, starts_at DESC);
CREATE INDEX IF NOT EXISTS org_events_review_idx ON org_events (created_at) WHERE status = 'review';

CREATE TABLE IF NOT EXISTS org_regs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES org_events(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  party_size int NOT NULL DEFAULT 1 CHECK (party_size BETWEEN 1 AND 10), -- 一共几位（含自己），占几个名额
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  nickname text,                     -- 接龙名单上公开的称呼（本人自己写的）
  note text,
  status text NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'waitlisted', 'cancelled')),
  source text NOT NULL DEFAULT 'online', -- online / onsite（门口扫码）/ organizer（主办方代登记）
  checked_in_at timestamptz,
  checkin_method text,
  paid_marked_at timestamptz,        -- 主办方手动标"已交费"（不是支付确认）
  paid_marked_by uuid,
  remind_ok boolean NOT NULL DEFAULT false, -- 报名时同意的提醒只用于本场
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  UNIQUE (event_id, contact_id)
);
CREATE INDEX IF NOT EXISTS org_regs_contact_idx ON org_regs (contact_id);

-- 每次导出记一笔；下载地址 10 分钟有效、只能下一次
CREATE TABLE IF NOT EXISTS org_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL REFERENCES organizers(id) ON DELETE CASCADE,
  event_id uuid REFERENCES org_events(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  kind text NOT NULL,                -- file / copy
  row_count int NOT NULL DEFAULT 0,
  token_hash text,
  expires_at timestamptz,
  downloaded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 商会这边（平台）因维护、投诉打开主办方名单：每次记一笔
CREATE TABLE IF NOT EXISTS org_data_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor text NOT NULL,
  organizer_id uuid REFERENCES organizers(id) ON DELETE SET NULL,
  event_id uuid REFERENCES org_events(id) ON DELETE SET NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 「我也要办活动」申请
CREATE TABLE IF NOT EXISTS org_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  org_name text NOT NULL,
  person_name text NOT NULL,
  phone text,
  note text,
  from_event uuid REFERENCES org_events(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done', 'dismissed')),
  handled_by text,
  handled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS org_guest_since timestamptz;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS chamber_linked_at timestamptz;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS chamber_linked_reason text;
CREATE INDEX IF NOT EXISTS contacts_org_guest_idx ON contacts (org_guest_since) WHERE org_guest_since IS NOT NULL;

-- 举报：加 org_event（主办方的活动）
ALTER TABLE ugc_reports DROP CONSTRAINT IF EXISTS ugc_reports_kind_check;
ALTER TABLE ugc_reports ADD CONSTRAINT ugc_reports_kind_check CHECK (kind IN ('meetup', 'profile', 'card', 'photo', 'club_member', 'org_event'));
