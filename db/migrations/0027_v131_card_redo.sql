-- 0027：1.3.1 真机修正 1 · 电子名片重做（东哥 11/9 下午）
-- 只追加，可重复执行，不改已有数据。
-- 名片新增“网站”；地区、网站的公开开关；以后新建的名片默认公开邮箱、微信号（手机默认不公开）。
ALTER TABLE member_cards ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE member_cards ADD COLUMN IF NOT EXISTS show_website boolean NOT NULL DEFAULT true;
ALTER TABLE member_cards ADD COLUMN IF NOT EXISTS show_region boolean NOT NULL DEFAULT true;
ALTER TABLE member_cards ALTER COLUMN show_email SET DEFAULT true;
ALTER TABLE member_cards ALTER COLUMN show_wechat SET DEFAULT true;
