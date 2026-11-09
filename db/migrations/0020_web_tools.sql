-- 0020：1.4 网站工具 · 计算结果保存到本人账户（第三窗口 11/8 夜）
-- ------------------------------------------------------------------
-- 只追加，可重复执行。不改任何已有表。
-- 只有登录用户能存；只能看、删自己的；每人最多保留 50 条（接口里控制）。
-- 只存输入参数和算出来的数字，不存任何联系方式。

CREATE TABLE IF NOT EXISTS tool_saves (
  id          bigserial PRIMARY KEY,
  contact_id  uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  tool        text NOT NULL,                  -- mortgage / 1031
  title       text NOT NULL DEFAULT '',
  inputs      jsonb NOT NULL DEFAULT '{}',
  outputs     jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tool_saves_contact_idx ON tool_saves (contact_id, tool, created_at DESC);
