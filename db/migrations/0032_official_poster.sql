-- 0032：每场活动一张「官方海报」+ 上传自己的图 + AI 生成标识（东哥 11/11，1.3.3）
-- 只加列，可重复执行，不改已有数据。
-- event_posters.official：设为官方海报时的快照 { genId, style, texts, lift, ai, setAt, setBy }（日期地点仍随活动信息自动更新）
-- event_posters.cover_pos：活动封面从主视觉里取横带的位置（0 = 最上，1 = 最下；空 = 自动）
-- event_posters.prev_cover_url：设官方海报前的封面（取消官方海报时还原）
-- poster_gens.ai_generated：是不是 AI 画的（系统生成的都是；后台上传的按勾选，默认是）
ALTER TABLE event_posters ADD COLUMN IF NOT EXISTS official jsonb;
ALTER TABLE event_posters ADD COLUMN IF NOT EXISTS cover_pos real;
ALTER TABLE event_posters ADD COLUMN IF NOT EXISTS prev_cover_url text;
ALTER TABLE poster_gens ADD COLUMN IF NOT EXISTS ai_generated boolean NOT NULL DEFAULT true;
