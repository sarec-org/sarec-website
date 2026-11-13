-- 0034：线上只读巡检记录（东哥 11/12 定的发版关卡）
-- 只新建表，可重复执行，不改已有数据。部署后 + 每天跑一次；有失败时后台首页红条，可选邮件只发给东哥本人（默认关）。
CREATE TABLE IF NOT EXISTS qa_patrol_runs (
  id          bigserial PRIMARY KEY,
  trigger     text NOT NULL DEFAULT 'daily',   -- daily | deploy | manual
  base        text NOT NULL,
  total       integer NOT NULL,
  failed      integer NOT NULL,
  results     jsonb NOT NULL,                  -- [{ name, ok, detail }]
  emailed     boolean NOT NULL DEFAULT false,
  alert_sig   text,                            -- 这一组失败项的指纹（同一组一天只发一次邮件）
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS qa_patrol_runs_at_idx ON qa_patrol_runs (created_at DESC);
