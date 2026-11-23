-- 0049：1.5.1「发布活儿」改成小程序里直接填（指令 46，11/23）。
-- 小程序交上来的是"请商会帮忙找师傅"的预约：先进后台（status = 'pending' 待工作人员看），工作人员看过点「派给师傅」才变成 open、
-- 照常通知对口、核验过的接活人；工作人员也可以不派（下架）。小程序里不出现任何用户发布的公开列表；
-- 网站公开的「全部活儿」列表也不列小程序交来的（source = 'mp'），只通知对口的人。
-- 只加一列、放宽一个状态约束（加一个值 'pending'），可重复执行；老数据一行不动（老的都按 source = 'web'）。
-- 不往 crm_settings 写任何东西：开关 jobs_post_in_app 没有记录时代码按"开"（默认新方式）处理。
-- 顺序：先改约束、最后加列——代码以"jobs_posts.source 这一列存在"判断这次迁移跑过没有（没跑过时小程序照旧弹老的「加商会微信＋复制网址」）。

ALTER TABLE jobs_posts DROP CONSTRAINT IF EXISTS jobs_posts_status_check;
ALTER TABLE jobs_posts ADD CONSTRAINT jobs_posts_status_check CHECK (status IN ('pending', 'open', 'found', 'closed', 'removed'));

ALTER TABLE jobs_posts ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'web';
ALTER TABLE jobs_posts DROP CONSTRAINT IF EXISTS jobs_posts_source_check;
ALTER TABLE jobs_posts ADD CONSTRAINT jobs_posts_source_check CHECK (source IN ('web', 'mp'));

CREATE INDEX IF NOT EXISTS jobs_posts_pending_idx ON jobs_posts (created_at) WHERE status = 'pending';
