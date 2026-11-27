-- 0054：1.7.0 节日祝福（服务器这一半）。
-- 「节日祝福」和「出海报」共用海报模板库，加一个"用途"标记区分：
-- - poster_templates.purpose / poster_categories.purpose：'event' 办活动（原来的全部数据，默认值）/ 'greeting' 节日祝福。
--   现有的「办活动」模板清单（GET /api/v1/poster-templates）只给 purpose = 'event'，行为不变。
-- - poster_templates.sig_box：祝福图的落款位 [x0,y0,x1,y1]（0–1 归一化）；NULL = 出图时用默认底部 [0.06,0.84,0.94,0.95] 并垫半透明底板。
-- - poster_categories.festival_date：祝福分类的节日日期（旧做法，留着当后备）。指令 83 起祝福分类的日期从下面的节日表算，
--   只有没挂到节日表上的祝福分类才用这一列。
-- 指令 83「智能海报排序」：节日表 festivals ＋ 每年的日期 festival_dates（2025–2035，后台「节日日期表」能改能加）。
-- - festivals.show_before_days：节日前几天开始在「挑海报」最上面出祝福；show_until_offset：节日当天之后再显示几天（春节 6 = 到初七）。
-- - category_key：对应的办活动模板分类（「快到的节日」那一段）；greet_category_key：对应的祝福分类（没有 = NULL）。
-- - 日期由 db/sql/festival_dates_gen.mjs 算出（农历用 lunarInfo 表、冬至用节气通式、美国节日按星期），已和已知日期逐个核对。
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

-- ── 指令 83：节日日期表 ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS festivals (
  key text PRIMARY KEY,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('cn', 'us', 'intl')),
  show_before_days int NOT NULL DEFAULT 2 CHECK (show_before_days BETWEEN 0 AND 60),
  show_until_offset int NOT NULL DEFAULT 0 CHECK (show_until_offset BETWEEN 0 AND 60),
  category_key text,
  greet_category_key text,
  sort int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS festival_dates (
  festival_key text NOT NULL REFERENCES festivals(key) ON DELETE CASCADE,
  date date NOT NULL,
  PRIMARY KEY (festival_key, date)
);

INSERT INTO festivals (key, name, kind, show_before_days, show_until_offset, category_key, greet_category_key, sort) VALUES
  ('new_year', '元旦', 'intl', 2, 0, 'new_year', 'greet_newyear', 1),
  ('spring_festival', '春节', 'cn', 2, 6, 'spring_festival', 'greet_springfest', 2),
  ('lantern_festival', '元宵节', 'cn', 2, 0, 'lantern_festival', 'greet_lantern', 3),
  ('valentines', '情人节', 'intl', 2, 0, 'valentines', NULL, 4),
  ('womens_day', '三八妇女节', 'intl', 2, 0, 'womens_day', NULL, 5),
  ('st_patricks', '圣帕特里克节', 'us', 2, 0, 'st_patricks', NULL, 6),
  ('easter', '复活节', 'us', 2, 0, 'easter', NULL, 7),
  ('mothers_day', '母亲节', 'us', 2, 0, 'mothers_day', NULL, 8),
  ('memorial_day', '阵亡将士纪念日', 'us', 2, 0, 'memorial_day', NULL, 9),
  ('childrens_day', '儿童节', 'intl', 2, 0, 'childrens_day', NULL, 10),
  ('dragon_boat', '端午节', 'cn', 2, 0, 'dragon_boat', NULL, 11),
  ('fathers_day', '父亲节', 'us', 2, 0, 'fathers_day', NULL, 12),
  ('july4', '美国独立日', 'us', 2, 0, 'july4', NULL, 13),
  ('qixi', '七夕', 'cn', 2, 0, 'qixi', NULL, 14),
  ('labor_day', '美国劳动节', 'us', 2, 0, 'labor_day', NULL, 15),
  ('mid_autumn', '中秋节', 'cn', 2, 0, 'mid_autumn', NULL, 16),
  ('double_ninth', '重阳节', 'cn', 2, 0, 'double_ninth', NULL, 17),
  ('halloween', '万圣节', 'us', 2, 0, 'halloween', NULL, 18),
  ('veterans_day', '退伍军人节', 'us', 2, 0, 'veterans_day', NULL, 19),
  ('thanksgiving', '感恩节', 'us', 2, 0, 'thanksgiving', 'greet_thanksgiving', 20),
  ('winter_solstice', '冬至', 'cn', 2, 0, 'winter_solstice', NULL, 21),
  ('christmas', '圣诞节', 'intl', 2, 0, 'christmas', 'greet_christmas', 22)
