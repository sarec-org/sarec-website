-- 0005：活动可设为“不公开”（不出现在活动列表，凭链接或二维码仍可报名、签到）。只追加一列，不改已有数据。
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_listed boolean NOT NULL DEFAULT true;
