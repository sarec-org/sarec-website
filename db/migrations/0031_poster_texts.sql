-- 0031：AI 海报每一处文字都能在后台（手机上）直接改（东哥 11/11）
-- 只加一列，可重复执行，不改已有数据。
-- texts：{ tagline, filmTitle, filmSubtitle, titleEn, subtitle, bigDate, dateNote, place, billing,
--          extras: [{ text, pos: aboveTitle|belowSubtitle|bottom, size: L|M|S }]（最多 2 行）, lift: 0–0.25（画面上移） }
-- 没填的项按活动信息自动生成。改字只重排，不重新出图、不花钱。
ALTER TABLE event_posters ADD COLUMN IF NOT EXISTS texts jsonb;