ON CONFLICT (key) DO NOTHING;

INSERT INTO festival_dates (festival_key, date) VALUES
  ('new_year', '2025-01-01'), ('new_year', '2026-01-01'), ('new_year', '2027-01-01'), ('new_year', '2028-01-01'), ('new_year', '2029-01-01'), ('new_year', '2030-01-01'), ('new_year', '2031-01-01'), ('new_year', '2032-01-01'), ('new_year', '2033-01-01'), ('new_year', '2034-01-01'), ('new_year', '2035-01-01'),
  ('spring_festival', '2025-01-29'), ('spring_festival', '2026-02-17'), ('spring_festival', '2027-02-06'), ('spring_festival', '2028-01-26'), ('spring_festival', '2029-02-13'), ('spring_festival', '2030-02-03'), ('spring_festival', '2031-01-23'), ('spring_festival', '2032-02-11'), ('spring_festival', '2033-01-31'), ('spring_festival', '2034-02-19'), ('spring_festival', '2035-02-08'),
  ('lantern_festival', '2025-02-12'), ('lantern_festival', '2026-03-03'), ('lantern_festival', '2027-02-20'), ('lantern_festival', '2028-02-09'), ('lantern_festival', '2029-02-27'), ('lantern_festival', '2030-02-17'), ('lantern_festival', '2031-02-06'), ('lantern_festival', '2032-02-25'), ('lantern_festival', '2033-02-14'), ('lantern_festival', '2034-03-05'), ('lantern_festival', '2035-02-22'),
  ('valentines', '2025-02-14'), ('valentines', '2026-02-14'), ('valentines', '2027-02-14'), ('valentines', '2028-02-14'), ('valentines', '2029-02-14'), ('valentines', '2030-02-14'), ('valentines', '2031-02-14'), ('valentines', '2032-02-14'), ('valentines', '2033-02-14'), ('valentines', '2034-02-14'), ('valentines', '2035-02-14'),
  ('womens_day', '2025-03-08'), ('womens_day', '2026-03-08'), ('womens_day', '2027-03-08'), ('womens_day', '2028-03-08'), ('womens_day', '2029-03-08'), ('womens_day', '2030-03-08'), ('womens_day', '2031-03-08'), ('womens_day', '2032-03-08'), ('womens_day', '2033-03-08'), ('womens_day', '2034-03-08'), ('womens_day', '2035-03-08'),
  ('st_patricks', '2025-03-17'), ('st_patricks', '2026-03-17'), ('st_patricks', '2027-03-17'), ('st_patricks', '2028-03-17'), ('st_patricks', '2029-03-17'), ('st_patricks', '2030-03-17'), ('st_patricks', '2031-03-17'), ('st_patricks', '2032-03-17'), ('st_patricks', '2033-03-17'), ('st_patricks', '2034-03-17'), ('st_patricks', '2035-03-17'),
  ('easter', '2025-04-20'), ('easter', '2026-04-05'), ('easter', '2027-03-28'), ('easter', '2028-04-16'), ('easter', '2029-04-01'), ('easter', '2030-04-21'), ('easter', '2031-04-13'), ('easter', '2032-03-28'), ('easter', '2033-04-17'), ('easter', '2034-04-09'), ('easter', '2035-03-25'),
  ('mothers_day', '2025-05-11'), ('mothers_day', '2026-05-10'), ('mothers_day', '2027-05-09'), ('mothers_day', '2028-05-14'), ('mothers_day', '2029-05-13'), ('mothers_day', '2030-05-12'), ('mothers_day', '2031-05-11'), ('mothers_day', '2032-05-09'), ('mothers_day', '2033-05-08'), ('mothers_day', '2034-05-14'), ('mothers_day', '2035-05-13'),
  ('memorial_day', '2025-05-26'), ('memorial_day', '2026-05-25'), ('memorial_day', '2027-05-31'), ('memorial_day', '2028-05-29'), ('memorial_day', '2029-05-28'), ('memorial_day', '2030-05-27'), ('memorial_day', '2031-05-26'), ('memorial_day', '2032-05-31'), ('memorial_day', '2033-05-30'), ('memorial_day', '2034-05-29'), ('memorial_day', '2035-05-28'),
  ('childrens_day', '2025-06-01'), ('childrens_day', '2026-06-01'), ('childrens_day', '2027-06-01'), ('childrens_day', '2028-06-01'), ('childrens_day', '2029-06-01'), ('childrens_day', '2030-06-01'), ('childrens_day', '2031-06-01'), ('childrens_day', '2032-06-01'), ('childrens_day', '2033-06-01'), ('childrens_day', '2034-06-01'), ('childrens_day', '2035-06-01'),
  ('dragon_boat', '2025-05-31'), ('dragon_boat', '2026-06-19'), ('dragon_boat', '2027-06-09'), ('dragon_boat', '2028-05-28'), ('dragon_boat', '2029-06-16'), ('dragon_boat', '2030-06-05'), ('dragon_boat', '2031-06-24'), ('dragon_boat', '2032-06-12'), ('dragon_boat', '2033-06-01'), ('dragon_boat', '2034-06-20'), ('dragon_boat', '2035-06-10'),
  ('fathers_day', '2025-06-15'), ('fathers_day', '2026-06-21'), ('fathers_day', '2027-06-20'), ('fathers_day', '2028-06-18'), ('fathers_day', '2029-06-17'), ('fathers_day', '2030-06-16'), ('fathers_day', '2031-06-15'), ('fathers_day', '2032-06-20'), ('fathers_day', '2033-06-19'), ('fathers_day', '2034-06-18'), ('fathers_day', '2035-06-17'),
  ('july4', '2025-07-04'), ('july4', '2026-07-04'), ('july4', '2027-07-04'), ('july4', '2028-07-04'), ('july4', '2029-07-04'), ('july4', '2030-07-04'), ('july4', '2031-07-04'), ('july4', '2032-07-04'), ('july4', '2033-07-04'), ('july4', '2034-07-04'), ('july4', '2035-07-04'),
  ('qixi', '2025-08-29'), ('qixi', '2026-08-19'), ('qixi', '2027-08-08'), ('qixi', '2028-08-26'), ('qixi', '2029-08-16'), ('qixi', '2030-08-05'), ('qixi', '2031-08-24'), ('qixi', '2032-08-12'), ('qixi', '2033-08-01'), ('qixi', '2034-08-20'), ('qixi', '2035-08-10'),
  ('labor_day', '2025-09-01'), ('labor_day', '2026-09-07'), ('labor_day', '2027-09-06'), ('labor_day', '2028-09-04'), ('labor_day', '2029-09-03'), ('labor_day', '2030-09-02'), ('labor_day', '2031-09-01'), ('labor_day', '2032-09-06'), ('labor_day', '2033-09-05'), ('labor_day', '2034-09-04'), ('labor_day', '2035-09-03'),
  ('mid_autumn', '2025-10-06'), ('mid_autumn', '2026-09-25'), ('mid_autumn', '2027-09-15'), ('mid_autumn', '2028-10-03'), ('mid_autumn', '2029-09-22'), ('mid_autumn', '2030-09-12'), ('mid_autumn', '2031-10-01'), ('mid_autumn', '2032-09-19'), ('mid_autumn', '2033-09-08'), ('mid_autumn', '2034-09-27'), ('mid_autumn', '2035-09-16'),
  ('double_ninth', '2025-10-29'), ('double_ninth', '2026-10-18'), ('double_ninth', '2027-10-08'), ('double_ninth', '2028-10-26'), ('double_ninth', '2029-10-16'), ('double_ninth', '2030-10-05'), ('double_ninth', '2031-10-24'), ('double_ninth', '2032-10-12'), ('double_ninth', '2033-10-01'), ('double_ninth', '2034-10-20'), ('double_ninth', '2035-10-09'),
  ('halloween', '2025-10-31'), ('halloween', '2026-10-31'), ('halloween', '2027-10-31'), ('halloween', '2028-10-31'), ('halloween', '2029-10-31'), ('halloween', '2030-10-31'), ('halloween', '2031-10-31'), ('halloween', '2032-10-31'), ('halloween', '2033-10-31'), ('halloween', '2034-10-31'), ('halloween', '2035-10-31'),
  ('veterans_day', '2025-11-11'), ('veterans_day', '2026-11-11'), ('veterans_day', '2027-11-11'), ('veterans_day', '2028-11-11'), ('veterans_day', '2029-11-11'), ('veterans_day', '2030-11-11'), ('veterans_day', '2031-11-11'), ('veterans_day', '2032-11-11'), ('veterans_day', '2033-11-11'), ('veterans_day', '2034-11-11'), ('veterans_day', '2035-11-11'),
  ('thanksgiving', '2025-11-27'), ('thanksgiving', '2026-11-26'), ('thanksgiving', '2027-11-25'), ('thanksgiving', '2028-11-23'), ('thanksgiving', '2029-11-22'), ('thanksgiving', '2030-11-28'), ('thanksgiving', '2031-11-27'), ('thanksgiving', '2032-11-25'), ('thanksgiving', '2033-11-24'), ('thanksgiving', '2034-11-23'), ('thanksgiving', '2035-11-22'),
  ('winter_solstice', '2025-12-21'), ('winter_solstice', '2026-12-22'), ('winter_solstice', '2027-12-22'), ('winter_solstice', '2028-12-21'), ('winter_solstice', '2029-12-21'), ('winter_solstice', '2030-12-22'), ('winter_solstice', '2031-12-22'), ('winter_solstice', '2032-12-21'), ('winter_solstice', '2033-12-21'), ('winter_solstice', '2034-12-22'), ('winter_solstice', '2035-12-22'),
  ('christmas', '2025-12-25'), ('christmas', '2026-12-25'), ('christmas', '2027-12-25'), ('christmas', '2028-12-25'), ('christmas', '2029-12-25'), ('christmas', '2030-12-25'), ('christmas', '2031-12-25'), ('christmas', '2032-12-25'), ('christmas', '2033-12-25'), ('christmas', '2034-12-25'), ('christmas', '2035-12-25')
ON CONFLICT DO NOTHING;

-- ── 指令 88：「AI生成」标识每张模板可配位置 ──────────────────────────
-- tr 右上 / tl 左上 / br 右下 / bl 左下 / strip 落款条、信息栏右端的底边；NULL = 用全局设置（crm_settings.ai_badge）。国标要求在边或角，所以只有这几种。
ALTER TABLE poster_templates ADD COLUMN IF NOT EXISTS badge_pos text CHECK (badge_pos IN ('tr', 'tl', 'br', 'bl', 'strip'));

-- ── 测试 V171-2：首页「节日祝福」栏目只在节日前后一段时间出现 ─────────────
-- 首页窗口 = [D − home_before_days, D + show_until_offset]；都不在窗口里首页整栏不出。后台「节日日期表」能改。
ALTER TABLE festivals ADD COLUMN IF NOT EXISTS home_before_days int NOT NULL DEFAULT 14 CHECK (home_before_days BETWEEN 0 AND 90);
