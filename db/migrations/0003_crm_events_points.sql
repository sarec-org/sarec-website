-- SAREC 会员与客户运营系统 Phase 1 —— 统一客户档案 / 活动报名签到 / 资料题库 / 积分 / 订单 / 会议室
-- ------------------------------------------------------------------
-- 依据：《会员与客户运营系统完整方案 V3.1》《渐进式会员资料题库与触发规则表 V1.1》。
-- 追加 migration，不改动 0001 / 0002 的既有表结构（只给 applications 加一列 contact_id）。
-- 金额一律 integer cents；时间一律 timestamptz。
-- 业务规则（挑题、积分结算、入场判断）写在 lib/crm/*，数据库只负责事实与唯一性。
-- ------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── 1. 客户档案（一人一个稳定编号；注册用户与正式会员共用）──────────────
CREATE TABLE IF NOT EXISTS contacts (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_no          bigserial UNIQUE,                         -- 对外显示的稳定编号
  name               text NOT NULL,                            -- 中文或英文均可
  name_alt           text,                                     -- 另一种语言的姓名
  phone_e164         text UNIQUE,                              -- 例 +16265551234 / +8613800000000
  phone_verified_at  timestamptz,
  email              text UNIQUE,                              -- 统一小写存储
  email_verified_at  timestamptz,
  wechat_openid      text UNIQUE,
  wechat_unionid     text,
  role_category      text,                                     -- Q03 大类
  role_sub           text,                                     -- Q03 细分
  acquisition_source text,                                     -- 首次进入来源（渠道码/活动）
  referred_by        uuid REFERENCES contacts(id),             -- 首次经验证绑定的推荐人
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CHECK (phone_e164 IS NOT NULL OR email IS NOT NULL OR wechat_openid IS NOT NULL)
);

-- ── 2. 企业档案（同公司员工共用；Q12 公司名匹配后关联）────────────────────
CREATE TABLE IF NOT EXISTS companies (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  name_key         text UNIQUE NOT NULL,                       -- 规范化名称，用于匹配
  role_category    text,
  role_sub         text,
  profile          jsonb NOT NULL DEFAULT '{}'::jsonb,         -- G1–G4 等公司层面资料
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS contact_companies (
  contact_id   uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title        text,
  is_primary   boolean NOT NULL DEFAULT true,
  confirmed_at timestamptz,
  PRIMARY KEY (contact_id, company_id)
);

-- 既有会员申请关联到客户档案（老会员导入后保留原等级与有效期）
ALTER TABLE applications ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES contacts(id);
CREATE INDEX IF NOT EXISTS idx_applications_contact ON applications (contact_id);

-- ── 3. 登录：验证码 + 会话（不设密码）──────────────────────────────────
CREATE TABLE IF NOT EXISTS login_codes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel      text NOT NULL CHECK (channel IN ('sms','email')),
  target       text NOT NULL,                                  -- e164 手机号或小写邮箱
  code_hash    text NOT NULL,                                  -- sha256，不存明文
  attempts     integer NOT NULL DEFAULT 0,
  expires_at   timestamptz NOT NULL,
  consumed_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_login_codes_target ON login_codes (target, created_at DESC);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash   text PRIMARY KEY,                               -- sha256(token)
  contact_id   uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  channel      text NOT NULL CHECK (channel IN ('web','miniprogram','qr_login')),
  expires_at   timestamptz NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sessions_contact ON sessions (contact_id);

-- ── 4. 活动 ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug               text UNIQUE NOT NULL,
  title              text NOT NULL,
  summary            text,
  starts_at          timestamptz NOT NULL,
  ends_at            timestamptz,
  timezone           text NOT NULL DEFAULT 'America/Los_Angeles',
  location_name      text,
  address            text,
  capacity           integer,                                  -- NULL = 不限
  fee_cents          integer NOT NULL DEFAULT 0,               -- 0 = 免费活动
  topic_tags         text[] NOT NULL DEFAULT '{}',             -- 对应题库表 7-1 主题
  registration_open  boolean NOT NULL DEFAULT true,
  event_status       text NOT NULL DEFAULT 'scheduled'
                     CHECK (event_status IN ('scheduled','completed','postponed','cancelled')),
  checkin_secret     text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- ── 5. 报名（一人一场一条；取消保留记录）──────────────────────────────
CREATE TABLE IF NOT EXISTS registrations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  contact_id      uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'registered'
                  CHECK (status IN ('registered','waitlisted','cancelled')),
  source          text NOT NULL DEFAULT 'online'
                  CHECK (source IN ('online','onsite','staff')),
  ref_contact_id  uuid REFERENCES contacts(id),                -- 邀请人（归因用）
  channel_code    text,
  arrival_status  text NOT NULL DEFAULT 'none'
                  CHECK (arrival_status IN ('none','checked_in','arrived_pending_payment')),
  arrived_at      timestamptz,
  checked_in_at   timestamptz,
  checkin_method  text CHECK (checkin_method IN ('self_scan','staff','staff_override')),
  checkin_by      text,
  override_reason text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  cancelled_at    timestamptz,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, contact_id)
);
CREATE INDEX IF NOT EXISTS idx_registrations_contact ON registrations (contact_id);

-- ── 6. 资料答案（只增不改的历史 + 当前值）────────────────────────────────
CREATE TABLE IF NOT EXISTS profile_answers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id   uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  item_code    text NOT NULL,                                  -- Q01 / R11 / G2 / S01 ...
  value        jsonb NOT NULL,                                 -- {"choice":..} / {"choices":[..]} / {"text":..} / {"unknown":true}
  is_unknown   boolean NOT NULL DEFAULT false,                 -- 暂不方便提供 / 暂不确定
  source       text NOT NULL
               CHECK (source IN ('self_select','self_text','ai_confirmed','staff','behavior','ai_guess')),
  status       text NOT NULL DEFAULT 'current'
               CHECK (status IN ('current','history','expired','pending_confirm')),
  task_id      uuid,
  recorded_by  text,                                           -- self / 工作人员 / system
  expires_at   timestamptz,                                    -- 动态资料到期
  note         text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_profile_answers_current
  ON profile_answers (contact_id, item_code) WHERE status = 'current';
-- 每个人每道题最多一个当前值
CREATE UNIQUE INDEX IF NOT EXISTS uq_profile_answers_one_current
  ON profile_answers (contact_id, item_code) WHERE status = 'current';

-- ── 7. 补资料任务（活动任务 / 资料中心持续任务 / 会员申请任务）──────────
CREATE TABLE IF NOT EXISTS profile_tasks (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id        uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  kind              text NOT NULL CHECK (kind IN ('event','profile_center','member_application')),
  event_id          uuid REFERENCES events(id) ON DELETE SET NULL,
  application_id    uuid REFERENCES applications(id) ON DELETE SET NULL,
  unrewarded_slots  integer NOT NULL DEFAULT 3,
  new_items_count   integer NOT NULL DEFAULT 0,                -- 本任务已锁定位置的新项目数
  status            text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  opened_at         timestamptz NOT NULL DEFAULT now(),
  closes_at         timestamptz,                               -- 活动任务：活动结束后 7 天；持续任务：NULL
  CHECK ((kind = 'event') = (event_id IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_task_event          ON profile_tasks (contact_id, event_id) WHERE kind = 'event';
CREATE UNIQUE INDEX IF NOT EXISTS uq_task_profile_center ON profile_tasks (contact_id) WHERE kind = 'profile_center';
CREATE UNIQUE INDEX IF NOT EXISTS uq_task_application    ON profile_tasks (contact_id, application_id) WHERE kind = 'member_application';

-- ── 8. 资料项目结算（每人每题唯一一条，决定终身是否得分）──────────────────
CREATE TABLE IF NOT EXISTS profile_settlements (
  contact_id    uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  item_code     text NOT NULL,
  task_id       uuid NOT NULL REFERENCES profile_tasks(id),
  position      integer NOT NULL,                              -- 第一次回答时在任务中的位置（1 起）
  state         text NOT NULL
                CHECK (state IN ('done_0','done_10','pending_0','pending_reward')),
  points        integer NOT NULL DEFAULT 0,
  first_at      timestamptz NOT NULL DEFAULT now(),
  settled_at    timestamptz,
  PRIMARY KEY (contact_id, item_code)
);

-- 跳过记录（冷却期计算）
CREATE TABLE IF NOT EXISTS profile_skips (
  contact_id  uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  item_code   text NOT NULL,
  task_id     uuid NOT NULL REFERENCES profile_tasks(id) ON DELETE CASCADE,
  skipped_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (contact_id, item_code, task_id)
);

-- 标签（由答案、行为、工作人员生成；带来源）
CREATE TABLE IF NOT EXISTS contact_tags (
  contact_id  uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  tag         text NOT NULL,                                   -- 类别:值，如 区域:东区
  source      text NOT NULL
              CHECK (source IN ('self_select','self_text','ai_confirmed','staff','behavior','ai_guess')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (contact_id, tag, source)
);

-- ── 9. 积分账本（每笔可追溯；event_key 唯一防重复）────────────────────────
CREATE TABLE IF NOT EXISTS points_ledger (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id    uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  category      text NOT NULL
                CHECK (category IN ('profile','signup','checkin','referral','feedback','redeem','adjust')),
  points        integer NOT NULL,                              -- 负数 = 扣减 / 撤销
  event_key     text UNIQUE NOT NULL,                          -- 例 profile:<contact>:<item>
  reason        text,
  rule_version  text NOT NULL DEFAULT 'v1.1',
  related_id    uuid,
  reverses_id   uuid REFERENCES points_ledger(id),
  created_by    text NOT NULL DEFAULT 'system',
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_points_contact ON points_ledger (contact_id, created_at DESC);

-- ── 10. 订单（会费 / 活动费 / 午餐 / 会场月卡 / 会议室 / 电子屏）─────────
CREATE TABLE IF NOT EXISTS orders (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no         text UNIQUE NOT NULL,                       -- 付款备注里填写，如 S-260123
  contact_id       uuid NOT NULL REFERENCES contacts(id),
  purpose          text NOT NULL
                   CHECK (purpose IN ('membership','event_fee','lunch','room_pass','room_booking','screen_ad','other')),
  related_id       uuid,                                       -- 活动 / 申请 / 预约 id
  description      text,
  amount_cents     integer NOT NULL CHECK (amount_cents >= 0),
  currency         text NOT NULL DEFAULT 'usd',
  provider         text NOT NULL DEFAULT 'zelle' CHECK (provider IN ('zelle','stripe','cash','check','waived')),
  status           text NOT NULL DEFAULT 'pending_payment'
                   CHECK (status IN ('pending_payment','payment_submitted','paid','cancelled','refunded')),
  payer_name       text,                                       -- 代付人
  payer_note       text,                                       -- 会员提交的付款说明
  submitted_at     timestamptz,
  paid_at          timestamptz,
  verified_by      text,
  bank_reference   text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_orders_status  ON orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_contact ON orders (contact_id);
-- 同一报名的活动费只有一张未取消订单
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_event_fee
  ON orders (contact_id, related_id) WHERE purpose = 'event_fee' AND status <> 'cancelled';

-- ── 11. 会议室与会场月卡（先定先得；不重叠）────────────────────────────
CREATE TABLE IF NOT EXISTS rooms (
  id            serial PRIMARY KEY,
  name          text NOT NULL,
  hourly_cents  integer NOT NULL DEFAULT 0,                    -- 标准价，会员按等级折扣
  is_active     boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS room_passes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id   uuid NOT NULL REFERENCES contacts(id),
  month_start  date NOT NULL,                                  -- 月卡所属月份第一天
  order_id     uuid REFERENCES orders(id),
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','cancelled')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contact_id, month_start)
);
CREATE TABLE IF NOT EXISTS room_bookings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     integer NOT NULL REFERENCES rooms(id),
  contact_id  uuid NOT NULL REFERENCES contacts(id),
  starts_at   timestamptz NOT NULL,
  ends_at     timestamptz NOT NULL CHECK (ends_at > starts_at),
  status      text NOT NULL DEFAULT 'held' CHECK (status IN ('held','confirmed','cancelled')),
  pass_id     uuid REFERENCES room_passes(id),
  order_id    uuid REFERENCES orders(id),
  purpose     text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  -- 同一会议室同一时间只能有一个有效预约（先定先得由数据库保证）
  EXCLUDE USING gist (room_id WITH =, tstzrange(starts_at, ends_at) WITH &&) WHERE (status <> 'cancelled')
);

-- ── 12. 业务审计（谁在何时因何依据改了什么）────────────────────────────
CREATE TABLE IF NOT EXISTS crm_audit_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor        text NOT NULL,                                  -- self:<contact> / staff:<name> / system
  action       text NOT NULL,                                  -- verify_payment / override_entry / merge_contact / adjust_points ...
  target_type  text NOT NULL,
  target_id    text NOT NULL,
  before_value jsonb,
  after_value  jsonb,
  reason       text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_audit_target ON crm_audit_log (target_type, target_id);
