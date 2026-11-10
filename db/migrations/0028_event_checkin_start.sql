-- 0028：活动“签到开始时间”（东哥 11/9 晚）
-- 只追加，可重复执行，不改已有数据。为空时按开始时间前 30 分钟显示。
ALTER TABLE events ADD COLUMN IF NOT EXISTS checkin_starts_at timestamptz;
