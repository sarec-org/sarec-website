-- 0019：1.3.1 E 分地区
-- ------------------------------------------------------------------
-- 只追加，可重复执行。洛杉矶的活动只推给洛杉矶的人；高峰论坛推给所有人；外地活动在首页公告区能看到、不推送。
--  - 用户：常驻地区（本人填写 region_self / 系统推断 region_inferred 分开存）、关注地区 focus_regions。
--    region_self / region_inferred 也在 0016 里加过（两份迁移都能单独执行）。
--  - 活动：所在地区 region、通知范围 notify_scope（本地区 / 指定几个地区 / 全部地区）。
--  - 工作人员：地区管理员只管自己地区（staff_roles.regions，空 = 全部地区）。
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS region_self text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS region_inferred text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS focus_regions text[] NOT NULL DEFAULT '{}';

ALTER TABLE events ADD COLUMN IF NOT EXISTS region text NOT NULL DEFAULT '洛杉矶/橙县';
ALTER TABLE events ADD COLUMN IF NOT EXISTS notify_scope text NOT NULL DEFAULT 'local';
DO $$ BEGIN
  ALTER TABLE events ADD CONSTRAINT events_notify_scope_check CHECK (notify_scope IN ('local','regions','all'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE events ADD COLUMN IF NOT EXISTS notify_regions text[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS events_region_idx ON events (region, starts_at);

ALTER TABLE staff_roles ADD COLUMN IF NOT EXISTS regions text[] NOT NULL DEFAULT '{}';
