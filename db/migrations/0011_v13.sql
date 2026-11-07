-- 0011：SAREC 1.3
-- ------------------------------------------------------------------
-- 只追加，不改动已有数据；旧版小程序 1.2 用到的表和字段全部保留。可重复执行。

-- B. 带一位朋友 ------------------------------------------------------
-- 同行人：单独一条报名（单独占名额、单独签到），标记由谁代报名。
-- 不替朋友建正式账号：只建一份“占位档案”（is_placeholder = true，不能登录、不进营销名单），
-- 朋友第一次自己扫码 / 报名、手机号对上时并入他自己的档案。
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_placeholder boolean NOT NULL DEFAULT false;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS companion_of uuid REFERENCES registrations(id) ON DELETE SET NULL;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS added_by uuid REFERENCES contacts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS registrations_companion_of_idx ON registrations (companion_of) WHERE companion_of IS NOT NULL;
ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_source_check;
ALTER TABLE registrations ADD CONSTRAINT registrations_source_check CHECK (source = ANY (ARRAY['online', 'onsite', 'staff', 'companion']));
