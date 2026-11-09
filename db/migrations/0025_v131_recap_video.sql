-- 0025：1.3.1 G5 网站活动回顾页：活动视频链接（YouTube 嵌入；视频号给链接）。只追加，可重复执行。
ALTER TABLE events ADD COLUMN IF NOT EXISTS video_url text;
