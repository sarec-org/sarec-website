-- 0014：SAREC 1.3 M 补充——活动类型的名称、默认人数、默认费用都在后台可改（代码和页面里不写死）
-- “私企面对面”改名为“SAREC 企业家圆桌”，默认 20 人、每人 50 美元（东哥 11/7）。只改还是原默认值的行，东哥改过的不动。可重复执行。
ALTER TABLE prep_templates ADD COLUMN IF NOT EXISTS default_capacity int;
ALTER TABLE prep_templates ADD COLUMN IF NOT EXISTS default_fee_cents int;

UPDATE prep_templates SET name = 'SAREC 企业家圆桌' WHERE key = 'face' AND name = '私企面对面（约 20 人）';
UPDATE prep_templates SET default_capacity = 20, default_fee_cents = 5000 WHERE key = 'face' AND default_capacity IS NULL AND default_fee_cents IS NULL;
-- 讲座：人数从名称里拿出来放到“默认人数”
UPDATE prep_templates SET name = '讲座' WHERE key = 'lecture' AND name = '讲座（60–100 人）';
UPDATE prep_templates SET default_capacity = 100, default_fee_cents = 0 WHERE key = 'lecture' AND default_capacity IS NULL AND default_fee_cents IS NULL;
-- 模板事项里写死的“名额 20”改成按本场设置
UPDATE prep_template_items i SET title = '后台建活动：选活动类型（人数、费用自动带出，本场可改）、设置收费方式'
  FROM prep_templates t WHERE i.template_id = t.id AND t.key = 'face' AND i.title = '后台建活动：收费活动、名额 20、设置收费方式';
