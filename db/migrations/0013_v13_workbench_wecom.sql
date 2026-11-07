-- 0013：SAREC 1.3 N 手机工作台（工作人员绑定小程序账号）+ O 企业微信“联系我”渠道码
-- ------------------------------------------------------------------
-- 只追加，不改动已有数据。可重复执行。

-- N：工作人员绑定小程序账号（扫后台给的绑定码一次即可；换人在后台解绑）
ALTER TABLE staff_roles ADD COLUMN IF NOT EXISTS mp_contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL;
ALTER TABLE staff_roles ADD COLUMN IF NOT EXISTS mp_bound_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS staff_roles_mp_contact_uidx ON staff_roles (mp_contact_id) WHERE mp_contact_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS staff_bind_codes (
  code        text PRIMARY KEY,                 -- 一次性绑定码（10 分钟有效）
  staff_email text NOT NULL,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  used_by     uuid,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- O：企业微信“联系我”
-- 每个入口（报名成功页、签到成功页、相册、会议室、联系商会、首页）一个渠道码；登录用户按人生成，加好友后能准确关联会员档案
CREATE TABLE IF NOT EXISTS wecom_contact_ways (
  id          bigserial PRIMARY KEY,
  placement   text NOT NULL,                    -- done / checkin / album / rooms / contact / home / default
  contact_id  uuid REFERENCES contacts(id) ON DELETE CASCADE,  -- NULL = 这个入口的公共码
  state       text NOT NULL UNIQUE,             -- 企业微信回调带回来的来源（≤30 字符）
  config_id   text NOT NULL,
  qr_url      text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS wecom_contact_ways_uidx ON wecom_contact_ways (placement, coalesce(contact_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- 加了企业微信好友的人（回调写入）：来源入口、关联的会员档案
CREATE TABLE IF NOT EXISTS wecom_external_contacts (
  external_userid text PRIMARY KEY,
  contact_id      uuid REFERENCES contacts(id) ON DELETE SET NULL,
  follow_userid   text,                         -- 加的是哪位工作人员的企业微信
  state           text,
  placement       text,
  name            text,
  unionid         text,
  matched_by      text,                         -- state / unionid / NULL（没关联上，进后台待办）
  added_at        timestamptz NOT NULL DEFAULT now(),
  removed_at      timestamptz
);
CREATE INDEX IF NOT EXISTS wecom_external_contacts_contact_idx ON wecom_external_contacts (contact_id);
