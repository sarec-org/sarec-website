-- 0052：1.6.1 组局可修改（指令 60，11/24）。
-- 发起人能改标题、时间、地点 / 地址、人数上限、一句话。改了时间或地点，已经报名的人在卡片上看到「时间已改」「地点已改」。
-- 记法：各记一次最后改动的时间；报名时间早于这个时间的人（报名时看到的是旧的）才显示标记。
-- 组局原来就没有任何提醒 / 订阅消息，这一版也不加任何消息。
-- 只加列；可重复执行；老数据一行不动（新列都是空的 = 没改过）。

ALTER TABLE club_meetups ADD COLUMN IF NOT EXISTS edited_at timestamptz;
ALTER TABLE club_meetups ADD COLUMN IF NOT EXISTS time_changed_at timestamptz;
ALTER TABLE club_meetups ADD COLUMN IF NOT EXISTS place_changed_at timestamptz;
