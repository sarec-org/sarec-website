-- 0023：补充 2（东哥 11/8 21:05）——后台“新建活动”一张表，类型带默认值：公开讲座 / 企业家圆桌 / 高峰论坛 / 其他。
-- 只追加：讲座、圆桌已有（不动东哥设过的默认值）；没有的补上“高峰论坛”“其他”，默认当前上限 30、硬上限 60、免费。
INSERT INTO prep_templates (key, name, sort_order, default_capacity, default_hard_capacity, default_fee_cents)
VALUES ('summit', '高峰论坛', 30, 30, 60, 0), ('other', '其他', 90, 30, 60, 0)
ON CONFLICT (key) DO NOTHING;
UPDATE prep_templates SET name = '公开讲座' WHERE key = 'lecture' AND name = '讲座';
