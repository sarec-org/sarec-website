-- 0012：SAREC 1.3 M —— 活动筹备清单（只在网站后台）+ 私企面对面收费流程
-- ------------------------------------------------------------------
-- 只追加，不改动已有数据。可重复执行。
-- 模板按活动类型建；生成清单时把模板拷一份进这场活动（改模板不影响已生成的清单）。
-- 截止时间：anchor = 'start'（相对开始）/ 'end'（相对结束），offset_minutes 可正可负。

CREATE TABLE IF NOT EXISTS prep_templates (
  id            bigserial PRIMARY KEY,
  key           text UNIQUE NOT NULL,          -- lecture / face / 自定义
  name          text NOT NULL,
  roles         jsonb NOT NULL DEFAULT '[]',   -- ["总负责 / 主持", …]
  shooting_list text,                          -- 摄影摄像拍摄清单（印给摄影人）
  settings      jsonb NOT NULL DEFAULT '{}',   -- 私企面对面：{ "pitchMinutes": 3, "collectIntro": true }
  sort_order    int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prep_template_items (
  id             bigserial PRIMARY KEY,
  template_id    bigint NOT NULL REFERENCES prep_templates(id) ON DELETE CASCADE,
  sort_order     int NOT NULL DEFAULT 0,
  anchor         text NOT NULL DEFAULT 'start' CHECK (anchor IN ('start', 'end')),
  offset_minutes int NOT NULL DEFAULT 0,
  when_label     text NOT NULL,                -- “14 天”“当天 −1 小时”“会后当晚”
  title          text NOT NULL,
  role           text NOT NULL                 -- 多个负责角色用“、”分开（每人都会收到提醒）
);
CREATE INDEX IF NOT EXISTS prep_template_items_tpl_idx ON prep_template_items (template_id, sort_order);

-- 每场活动的清单
CREATE TABLE IF NOT EXISTS event_prep (
  event_id      uuid PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
  template_id   bigint REFERENCES prep_templates(id) ON DELETE SET NULL,
  template_key  text,
  roles         jsonb NOT NULL DEFAULT '[]',
  assignees     jsonb NOT NULL DEFAULT '{}',   -- { "签到接待": { "name": "...", "contact": "email 或手机" } }
  shooting_list text,
  settings      jsonb NOT NULL DEFAULT '{}',
  retro         text,                          -- 复盘：缺了什么、多余什么
  retro_applied_at timestamptz,
  summary_sent_at  timestamptz,                -- 活动前 2 天给东哥的未完成汇总
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS event_prep_items (
  id           bigserial PRIMARY KEY,
  event_id     uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  sort_order   int NOT NULL DEFAULT 0,
  when_label   text NOT NULL,
  title        text NOT NULL,
  role         text NOT NULL,
  due_at       timestamptz NOT NULL,
  done_at      timestamptz,
  done_by      text,
  note         text,
  photo_url    text,
  reminded_at  timestamptz,
  from_template_item bigint,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS event_prep_items_event_idx ON event_prep_items (event_id, sort_order);
CREATE INDEX IF NOT EXISTS event_prep_items_due_idx ON event_prep_items (due_at) WHERE done_at IS NULL;

-- 私企面对面收费：报名后发付款链接、活动前 5 天未付提醒（各一次）
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS pay_link_sent_at timestamptz;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS pay_reminded_at timestamptz;
-- 电子名册（会后自动生成）：本场到场的人，本人同意公开的联系方式
CREATE TABLE IF NOT EXISTS event_rosters (
  event_id     uuid PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
  token        text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(12), 'hex'),
  entries      jsonb NOT NULL DEFAULT '[]',
  sent_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── 内置两个模板（已存在就不动，保留东哥的修改）──
INSERT INTO prep_templates (key, name, roles, shooting_list, settings, sort_order) VALUES
('lecture', '讲座（60–100 人）',
 '["总负责 / 主持", "签到接待", "摄影摄像", "直播", "物料茶歇", "会后运营"]',
 E'摄影摄像拍摄清单（印给摄影人）\n- 从前往后拍，人要正面：讲师正面中景、特写各不少于 20 张；观众正面（站在讲台侧前方拍）。\n- 每位来宾在背景屏前的单人照或双人照，签到时顺手拍。\n- 提问互动、交换名片的瞬间。\n- 赞助方易拉宝和人同框至少 3 张。\n- 结束前的全体大合影，拍 5 张以上挑最好的。\n- 讲师 2–3 段短视频（每段 30 秒左右），给视频号用。\n- 拍完当场挑 10 张传相册，别等第二天。',
 '{}', 1),
('face', '私企面对面（约 20 人）',
 '["总负责 / 主持", "签到接待", "摄影摄像", "物料茶歇", "会后运营"]',
 E'摄影摄像拍摄清单（印给摄影人）\n- 每人介绍时拍一张正面照（名册要用）。\n- 交换名片、交流的瞬间。\n- 结束前的大合影，拍 5 张以上挑最好的。\n- 拍完当场挑 10 张传相册。',
 '{"pitchMinutes": 3, "collectIntro": true}', 2)
ON CONFLICT (key) DO NOTHING;

-- 模板项只在模板刚建、还没有任何项时写入
INSERT INTO prep_template_items (template_id, sort_order, anchor, offset_minutes, when_label, title, role)
SELECT t.id, v.sort_order, v.anchor, v.offset_minutes, v.when_label, v.title, v.role
  FROM prep_templates t
  JOIN (VALUES
    (1, 'start', -20160, '14 天', '定主题、讲师、场地；后台建活动、生成报名海报', '总负责 / 主持'),
    (2, 'start', -20160, '14 天', '确认赞助方，收赞助方 logo 和易拉宝设计稿', '总负责 / 主持'),
    (3, 'start', -14400, '10 天', '背景屏（印商会标、活动名、日期，留赞助方位置）设计定稿并下单', '物料茶歇'),
    (4, 'start', -10080, '7 天', '服务号推送、群发报名海报、视频号直播预约', '会后运营'),
    (5, 'start', -10080, '7 天', '确认摄影摄像人员；发给他“拍摄清单”', '摄影摄像'),
    (6, 'start', -4320, '3 天', '设备检查：相机或手机 + 稳定器、备用电池、收音麦、投影、翻页笔、延长线、现场 Wi-Fi、直播手机支架', '摄影摄像、直播'),
    (7, 'start', -4320, '3 天', '下载打印：A4 签到码（门口 2 张、签到台 1 张）、备用名单', '签到接待'),
    (8, 'start', -2880, '2 天', '茶歇、水、名牌贴、笔', '物料茶歇'),
    (9, 'start', -1440, '1 天', '确认提醒已自动发出；讲师过 PPT', '总负责 / 主持'),
    (10, 'start', -60, '当天 −1 小时', '背景屏立在签到处旁、两侧放赞助方易拉宝；签到码贴门口；测试投影和收音', '物料茶歇、签到接待'),
    (11, 'start', 0, '当天', '签到台引导大家在背景屏前拍照', '签到接待'),
    (12, 'start', 0, '当天', '按拍摄清单拍；直播开播', '摄影摄像、直播'),
    (13, 'end', -5, '结束前 5 分钟', '全体大合影（在背景屏前或讲台前）', '总负责 / 主持、摄影摄像'),
    (14, 'end', 120, '会后 2 小时内', '上传精选照片到活动相册（客户自己也能传）', '摄影摄像、会后运营'),
    (15, 'end', 360, '会后当晚', '在后台审核自动生成的回顾、分享文案并发布', '会后运营'),
    (16, 'end', 1440, '会后 1 天', '处理跟进任务；填复盘', '会后运营、总负责 / 主持')
  ) AS v(sort_order, anchor, offset_minutes, when_label, title, role) ON true
 WHERE t.key = 'lecture' AND NOT EXISTS (SELECT 1 FROM prep_template_items x WHERE x.template_id = t.id);

INSERT INTO prep_template_items (template_id, sort_order, anchor, offset_minutes, when_label, title, role)
SELECT t.id, v.sort_order, v.anchor, v.offset_minutes, v.when_label, v.title, v.role
  FROM prep_templates t
  JOIN (VALUES
    (1, 'start', -20160, '14 天', '后台建活动：收费活动、名额 20、设置收费方式', '总负责 / 主持'),
    (2, 'start', -14400, '10 天', '群发报名海报；报名时每人填“一句话介绍我和我的业务”、上传名片或填电子名片', '会后运营'),
    (3, 'start', -7200, '5 天', '核对缴费；未缴费的自动发缴费提醒', '会后运营'),
    (4, 'start', -4320, '3 天', '排介绍顺序，每人限时（默认 3 分钟，后台可改）；打印桌牌和名单', '总负责 / 主持'),
    (5, 'start', -2880, '2 天', '背景屏、易拉宝、计时器、茶歇', '物料茶歇'),
    (6, 'start', -60, '当天 −1 小时', '圆桌或 U 形摆位，桌牌就位；背景屏立好；签到码贴好；现场 Zelle 收款码备好', '物料茶歇、签到接待'),
    (7, 'start', 0, '当天', '签到并核对缴费，没缴的现场扫码付', '签到接待'),
    (8, 'start', 0, '当天', '主持控时；每人介绍时拍正面照', '总负责 / 主持、摄影摄像'),
    (9, 'end', -10, '结束前', '大合影', '摄影摄像'),
    (10, 'end', 240, '会后当天', '确认“本场电子名册”已自动生成并发给参与者', '会后运营'),
    (11, 'end', 1440, '会后 1 天', '跟进有合作意向的人；填复盘', '会后运营、总负责 / 主持')
  ) AS v(sort_order, anchor, offset_minutes, when_label, title, role) ON true
 WHERE t.key = 'face' AND NOT EXISTS (SELECT 1 FROM prep_template_items x WHERE x.template_id = t.id);
