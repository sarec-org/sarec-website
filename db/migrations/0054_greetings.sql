-- 0054：1.7.0 节日祝福（服务器这一半）。
-- 「节日祝福」和「出海报」共用海报模板库，加一个"用途"标记区分：
-- - poster_templates.purpose / poster_categories.purpose：'event' 办活动（原来的全部数据，默认值）/ 'greeting' 节日祝福。
--   现有的「办活动」模板清单（GET /api/v1/poster-templates）只给 purpose = 'event'，行为不变。
-- - poster_templates.sig_box：祝福图的落款位 [x0,y0,x1,y1]（0–1 归一化）；NULL = 出图时用默认底部 [0.06,0.84,0.94,0.95] 并垫半透明底板。
-- - poster_categories.festival_date：祝福分类的节日日期，小程序里"离今天（洛杉矶时间）最近、还没过的节日"排最前。
--   一年一次的节日每年在后台「海报模板 › 祝福」里改日期。
-- 插 5 个祝福分类（已有就跳过）。只加列 / 插分类；可重复执行；老数据一行不动。

ALTER TABLE poster_templates ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'event' CHECK (purpose IN ('event', 'greeting'));
ALTER TABLE poster_templates ADD COLUMN IF NOT EXISTS sig_box jsonb;
ALTER TABLE poster_categories ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'event' CHECK (purpose IN ('event', 'greeting'));
ALTER TABLE poster_categories ADD COLUMN IF NOT EXISTS festival_date date;

INSERT INTO poster_categories (key, name, tier, sort, purpose, festival_date) VALUES
  ('greet_thanksgiving', '感恩节', 1, 1, 'greeting', '2026-11-26'),
  ('greet_christmas',    '圣诞节', 1, 2, 'greeting', '2026-12-25'),
  ('greet_newyear',      '元旦',   1, 3, 'greeting', '2027-01-01'),
  ('greet_springfest',   '春节',   1, 4, 'greeting', '2027-02-06'),
  ('greet_lantern',      '元宵节', 1, 5, 'greeting', '2027-02-20')
ON CONFLICT (key) DO NOTHING;
