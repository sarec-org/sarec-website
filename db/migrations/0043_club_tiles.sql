-- 1.5.0 体验1：小程序首页「专委会与俱乐部」方块要用的图标和封面（后台「俱乐部」页里设，名字、排序照旧用 name / sort_order）
-- 幂等（IF NOT EXISTS），可重复跑；依赖 0037（clubs 表）。
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS icon text;       -- 方块上的小图标：一个表情或 1–2 个字（例 🃏、掼）；空 = 小程序用名字第一个字
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS cover_url text;  -- 方块 / 详情页封面图（后台上传）；空 = 不显示封面
