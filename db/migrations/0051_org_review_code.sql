-- 0051：1.6.0 审核用开通码（指令 57 第 4 条"不藏功能"，11/23）。
-- 微信审核员是陌生微信号：后台（或上线双击文件里的 db/sql/org_review_code.sql）出一个"审核用开通码"（organizer_codes.kind = 'review'），
-- 指向一个固定的演示主办方「SAREC 审核测试」（organizers.is_demo = true，先审后发 0 场）。
-- 审核码：10 位，可多人反复用（uses 计数），默认 60 天有效，后台一键作废（revoked_at）。所有用它开通的微信号都进同一个「SAREC 审核测试」当负责人。
-- 演示主办方不进试用看板；它的活动和所有主办方活动一样不进首页、不进商会的活动 / 客户 / 群发（0050 的隔离照旧）。
-- 只加列、放宽一个约束；可重复执行；老数据一行不动；不往 crm_settings 写任何东西。

ALTER TABLE organizers ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

ALTER TABLE organizer_codes ADD COLUMN IF NOT EXISTS uses int NOT NULL DEFAULT 0;
ALTER TABLE organizer_codes ADD COLUMN IF NOT EXISTS note text;
ALTER TABLE organizer_codes ADD COLUMN IF NOT EXISTS revoked_at timestamptz;
ALTER TABLE organizer_codes ADD COLUMN IF NOT EXISTS revoked_by text;
ALTER TABLE organizer_codes DROP CONSTRAINT IF EXISTS organizer_codes_kind_check;
ALTER TABLE organizer_codes ADD CONSTRAINT organizer_codes_kind_check CHECK (kind IN ('owner', 'helper', 'review'));
CREATE INDEX IF NOT EXISTS organizers_demo_idx ON organizers (created_at) WHERE is_demo;
