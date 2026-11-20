-- 找工人 · 接活（11/20）。幂等：可以重复跑。不依赖 0037。
-- 表：工种分组、工种（资质表）、首页入口、接活人、核验记录、活儿、联系记录（谁看过电话）、通知记录、回访、投诉。
-- 开关：沿用 crm_settings（D11：jobs_find_on、jobs_work_on 默认开——审核的和上线的是同一个东西，开关只留给日后整栏下线；jobs_require_paid_member 默认开），改动记 updated_by + crm_audit_log。
-- 统计点击：沿用 track_events（name = 'jobs_trade' / 'jobs_home_entry'）。

-- ── 1. 工种分组 ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs_trade_groups (
  key         text PRIMARY KEY,
  name        text NOT NULL,
  sort        integer NOT NULL DEFAULT 0,
  updated_by  text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── 2. 工种（资质表，后台可增删改，不用发版）──────────────────────────
CREATE TABLE IF NOT EXISTS jobs_trades (
  key            text PRIMARY KEY,
  name           text NOT NULL,
  group_key      text NOT NULL REFERENCES jobs_trade_groups(key) ON UPDATE CASCADE,
  lic_type       text NOT NULL,                       -- A 加州承包商牌照 / B 其他州执照 / C 无州执照要求（营业登记 + 责任保险）
  issuer         text,                                -- 发证机构
  license_class  text,                                -- 牌照类别（如 C-36）
  lookup_url     text,                                -- 官方查询页
  verify_points  text,                                -- 核验要点（工作人员清单，一行一条）
  open           boolean NOT NULL DEFAULT false,      -- 是否开放（核实不了的先不开放）
  no_post        boolean NOT NULL DEFAULT false,      -- 不接受针对这个工种的活儿发布（如地产律师）
  no_notify      boolean NOT NULL DEFAULT false,      -- 不发派活通知
  sort           integer NOT NULL DEFAULT 0,
  verified       boolean NOT NULL DEFAULT false,      -- 资质表是否已对照发证机构官网核实
  note           text,
  icon           text,
  updated_by     text,                                -- 后台改过就记人；种子刷新不覆盖后台改过的行
  updated_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE jobs_trades DROP CONSTRAINT IF EXISTS jobs_trades_lic_type_check;
ALTER TABLE jobs_trades ADD CONSTRAINT jobs_trades_lic_type_check CHECK (lic_type IN ('A', 'B', 'C'));
ALTER TABLE jobs_trades ADD COLUMN IF NOT EXISTS icon text;
CREATE INDEX IF NOT EXISTS jobs_trades_group_idx ON jobs_trades (group_key, sort);

-- ── 3. 首页入口（7 个，可指向工种或分组，可排序）──────────────────────
CREATE TABLE IF NOT EXISTS jobs_home_entries (
  slot         integer PRIMARY KEY,
  label        text NOT NULL,
  icon         text,
  target_type  text NOT NULL,
  target_key   text NOT NULL,
  sort         integer NOT NULL DEFAULT 0,
  updated_by   text,
  updated_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE jobs_home_entries DROP CONSTRAINT IF EXISTS jobs_home_entries_target_type_check;
ALTER TABLE jobs_home_entries ADD CONSTRAINT jobs_home_entries_target_type_check CHECK (target_type IN ('trade', 'group'));
ALTER TABLE jobs_home_entries DROP CONSTRAINT IF EXISTS jobs_home_entries_slot_check;
ALTER TABLE jobs_home_entries ADD CONSTRAINT jobs_home_entries_slot_check CHECK (slot BETWEEN 1 AND 7);

-- ── 4. 接活人 ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs_pros (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id       uuid NOT NULL UNIQUE REFERENCES contacts(id) ON DELETE CASCADE,
  role             text NOT NULL,                      -- company 施工队或公司 / licensed 持牌师傅 / pro_service 设计与专业服务 / worker 工人
  name             text NOT NULL,
  avatar_url       text,
  trades           text[] NOT NULL DEFAULT '{}',
  verified_trades  text[] NOT NULL DEFAULT '{}',       -- 核验通过、可以接的工种（列表、派活、看电话都按它）
  cities           text[] NOT NULL DEFAULT '{}',
  years            integer,
  languages        text[] NOT NULL DEFAULT '{}',
  available_now    boolean NOT NULL DEFAULT true,
  license_no       text,
  license_state    jsonb,                              -- 最近一次自动查询结果（状态、类别、工伤保险、保证金、到期日）
  license_expires_on date,
  intro            text,
  photos           text[] NOT NULL DEFAULT '{}',
  team_size        integer,
  insurance_url    text,
  business_reg_url text,
  license_doc_url  text,
  design_no_ca_stamp boolean NOT NULL DEFAULT false,   -- 设计院没有加州执照：只能标“方案与咨询，不提供加州报批签章”
  agreed_at        timestamptz,
  status           text NOT NULL DEFAULT 'draft',
  return_reason    text,
  needs_review     boolean NOT NULL DEFAULT false,     -- 核验通过后又加了工种 / 换了牌照号：等工作人员再看
  verified_at      timestamptz,
  verified_by      text,
  next_review_at   timestamptz,
  is_paid_member   boolean NOT NULL DEFAULT false,     -- 缴费会员快照（登记、核验、每天复核时刷新）
  listed           boolean NOT NULL DEFAULT false,
  wx_quota         integer NOT NULL DEFAULT 0,         -- 微信订阅消息剩余次数（允许一次发一条）
  removed_reason   text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE jobs_pros DROP CONSTRAINT IF EXISTS jobs_pros_role_check;
ALTER TABLE jobs_pros ADD CONSTRAINT jobs_pros_role_check CHECK (role IN ('company', 'licensed', 'pro_service', 'worker'));
ALTER TABLE jobs_pros DROP CONSTRAINT IF EXISTS jobs_pros_status_check;
ALTER TABLE jobs_pros ADD CONSTRAINT jobs_pros_status_check CHECK (status IN ('draft', 'pending', 'verified', 'returned', 'removed'));
ALTER TABLE jobs_pros DROP CONSTRAINT IF EXISTS jobs_pros_photos_check;
ALTER TABLE jobs_pros ADD CONSTRAINT jobs_pros_photos_check CHECK (coalesce(array_length(photos, 1), 0) <= 9);
ALTER TABLE jobs_pros ADD COLUMN IF NOT EXISTS wechat text;
CREATE INDEX IF NOT EXISTS jobs_pros_listed_idx ON jobs_pros (listed, status);
CREATE INDEX IF NOT EXISTS jobs_pros_trades_idx ON jobs_pros USING gin (verified_trades);
CREATE INDEX IF NOT EXISTS jobs_pros_cities_idx ON jobs_pros USING gin (cities);

-- ── 5. 核验记录 ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs_verifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id      uuid NOT NULL REFERENCES jobs_pros(id) ON DELETE CASCADE,
  kind        text NOT NULL,                           -- auto_cslb / manual / review90 / expiry
  action      text NOT NULL,                           -- approve / return / remove / check
  result      jsonb,
  reason      text,
  actor       text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jobs_verifications_pro_idx ON jobs_verifications (pro_id, created_at DESC);

-- ── 6. 活儿 ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs_posts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id         uuid NOT NULL,                      -- 一次发布按工种拆成几条，共用批次号
  contact_id       uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  poster_role      text NOT NULL,                      -- owner 房主 / landlord 房东 / property 物业 / developer 开发商 / crew 施工队（招工人）
  trade_key        text NOT NULL REFERENCES jobs_trades(key) ON UPDATE CASCADE,
  city             text NOT NULL,
  title            text NOT NULL,
  description      text NOT NULL DEFAULT '',
  photos           text[] NOT NULL DEFAULT '{}',
  voice_url        text,
  timing           text NOT NULL DEFAULT 'flexible',   -- asap 尽快 / week 本周 / month 本月 / flexible 可商量
  budget_range     text,
  property_type    text,                               -- house 独栋 / condo 公寓 / commercial 商业
  call_name        text,
  phone            text,                               -- 发布时的已验证手机号（只给有资格的人看）
  wechat           text,
  crew_headcount   integer,
  crew_duration    text,
  crew_pay         text,
  want_site_visit  boolean NOT NULL DEFAULT false,
  turnover         boolean NOT NULL DEFAULT false,     -- 退租整修
  status           text NOT NULL DEFAULT 'open',       -- open 找人中 / found 已找到 / closed 已关闭 / removed 已下架
  close_reason     text,                               -- expired 到期自动关闭 / self 自己关 / staff 工作人员下架
  expires_at       timestamptz NOT NULL DEFAULT now() + interval '14 days',
  renew_token      text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  renew_reminded_at timestamptz,
  notify_round     integer NOT NULL DEFAULT 0,
  notified_at      timestamptz,
  first_contact_at timestamptz,
  staff_alerted_at timestamptz,
  followup_sent_at timestamptz,
  staff_note       text,
  removed_by       text,
  sec_status       text,                               -- 内容安全检查结果
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE jobs_posts DROP CONSTRAINT IF EXISTS jobs_posts_status_check;
ALTER TABLE jobs_posts ADD CONSTRAINT jobs_posts_status_check CHECK (status IN ('open', 'found', 'closed', 'removed'));
ALTER TABLE jobs_posts DROP CONSTRAINT IF EXISTS jobs_posts_role_check;
ALTER TABLE jobs_posts ADD CONSTRAINT jobs_posts_role_check CHECK (poster_role IN ('owner', 'landlord', 'property', 'developer', 'crew'));
ALTER TABLE jobs_posts DROP CONSTRAINT IF EXISTS jobs_posts_timing_check;
ALTER TABLE jobs_posts ADD CONSTRAINT jobs_posts_timing_check CHECK (timing IN ('asap', 'week', 'month', 'flexible'));
ALTER TABLE jobs_posts DROP CONSTRAINT IF EXISTS jobs_posts_photos_check;
ALTER TABLE jobs_posts ADD CONSTRAINT jobs_posts_photos_check CHECK (coalesce(array_length(photos, 1), 0) <= 9);
CREATE INDEX IF NOT EXISTS jobs_posts_list_idx ON jobs_posts (status, created_at DESC);
CREATE INDEX IF NOT EXISTS jobs_posts_trade_idx ON jobs_posts (trade_key, city);
CREATE INDEX IF NOT EXISTS jobs_posts_contact_idx ON jobs_posts (contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS jobs_posts_batch_idx ON jobs_posts (batch_id);
CREATE UNIQUE INDEX IF NOT EXISTS jobs_posts_renew_token_idx ON jobs_posts (renew_token);

-- ── 7. 联系记录（谁看过电话；活儿、接活人两个方向）──────────────────
CREATE TABLE IF NOT EXISTS jobs_contacts (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction          text NOT NULL,                    -- post：接活人看了活儿发布人的电话；pro：有人看了接活人的电话
  post_id            uuid REFERENCES jobs_posts(id) ON DELETE CASCADE,
  pro_id             uuid REFERENCES jobs_pros(id) ON DELETE CASCADE,
  viewer_contact_id  uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  times              integer NOT NULL DEFAULT 1,
  first_at           timestamptz NOT NULL DEFAULT now(),
  last_at            timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE jobs_contacts DROP CONSTRAINT IF EXISTS jobs_contacts_direction_check;
ALTER TABLE jobs_contacts ADD CONSTRAINT jobs_contacts_direction_check CHECK (
  (direction = 'post' AND post_id IS NOT NULL) OR (direction = 'pro' AND pro_id IS NOT NULL));
CREATE UNIQUE INDEX IF NOT EXISTS jobs_contacts_post_uq ON jobs_contacts (post_id, viewer_contact_id) WHERE direction = 'post';
CREATE UNIQUE INDEX IF NOT EXISTS jobs_contacts_pro_uq ON jobs_contacts (pro_id, viewer_contact_id) WHERE direction = 'pro';

-- ── 8. 通知记录（派活、续期提醒、回访、执照下架；含没发出的原因）──────
CREATE TABLE IF NOT EXISTS jobs_notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        text NOT NULL,                           -- dispatch / renew / followup / license / invite
  post_id     uuid REFERENCES jobs_posts(id) ON DELETE CASCADE,
  pro_id      uuid REFERENCES jobs_pros(id) ON DELETE CASCADE,
  contact_id  uuid REFERENCES contacts(id) ON DELETE CASCADE,
  round       integer NOT NULL DEFAULT 1,
  channel     text,                                    -- wx / sms / none
  status      text NOT NULL,                           -- sent / failed / blocked（开关关、非正式环境且不是测试身份）/ no_channel
  detail      text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jobs_notifications_post_idx ON jobs_notifications (post_id, kind);
CREATE INDEX IF NOT EXISTS jobs_notifications_contact_idx ON jobs_notifications (contact_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS jobs_notifications_dispatch_uq ON jobs_notifications (post_id, pro_id) WHERE kind = 'dispatch';

-- ── 9. 回访（第 7 天，一键回答；结果只进后台）──────────────────────────
CREATE TABLE IF NOT EXISTS jobs_followups (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id      uuid NOT NULL REFERENCES jobs_posts(id) ON DELETE CASCADE,
  contact_id   uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  side         text NOT NULL,                          -- poster 发布人 / pro 联系过的人
  token        text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  sent_at      timestamptz,
  answered_at  timestamptz,
  reached      boolean,                                -- 联系上了吗
  deal         boolean,                                -- 成了吗
  satisfied    boolean,                                -- 满意吗
  note         text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, contact_id)
);

-- ── 10. 投诉 / 反馈（直达工作人员）────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs_reports (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type          text NOT NULL CHECK (target_type IN ('pro', 'post')),
  target_id            uuid NOT NULL,
  reporter_contact_id  uuid REFERENCES contacts(id) ON DELETE SET NULL,
  reason               text NOT NULL,
  status               text NOT NULL DEFAULT 'open',   -- open / handled
  handled_by           text,
  handled_note         text,
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jobs_reports_status_idx ON jobs_reports (status, created_at DESC);

-- ── 11. 三个开关（D11：找工人、接活默认开；要求缴费会员默认开。只影响新建，已有的值不改）──
INSERT INTO crm_settings (key, value, updated_by) VALUES
  ('jobs_find_on', 'true', 'migration-0038'),
  ('jobs_work_on', 'true', 'migration-0038'),
  ('jobs_require_paid_member', 'true', 'migration-0038')
ON CONFLICT (key) DO NOTHING;

-- ── 12. 种子：分组（按资质表核实.md ② 分组建议）─────────────────────
INSERT INTO jobs_trade_groups (key, name, sort) VALUES
  ('utility', '水电暖', 10),
  ('repair', '维修与装修', 20),
  ('build', '建房与加建', 30),
  ('outdoor', '屋外与庭院', 40),
  ('clean', '清洁、清运与搬家', 50),
  ('design', '设计与专业服务', 60),
  ('property', '房产服务', 70),
  ('legal', '法律财税保险', 80)
ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, sort = EXCLUDED.sort WHERE jobs_trade_groups.updated_by IS NULL;

-- ── 13. 种子：工种（~/WeChatProjects/找工人接活_资质表.json，41 项，研究子任务 11/20 对照发证机构官网核实）──
-- open = 核实结论 verified（核实不了的 water_mold、pm_owner_rep 先不开放）；lookup_url 里的 {licNum} 由程序换成牌照号。
-- 重跑时只刷新后台没改过的行（updated_by IS NULL）。
INSERT INTO jobs_trades (key, name, group_key, lic_type, issuer, license_class, lookup_url, verify_points, open, no_post, no_notify, icon, sort, verified, note) VALUES
  ('plumbing', '水管', 'utility', 'A', '加州承包商执照委员会 CSLB', 'C-36 水管（也接受 B 总包，但 B 只做单一水管活不行）', 'https://www.cslb.ca.gov/OnlineServices/CheckLicenseII/LicenseDetail.aspx?LicNum={licNum}', E'牌照状态为 active（页面写 This license is current and active）\n牌照类别里有本工种对应的类别（见牌照类别栏）\n保证金（Contractor''s Bond）有效、未注销\n工伤保险有效，或声明无雇员豁免（豁免的要提醒：不能带工人）\n到期日（Expire Date）记下来，到期前提醒\n牌照上的公司名/人名与登记人一致', true, false, false, 'faucet', 10, true, 'C-36 含热水器、燃气管、排污。B 牌照按 B&P 7057 只有涉及两个以上无关工种才能单独承包水管。'),
  ('electrical', '电工（含充电桩）', 'utility', 'A', '加州承包商执照委员会 CSLB', 'C-10 电工（弱电可接受 C-7）', 'https://www.cslb.ca.gov/OnlineServices/CheckLicenseII/LicenseDetail.aspx?LicNum={licNum}', E'牌照状态为 active（页面写 This license is current and active）\n牌照类别里有本工种对应的类别（见牌照类别栏）\n保证金（Contractor''s Bond）有效、未注销\n工伤保险有效，或声明无雇员豁免（豁免的要提醒：不能带工人）\n到期日（Expire Date）记下来，到期前提醒\n牌照上的公司名/人名与登记人一致\n充电桩：必须 C-10（C-7 弱电不能接 240V 充电桩）', true, false, false, 'bolt', 20, true, 'C-10 官方定义含一切产生/输送/使用电能的线路设备，充电桩归这里。'),
  ('hvac', '空调暖气', 'utility', 'A', '加州承包商执照委员会 CSLB', 'C-20 暖通空调（另可接受 C-38 制冷、C-4 锅炉热水）', 'https://www.cslb.ca.gov/OnlineServices/CheckLicenseII/LicenseDetail.aspx?LicNum={licNum}', E'牌照状态为 active（页面写 This license is current and active）\n牌照类别里有本工种对应的类别（见牌照类别栏）\n保证金（Contractor''s Bond）有效、未注销\n工伤保险有效，或声明无雇员豁免（豁免的要提醒：不能带工人）\n到期日（Expire Date）记下来，到期前提醒\n牌照上的公司名/人名与登记人一致', true, false, false, 'snowflake', 30, true, 'C-20 含热泵热水器、风管、恒温器。'),
  ('handyman', '房屋维修', 'repair', 'A', '加州承包商执照委员会 CSLB', '无专门“杂工”牌照：接受 B、B-2，或与具体活对口的 C 类', 'https://www.cslb.ca.gov/OnlineServices/CheckLicenseII/LicenseDetail.aspx?LicNum={licNum}', E'牌照状态为 active（页面写 This license is current and active）\n牌照类别里有本工种对应的类别（见牌照类别栏）\n保证金（Contractor''s Bond）有效、未注销\n工伤保险有效，或声明无雇员豁免（豁免的要提醒：不能带工人）\n到期日（Expire Date）记下来，到期前提醒\n牌照上的公司名/人名与登记人一致\n按活儿内容看类别是否对口（换水龙头→C-36 等）', true, false, false, 'wrench', 40, true, '加州没有 handyman 牌照。法律有小活例外：B&P 7048，含工料总价不到 $1,000、不需要建筑许可、不雇人、不打“持牌”广告，可以不持牌（2025-01-01 起由 $500 提到 $1,000）。按原始指令本平台不用这个例外，一律要牌照。'),
  ('roofing', '屋顶防水', 'build', 'A', '加州承包商执照委员会 CSLB', 'C-39 屋顶（B 也可作为多工种项目的一部分）', 'https://www.cslb.ca.gov/OnlineServices/CheckLicenseII/LicenseDetail.aspx?LicNum={licNum}', E'牌照状态为 active（页面写 This license is current and active）\n牌照类别里有本工种对应的类别（见牌照类别栏）\n保证金（Contractor''s Bond）有效、未注销\n工伤保险有效，或声明无雇员豁免（豁免的要提醒：不能带工人）\n到期日（Expire Date）记下来，到期前提醒\n牌照上的公司名/人名与登记人一致', true, false, false, 'roof', 50, true, 'C-39 官方定义含屋面、防水、防风雨材料。'),
  ('windows', '门窗玻璃', 'repair', 'A', '加州承包商执照委员会 CSLB', 'C-17 玻璃；门类 C-61/D-28 门、门禁；木门窗也可 C-6；B', 'https://www.cslb.ca.gov/OnlineServices/CheckLicenseII/LicenseDetail.aspx?LicNum={licNum}', E'牌照状态为 active（页面写 This license is current and active）\n牌照类别里有本工种对应的类别（见牌照类别栏）\n保证金（Contractor''s Bond）有效、未注销\n工伤保险有效，或声明无雇员豁免（豁免的要提醒：不能带工人）\n到期日（Expire Date）记下来，到期前提醒\n牌照上的公司名/人名与登记人一致\n只做门的接受 D-28；只做玻璃的要 C-17', true, false, false, 'window', 60, true, 'D-28 含各类门、推拉玻璃门及框。'),
  ('garage_door', '车库门', 'repair', 'A', '加州承包商执照委员会 CSLB', 'C-61/D-28 门、闸门及启动装置（含车库/卷帘门）；B', 'https://www.cslb.ca.gov/OnlineServices/CheckLicenseII/LicenseDetail.aspx?LicNum={licNum}', E'牌照状态为 active（页面写 This license is current and active）\n牌照类别里有本工种对应的类别（见牌照类别栏）\n保证金（Contractor''s Bond）有效、未注销\n工伤保险有效，或声明无雇员豁免（豁免的要提醒：不能带工人）\n到期日（Expire Date）记下来，到期前提醒\n牌照上的公司名/人名与登记人一致\n开门机接电如需新线路，另需 C-10', true, false, false, 'garage', 70, true, 'D-28 官方定义含 overhead door 和电动门。'),
  ('painting', '油漆粉刷', 'repair', 'A', '加州承包商执照委员会 CSLB', 'C-33 油漆装饰（贴墙纸 C-61/D-29）', 'https://www.cslb.ca.gov/OnlineServices/CheckLicenseII/LicenseDetail.aspx?LicNum={licNum}', E'牌照状态为 active（页面写 This license is current and active）\n牌照类别里有本工种对应的类别（见牌照类别栏）\n保证金（Contractor''s Bond）有效、未注销\n工伤保险有效，或声明无雇员豁免（豁免的要提醒：不能带工人）\n到期日（Expire Date）记下来，到期前提醒\n牌照上的公司名/人名与登记人一致', true, false, false, 'paint-roller', 80, true, 'C-33 含刮除、喷砂、上漆、防水涂料。'),
  ('flooring', '地板瓷砖', 'repair', 'A', '加州承包商执照委员会 CSLB', 'C-15 地板（不含瓷砖）；C-54 瓷砖石材', 'https://www.cslb.ca.gov/OnlineServices/CheckLicenseII/LicenseDetail.aspx?LicNum={licNum}', E'牌照状态为 active（页面写 This license is current and active）\n牌照类别里有本工种对应的类别（见牌照类别栏）\n保证金（Contractor''s Bond）有效、未注销\n工伤保险有效，或声明无雇员豁免（豁免的要提醒：不能带工人）\n到期日（Expire Date）记下来，到期前提醒\n牌照上的公司名/人名与登记人一致\n做瓷砖的必须 C-54；C-15 不含瓷砖', true, false, false, 'tiles', 90, true, 'C-15 明文排除 ceramic tile。'),
  ('kitchen_bath', '厨卫装修', 'repair', 'A', '加州承包商执照委员会 CSLB', 'B 总包 或 B-2 住宅改造（三个以上无关工种）', 'https://www.cslb.ca.gov/OnlineServices/CheckLicenseII/LicenseDetail.aspx?LicNum={licNum}', E'牌照状态为 active（页面写 This license is current and active）\n牌照类别里有本工种对应的类别（见牌照类别栏）\n保证金（Contractor''s Bond）有效、未注销\n工伤保险有效，或声明无雇员豁免（豁免的要提醒：不能带工人）\n到期日（Expire Date）记下来，到期前提醒\n牌照上的公司名/人名与登记人一致\nB-2 不能动承重结构；动墙/梁的要 B', true, false, false, 'bath', 100, true, 'B-2 自 2021 年起设立，只能做现有住宅木结构、至少三工种、不改承重。'),
  ('remodel', '全屋翻新', 'repair', 'A', '加州承包商执照委员会 CSLB', 'B 总包 或 B-2 住宅改造', 'https://www.cslb.ca.gov/OnlineServices/CheckLicenseII/LicenseDetail.aspx?LicNum={licNum}', E'牌照状态为 active（页面写 This license is current and active）\n牌照类别里有本工种对应的类别（见牌照类别栏）\n保证金（Contractor''s Bond）有效、未注销\n工伤保险有效，或声明无雇员豁免（豁免的要提醒：不能带工人）\n到期日（Expire Date）记下来，到期前提醒\n牌照上的公司名/人名与登记人一致\nB-2 不能动承重结构、地基、屋架', true, false, false, 'hammer', 110, true, '同上。'),
  ('adu', 'ADU 与加建', 'build', 'A', '加州承包商执照委员会 CSLB', 'B 总包（B-2 不行，因为加建涉及结构）', 'https://www.cslb.ca.gov/OnlineServices/CheckLicenseII/LicenseDetail.aspx?LicNum={licNum}', E'牌照状态为 active（页面写 This license is current and active）\n牌照类别里有本工种对应的类别（见牌照类别栏）\n保证金（Contractor''s Bond）有效、未注销\n工伤保险有效，或声明无雇员豁免（豁免的要提醒：不能带工人）\n到期日（Expire Date）记下来，到期前提醒\n牌照上的公司名/人名与登记人一致\nADU 涉及地基/结构，只接受 B', true, false, false, 'house-plus', 120, true, 'B-2 不得改动承重部分，所以 ADU/加建只认 B。'),
  ('general', '新建与总包', 'build', 'A', '加州承包商执照委员会 CSLB', 'B 总包（土木/市政类工程为 A 总工程）', 'https://www.cslb.ca.gov/OnlineServices/CheckLicenseII/LicenseDetail.aspx?LicNum={licNum}', E'牌照状态为 active（页面写 This license is current and active）\n牌照类别里有本工种对应的类别（见牌照类别栏）\n保证金（Contractor''s Bond）有效、未注销\n工伤保险有效，或声明无雇员豁免（豁免的要提醒：不能带工人）\n到期日（Expire Date）记下来，到期前提醒\n牌照上的公司名/人名与登记人一致', true, false, false, 'crane', 130, true, 'B&P 7057：B 为至少两个无关工种的建筑总包；A 为道路、管线、土方等工程。'),
  ('specialty_sub', '专业分包', 'build', 'A', '加州承包商执照委员会 CSLB', '任一 C 类或 C-61/D 子类（按分包内容对口）', 'https://www.cslb.ca.gov/OnlineServices/CheckLicenseII/LicenseDetail.aspx?LicNum={licNum}', E'牌照状态为 active（页面写 This license is current and active）\n牌照类别里有本工种对应的类别（见牌照类别栏）\n保证金（Contractor''s Bond）有效、未注销\n工伤保险有效，或声明无雇员豁免（豁免的要提醒：不能带工人）\n到期日（Expire Date）记下来，到期前提醒\n牌照上的公司名/人名与登记人一致\n登记时让他选具体类别，核对牌照上确有该类别', true, false, false, 'toolbox', 140, true, '范围很宽，系统只能核“有有效牌照+有所选类别”，是否对口靠人工。'),
  ('hardscape', '围栏露台铺地', 'outdoor', 'A', '加州承包商执照委员会 CSLB', 'C-13 围栏、C-8 混凝土、C-12 铺路土方、C-29 砌石、C-61/D-41 外墙板与平台、C-27 景观（配套小件）；B', 'https://www.cslb.ca.gov/OnlineServices/CheckLicenseII/LicenseDetail.aspx?LicNum={licNum}', E'牌照状态为 active（页面写 This license is current and active）\n牌照类别里有本工种对应的类别（见牌照类别栏）\n保证金（Contractor''s Bond）有效、未注销\n工伤保险有效，或声明无雇员豁免（豁免的要提醒：不能带工人）\n到期日（Expire Date）记下来，到期前提醒\n牌照上的公司名/人名与登记人一致\n按做的东西对类别：围栏 C-13、水泥地 C-8、沥青铺路 C-12、木平台 D-41', true, false, false, 'fence', 150, true, 'CSLB《园丁还是景观承包商》说明：围栏、平台、露台、步道、挡土墙都需执照；C-27 只能在较大景观项目里附带做。'),
  ('landscape', '景观与灌溉', 'outdoor', 'A', '加州承包商执照委员会 CSLB', 'C-27 景观；人工草和灌溉也可 C-61/D-12 合成材料', 'https://www.cslb.ca.gov/OnlineServices/CheckLicenseII/LicenseDetail.aspx?LicNum={licNum}', E'牌照状态为 active（页面写 This license is current and active）\n牌照类别里有本工种对应的类别（见牌照类别栏）\n保证金（Contractor''s Bond）有效、未注销\n工伤保险有效，或声明无雇员豁免（豁免的要提醒：不能带工人）\n到期日（Expire Date）记下来，到期前提醒\n牌照上的公司名/人名与登记人一致', true, false, false, 'sprout', 160, true, 'CSLB：灌溉系统、种植草皮、景观灯、排水都要执照。'),
  ('tree', '树木修剪', 'outdoor', 'A', '加州承包商执照委员会 CSLB', 'C-49 树木与棕榈（2024-01-01 起取代 D-49；旧 C-61/D-49 持有人仍可继续做）', 'https://www.cslb.ca.gov/OnlineServices/CheckLicenseII/LicenseDetail.aspx?LicNum={licNum}', E'牌照状态为 active（页面写 This license is current and active）\n牌照类别里有本工种对应的类别（见牌照类别栏）\n保证金（Contractor''s Bond）有效、未注销\n工伤保险有效，或声明无雇员豁免（豁免的要提醒：不能带工人）\n到期日（Expire Date）记下来，到期前提醒\n牌照上的公司名/人名与登记人一致\n新牌照看 C-49；老牌照 D-49 也认', true, false, false, 'tree', 170, true, 'D-49 已于 2024 年停发，统一为 C-49。B&P 7026.1(a)(4)：园丁顺带修剪 15 英尺以下树木不需执照；15 英尺及以上必须持牌。'),
  ('water_mold', '水损霉菌修复', 'repair', 'A', '加州承包商执照委员会 CSLB', '无专门类别：常见 B、C-61/D-64 非专门类；拆石棉要 C-22 或 ASB 认证；灾后有害物清理要 HAZ 认证', 'https://www.cslb.ca.gov/OnlineServices/CheckLicenseII/LicenseDetail.aspx?LicNum={licNum}', E'牌照状态为 active（页面写 This license is current and active）\n牌照类别里有本工种对应的类别（见牌照类别栏）\n保证金（Contractor''s Bond）有效、未注销\n工伤保险有效，或声明无雇员豁免（豁免的要提醒：不能带工人）\n到期日（Expire Date）记下来，到期前提醒\n牌照上的公司名/人名与登记人一致\n只抽水烘干/除霉而不拆不修的，州法没有明确牌照要求\n一旦拆墙、换板、修复，就是施工，要对口 CSLB 牌照\n涉及石棉：C-22 或牌照上有 ASB 认证', false, false, false, 'droplet', 180, false, '加州没有霉菌修复州执照。洛杉矶县消费者局指南列出修复常见牌照：B、C-21、C-12、C-61。是否对口需要人工判断。'),
  ('solar', '太阳能', 'utility', 'A', '加州承包商执照委员会 CSLB', 'C-46 太阳能（光伏也可 C-10；太阳能热水也可 C-36；B）', 'https://www.cslb.ca.gov/OnlineServices/CheckLicenseII/LicenseDetail.aspx?LicNum={licNum}', E'牌照状态为 active（页面写 This license is current and active）\n牌照类别里有本工种对应的类别（见牌照类别栏）\n保证金（Contractor''s Bond）有效、未注销\n工伤保险有效，或声明无雇员豁免（豁免的要提醒：不能带工人）\n到期日（Expire Date）记下来，到期前提醒\n牌照上的公司名/人名与登记人一致', true, false, false, 'sun', 190, true, 'C-46 官方定义：安装维修光热与光伏系统。'),
  ('post_clean', '施工后清理', 'clean', 'A', '加州承包商执照委员会 CSLB', 'C-61/D-63 施工清理；B 也可', 'https://www.cslb.ca.gov/OnlineServices/CheckLicenseII/LicenseDetail.aspx?LicNum={licNum}', E'牌照状态为 active（页面写 This license is current and active）\n牌照类别里有本工种对应的类别（见牌照类别栏）\n保证金（Contractor''s Bond）有效、未注销\n工伤保险有效，或声明无雇员豁免（豁免的要提醒：不能带工人）\n到期日（Expire Date）记下来，到期前提醒\n牌照上的公司名/人名与登记人一致', true, false, false, 'broom', 200, true, 'D-63 官方定义：清除施工产生的混凝土、土、木料、石膏、墙板、油漆胶渍等。'),
  ('pest', '虫害白蚁', 'repair', 'B', '结构害虫控制委员会 SPCB（Structural Pest Control Board）', '分支 1 熏蒸 / 分支 2 一般害虫 / 分支 3 白蚁等木材害虫；公司须为注册公司（Registered Company），个人为 Operator / Field Rep / Applicator', 'https://search.dca.ca.gov/', E'在 DCA 查询里选 Structural Pest Control Board，查公司注册号和本人执照\n分支对口：白蚁要 Branch 3；熏蒸要 Branch 1；蟑螂老鼠要 Branch 2\nField Rep / Applicator 只能替注册公司干活，不能自己单独接\n状态 current / 到期日', true, false, false, 'bug', 210, true, '官方三分支说明见 pestboard.ca.gov/howdoi/3branches.shtml。注销的执照查不到，要打电话问。'),
  ('architect', '建筑设计', 'design', 'B', '加州建筑师委员会 CAB（California Architects Board）', 'Architect（个人执照，委员会不发公司执照）', 'https://search.dca.ca.gov/', E'在 DCA 查询选 Architects Board，按姓名/执照号查\n只认个人；设计院按其持牌建筑师核\n没有加州执照的设计院只能标“方案与咨询，不提供加州报批签章”', true, false, false, 'compass', 220, true, '注意：B&P 5537 允许无照人员设计两层加地下室以内的木结构独栋、四户以内住宅及其车库。所以市场上有很多无照“建筑设计师”（building designer）合法做小住宅。本平台按初稿只收持牌建筑师；如要收无照设计师，需另开一个 C 类“住宅绘图”工种并写清范围。'),
  ('engineer', '结构土木岩土', 'design', 'B', '工程师、测量师与地质师委员会 BPELSG', 'C 土木工程师 / S 结构工程师 / GE 岩土工程师（另有 EG 工程地质师）', 'https://search.dca.ca.gov/?BD=31', E'DCA 查询（BPELSG）按执照号查，执照号只填数字，注意同号可能对应不同类型，核对类型\n结构计算/签章要 C 或 S；土壤报告要 GE\n委员会不发公司执照，公司按其持牌工程师核\n执法记录不全在网上，有疑问打 (916) 999-3593', true, false, false, 'beam', 230, true, ''),
  ('surveyor', '测量', 'design', 'B', '工程师、测量师与地质师委员会 BPELSG', 'L 土地测量师（编号 C 33965 及以下的老土木工程师也可测量）', 'https://search.dca.ca.gov/?BD=31', E'DCA 查询看类型为 Land Surveyor（L）\n老土木工程师（C 33965 及以下）也可做测量', true, false, false, 'map', 240, true, ''),
  ('property_mgmt', '物业管理', 'property', 'B', '加州房地产局 DRE', '房地产经纪人执照（Broker）；销售员（Salesperson）须挂在经纪人名下', 'https://www2.dre.ca.gov/PublicASP/pplinfo.asp', E'在 DRE 公开查询页输入执照号/姓名\n状态 Licensed；公司要查公司（Corporation）执照和指定经纪人\n销售员要看挂靠的 Responsible Broker', true, false, false, 'building-key', 250, true, '加州没有单独的“物业经理执照”；替别人出租、收租、招租收费，按 B&P 10131(b) 要 DRE 经纪执照。业主管自己房子不用。HOA 社区管理经理不用 DRE 执照（另有自愿认证）。'),
  ('appraiser', '房产估价', 'property', 'B', '房地产估价师局 BREA（原 OREA）', 'Trainee 实习 / Licensed Residential / Certified Residential / Certified General', 'https://www2.brea.ca.gov/breasearch/faces/party/search.xhtml', E'BREA 查询页按姓名或执照号查\n实习估价师（Trainee）不能独立接活\n级别对口：商业物业要 Certified General', true, false, false, 'clipboard-check', 260, true, ''),
  ('locksmith', '锁匠', 'repair', 'B', '安保与调查服务局 BSIS', '锁匠公司执照 LCO；员工须有锁匠员工注册', 'https://search.dca.ca.gov/', E'DCA 查询选 Security and Investigative Services，查公司 LCO 执照\n上门师傅要有员工注册卡\n状态 current', true, false, false, 'key', 270, true, 'BSIS 官方要求开锁前出示公司执照或员工注册卡加带照片证件。注意：装门禁/保险柜工程另属 CSLB C-28 / D-16。'),
  ('movers', '搬家', 'clean', 'B', '家居用品与服务局 BHGS（Bureau of Household Goods and Services，属 DCA）', '家庭搬运商许可，编号格式 CAL-T xxxxxx', 'https://search.dca.ca.gov/hhm_search', E'在 BHGS 搬家公司查询里输入 Cal-T 号\n状态 Active\n广告和合同上必须印 Cal-T 号', true, false, false, 'truck', 280, true, '2018-07-01 起搬家业由 CPUC 移交给 DCA 下的 BHGS 管，Cal-T 号保留。'),
  ('lawyer', '地产律师', 'legal', 'B', '加州律师协会 State Bar of California', 'California 律师执照（Active 才能执业）', 'https://apps.calbar.ca.gov/attorney/Licensee/Detail/{licNum}', E'按律师号打开详情页\nLicense Status 为 Active\n看有无公开纪律处分', true, true, true, 'scale', 290, true, '只展示、可联系；不发通知；不接受针对律师的活儿发布。'),
  ('tax', '会计税务', 'legal', 'B', '会计委员会 CBA（CPA）/ 美国国税局 IRS（EA，联邦）/ 加州税务教育委员会 CTEC（普通报税员）', 'CPA 执照 / IRS 注册代理人 EA / CTEC 注册报税员 CRTP', 'https://search.dca.ca.gov/', E'CPA：DCA 查询选 Accountancy, Board of\nEA：IRS 持证报税人目录 https://irs.treasury.gov/rpo/rpo.jsf\n普通报税员：CTEC 查询 https://ctec.org/taxpayers/find-verify-preparer/\nCPA、律师、EA 免 CTEC 注册；其他收费报税的必须 CTEC 注册\n只做记账（不报税、不出审计报告）的没有州执照要求', true, false, false, 'calculator', 300, true, '三种都认，按他选的身份去对应查询页核。'),
  ('insurance', '保险', 'legal', 'B', '加州保险局 CDI', '保险代理/经纪执照（Property & Casualty 财产险、Life 寿险等）', 'https://cdicloud.insurance.ca.gov/cal/LicenseNumberSearch', E'按执照号或姓名查\n状态有效，险种对口（房屋保险要 Property & Casualty）\n看纪律处分记录', true, false, false, 'shield', 310, true, ''),
  ('cleaning', '清洁保洁', 'clean', 'C', '无州执照（改交营业登记和责任保险）', '无（加州无清洁业州执照）', 'https://bizfileonline.sos.ca.gov/search/business', E'营业登记：公司/LLC 查加州州务卿 bizfile（https://bizfileonline.sos.ca.gov/search/business）；个体户看市/县营业执照或虚构商号（DBA）登记\n责任保险单（COI）：保额、有效期、被保人名称\n只做清洁；涉及拆除、修补就要 CSLB 牌照', true, false, false, 'sparkles', 320, true, '州层面无执照，地方市县营业执照照常要。'),
  ('junk', '垃圾清运', 'clean', 'C', '无州执照（改交营业登记和责任保险）', '无州执照；但很多城市要求清运许可/特许', 'https://bizfileonline.sos.ca.gov/search/business', E'营业登记：公司/LLC 查加州州务卿 bizfile（https://bizfileonline.sos.ca.gov/search/business）；个体户看市/县营业执照或虚构商号（DBA）登记\n责任保险单（COI）：保额、有效期、被保人名称\n看所在城市是否要清运许可：如洛杉矶市要 AB 939 清运许可（LASAN Waste Hauler Permit）；洛杉矶县非建制区为特许经营区、只能用授权清运商\n在城市方块里写明“限有当地许可的城市”', true, false, false, 'dumpster', 330, true, '例：洛杉矶市规定所有私营清运商都要 AB 939 合规许可，建筑垃圾要运到认证处理厂；业主自己拉自家装修垃圾除外。各城市规则不同，审核时按服务城市逐个看。'),
  ('gardening', '园艺养护', 'outdoor', 'C', '无州执照（改交营业登记和责任保险）', '无（除草、剪草、修灌木不用执照）', 'https://bizfileonline.sos.ca.gov/search/business', E'营业登记：公司/LLC 查加州州务卿 bizfile（https://bizfileonline.sos.ca.gov/search/business）；个体户看市/县营业执照或虚构商号（DBA）登记\n责任保险单（COI）：保额、有效期、被保人名称\n范围限日常养护：割草、除草、修灌木、15 英尺以下树的顺带修剪\n种植草皮/植物、装灌溉、景观灯、排水都要 C-27，不在此工种\n代客打药除虫要县农业专员的园丁除虫营业执照（Maintenance Gardener）', true, false, false, 'leaf', 340, true, 'CSLB 官方《园丁还是景观承包商》：日常养护一般不需州执照；“植物和草皮”“灌溉”列在需执照项目里。'),
  ('interior', '室内设计', 'design', 'C', '无州执照（改交营业登记和责任保险）', '无强制执照；CCIDC“Certified Interior Designer”为自愿认证', 'https://bizfileonline.sos.ca.gov/search/business', E'营业登记：公司/LLC 查加州州务卿 bizfile（https://bizfileonline.sos.ca.gov/search/business）；个体户看市/县营业执照或虚构商号（DBA）登记\n责任保险单（COI）：保额、有效期、被保人名称\n自称“Certified Interior Designer”或“CID”的，要有 CCIDC 认证（https://www.ccidc.org/）\n包施工的要另有 CSLB 牌照', true, false, false, 'sofa', 350, true, 'B&P 5800 起：自愿认证，只保护“认证室内设计师”这个称呼，不认证也能做室内设计。'),
  ('inspection', '房屋检查', 'design', 'C', '无州执照（改交营业登记和责任保险）', '无州执照（B&P 7195–7199 只规定行为准则）', 'https://bizfileonline.sos.ca.gov/search/business', E'营业登记：公司/LLC 查加州州务卿 bizfile（https://bizfileonline.sos.ca.gov/search/business）；个体户看市/县营业执照或虚构商号（DBA）登记\n责任保险单（COI）：保额、有效期、被保人名称\n报告必须书面\n验房员不能对自己验过的房子揽修理活（B&P 7197）', true, false, false, 'search-house', 360, true, 'B&P 7195 定义了房屋检查和检查员，但州里没有发执照；2019 年 AB 1024 曾提议由 CSLB 发照，未成为法律（据第三方资料，未在立法网站直接核到）。行业常见自愿认证 ASHI、InterNACHI、CREIA。'),
  ('photo', '房产摄影', 'property', 'C', '无州执照（改交营业登记和责任保险）', '无', 'https://bizfileonline.sos.ca.gov/search/business', E'营业登记：公司/LLC 查加州州务卿 bizfile（https://bizfileonline.sos.ca.gov/search/business）；个体户看市/县营业执照或虚构商号（DBA）登记\n责任保险单（COI）：保额、有效期、被保人名称\n用无人机航拍的要有联邦 FAA Part 107 遥控驾驶员证', true, false, false, 'camera', 370, true, '州无执照；无人机商业飞行属联邦管。'),
  ('staging', '软装布置', 'property', 'C', '无州执照（改交营业登记和责任保险）', '无', 'https://bizfileonline.sos.ca.gov/search/business', E'营业登记：公司/LLC 查加州州务卿 bizfile（https://bizfileonline.sos.ca.gov/search/business）；个体户看市/县营业执照或虚构商号（DBA）登记\n责任保险单（COI）：保额、有效期、被保人名称\n只摆放家具软装；装灯、挂重物上墙改线路的另需对口牌照', true, false, false, 'lamp', 380, true, '州无执照。'),
  ('permit', '报批许可协调', 'design', 'C', '无州执照（改交营业登记和责任保险）', '无州执照；部分城市要登记', 'https://bizfileonline.sos.ca.gov/search/business', E'营业登记：公司/LLC 查加州州务卿 bizfile（https://bizfileonline.sos.ca.gov/search/business）；个体户看市/县营业执照或虚构商号（DBA）登记\n责任保险单（COI）：保额、有效期、被保人名称\n旧金山：收费跑建筑/规划许可的“permit consultant”必须在市道德委员会登记并按季申报\n洛杉矶等其他城市：按当地游说/许可代理规则核', true, false, false, 'stamp', 390, true, '旧金山规定见 sfethics.org/guidance/permit-consultants。其他城市未逐一核实。'),
  ('pm_owner_rep', '工程管理与业主代表', 'design', 'C', '无州执照（改交营业登记和责任保险）', '有条件：纯咨询无州执照；但替业主组织投标、安排施工队排期并监督的，法律视为“承包商”，须 CSLB 牌照', 'https://bizfileonline.sos.ca.gov/search/business', E'营业登记：公司/LLC 查加州州务卿 bizfile（https://bizfileonline.sos.ca.gov/search/business）；个体户看市/县营业执照或虚构商号（DBA）登记\n责任保险单（COI）：保额、有效期、被保人名称\n只接受“纯顾问”：不代业主招标/比价、不安排工人排期、不在现场指挥\n做了上面任一项的，按 A 类要 CSLB B 牌照', false, false, false, 'clipboard-list', 400, false, 'B&P 7026.1(a)(2)：住宅改造项目中，非业主的“顾问”若提供或监督投标、或安排承包商/分包排期并监督项目，就算承包商，须持牌。边界模糊，法律界有争议。'),
  ('supply', '建材与设备供应', 'build', 'C', '无州执照（改交营业登记和责任保险）', '无（只卖不装）', 'https://bizfileonline.sos.ca.gov/search/business', E'营业登记：公司/LLC 查加州州务卿 bizfile（https://bizfileonline.sos.ca.gov/search/business）；个体户看市/县营业执照或虚构商号（DBA）登记\n责任保险单（COI）：保额、有效期、被保人名称\n只供货送货；负责安装的要对口 CSLB 牌照', true, false, false, 'boxes', 410, true, 'B&P 7045：只提供材料、不加工安装的不算承包商（CSLB 官方 B 类说明里引用）。')
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name, group_key = EXCLUDED.group_key, lic_type = EXCLUDED.lic_type, issuer = EXCLUDED.issuer,
  license_class = EXCLUDED.license_class, lookup_url = EXCLUDED.lookup_url, verify_points = EXCLUDED.verify_points,
  open = EXCLUDED.open, no_post = EXCLUDED.no_post, no_notify = EXCLUDED.no_notify, icon = EXCLUDED.icon, sort = EXCLUDED.sort,
  verified = EXCLUDED.verified, note = EXCLUDED.note
WHERE jobs_trades.updated_by IS NULL;

-- ── 14. 种子：首页 7 个入口（装修 → 维修与装修这一组；设计 → 设计与专业服务这一组；屋顶 → 屋顶防水）──
INSERT INTO jobs_home_entries (slot, label, icon, target_type, target_key, sort) VALUES
  (1, '水管',     'faucet',    'trade', 'plumbing',   1),
  (2, '电工',     'bolt',      'trade', 'electrical', 2),
  (3, '空调暖气', 'snowflake', 'trade', 'hvac',       3),
  (4, '房屋维修', 'wrench',    'trade', 'handyman',   4),
  (5, '装修',     'hammer',    'group', 'repair',     5),
  (6, '屋顶',     'roof',      'trade', 'roofing',    6),
  (7, '设计',     'compass',   'group', 'design',     7)
ON CONFLICT (slot) DO NOTHING;

-- ── 15. 城市（后台可增删改、排序，不用发版；发活儿、登记接活、所有城市筛选都用这一张表）──────────
-- 记录里存稳定的 key（jobs_pros.cities、jobs_posts.city_key），改名不影响历史。用过的城市“删除”= 停用（enabled=false）。
CREATE TABLE IF NOT EXISTS jobs_cities (
  key          text PRIMARY KEY,
  name         text NOT NULL,
  region       text NOT NULL,                        -- 地区分组（洛杉矶 / 橙县 / 旧金山湾区 / 加州其他 …）
  region_sort  integer NOT NULL DEFAULT 0,           -- 地区的顺序
  sort         integer NOT NULL DEFAULT 0,           -- 地区内的顺序
  enabled      boolean NOT NULL DEFAULT true,
  updated_by   text,                                 -- 后台改过就记人；种子刷新不覆盖后台改过的行
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS jobs_cities_name_uq ON jobs_cities (name);
CREATE INDEX IF NOT EXISTS jobs_cities_order_idx ON jobs_cities (region_sort, sort);
INSERT INTO jobs_cities (key, name, region, region_sort, sort) VALUES
  ('los_angeles',      '洛杉矶',       '洛杉矶',     10, 10),
  ('arcadia',          '阿凯迪亚',     '洛杉矶',     10, 20),
  ('san_gabriel',      '圣盖博',       '洛杉矶',     10, 30),
  ('alhambra',         '阿罕布拉',     '洛杉矶',     10, 40),
  ('temple_city',      '天普市',       '洛杉矶',     10, 50),
  ('monterey_park',    '蒙特利公园',   '洛杉矶',     10, 60),
  ('san_marino',       '圣马力诺',     '洛杉矶',     10, 70),
  ('pasadena',         '帕萨迪纳',     '洛杉矶',     10, 80),
  ('walnut',           '核桃市',       '洛杉矶',     10, 90),
  ('diamond_bar',      '钻石吧',       '洛杉矶',     10, 100),
  ('rowland_heights',  '罗兰岗',       '洛杉矶',     10, 110),
  ('hacienda_heights', '哈岗',         '洛杉矶',     10, 120),
  ('chino_hills',      '奇诺岗',       '洛杉矶',     10, 130),
  ('torrance',         '托伦斯',       '洛杉矶',     10, 140),
  ('la_other',         '洛杉矶其他',   '洛杉矶',     10, 150),
  ('irvine',           '尔湾',         '橙县',       20, 10),
  ('oc_other',         '橙县其他',     '橙县',       20, 20),
  ('san_francisco',    '旧金山',       '旧金山湾区', 30, 10),
  ('san_jose',         '圣荷西',       '旧金山湾区', 30, 20),
  ('cupertino',        '库比蒂诺',     '旧金山湾区', 30, 30),
  ('fremont',          '弗里蒙特',     '旧金山湾区', 30, 40),
  ('oakland',          '奥克兰',       '旧金山湾区', 30, 50),
  ('bay_other',        '湾区其他',     '旧金山湾区', 30, 60),
  ('san_diego',        '圣地亚哥',     '加州其他',   40, 10),
  ('riverside',        '河滨县',       '加州其他',   40, 20),
  ('san_bernardino',   '圣贝纳迪诺县', '加州其他',   40, 30),
  ('ca_other',         '加州其他',     '加州其他',   40, 40)
ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, region = EXCLUDED.region, region_sort = EXCLUDED.region_sort, sort = EXCLUDED.sort
WHERE jobs_cities.updated_by IS NULL;

-- 活儿存城市 key（city 列留发布时的城市名，标题用）；以前按名字存的数据换成 key（重复跑无害）
ALTER TABLE jobs_posts ADD COLUMN IF NOT EXISTS city_key text;
UPDATE jobs_posts p SET city_key = c.key FROM jobs_cities c WHERE p.city_key IS NULL AND c.name = p.city;
CREATE INDEX IF NOT EXISTS jobs_posts_city_key_idx ON jobs_posts (city_key, status);
UPDATE jobs_pros p SET cities = ARRAY(SELECT coalesce(c.key, x) FROM unnest(p.cities) WITH ORDINALITY AS u(x, i) LEFT JOIN jobs_cities c ON c.name = u.x ORDER BY u.i)
 WHERE EXISTS (SELECT 1 FROM unnest(p.cities) x JOIN jobs_cities c ON c.name = x);

-- D10：活儿的「情况说明」发布时过微信内容安全（msgSecCheck）。
-- sec_status：pass 通过 / review 需人工复核 / risky 不通过 / unchecked 未检测（没配微信密钥、发布人没有小程序 openid、接口出错）。
-- 只有 pass 的才进小程序「通知给我的活儿」（GET /jobs/me/matched）。sec_note 记未检测的原因（no_wx_config / no_openid / error）。
ALTER TABLE jobs_posts ADD COLUMN IF NOT EXISTS sec_note text;
ALTER TABLE jobs_posts ADD COLUMN IF NOT EXISTS sec_checked_at timestamptz;
UPDATE jobs_posts SET sec_status = 'unchecked', sec_note = coalesce(sec_note, 'before_check') WHERE sec_status IS NULL;
CREATE INDEX IF NOT EXISTS jobs_posts_matched_idx ON jobs_posts (trade_key, city_key) WHERE status = 'open' AND sec_status = 'pass';

-- 指令 7 · D17：联系接活人不用登录、不用验证手机（小程序、网站游客都能点）。
-- 每次点「联系」记一行：登录的记档案，没登录的记 IP 哈希（加盐，不存原始 IP）；用于统计和防刷（频率限制）。
-- limited = 这次被频率限制挡住了（不给电话）；算频率时不计这些行。
CREATE TABLE IF NOT EXISTS jobs_pro_clicks (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id             uuid NOT NULL REFERENCES jobs_pros(id) ON DELETE CASCADE,
  viewer_contact_id  uuid REFERENCES contacts(id) ON DELETE SET NULL,
  ip_hash            text,
  client             text,                                -- mp / web
  limited            boolean NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jobs_pro_clicks_viewer_idx ON jobs_pro_clicks (viewer_contact_id, created_at DESC) WHERE viewer_contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS jobs_pro_clicks_ip_idx ON jobs_pro_clicks (ip_hash, created_at DESC) WHERE ip_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS jobs_pro_clicks_pro_idx ON jobs_pro_clicks (pro_id, created_at DESC);
