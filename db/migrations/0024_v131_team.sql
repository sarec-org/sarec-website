-- 0024：1.3.1 F 团队与权限
-- 只追加，可重复执行。加人用手机号（每个微信账号一行，邮箱列存内部编号 mp:<uuid>）；地区管理员用 0019 的 staff_roles.regions。
ALTER TABLE staff_roles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE staff_roles ADD COLUMN IF NOT EXISTS regions text[] NOT NULL DEFAULT '{}';
