-- 0047：真机计时上报（指令 31 第二部分，11/22）——只在体验版 / 开发版小程序里上报，只在测试站入库（正式站接口直接丢弃）。
-- 不存任何个人信息：没有 openid、手机、姓名、IP、登录身份；会话号是小程序每次打开随机生成的一串字。
-- 只新建表，可重复执行。数据只留 30 天（写入时顺手删旧的）。
CREATE TABLE IF NOT EXISTS perf_sessions (
  sid        text PRIMARY KEY,                -- 每次打开随机生成，不和任何人关联
  first_at   timestamptz NOT NULL DEFAULT now(),
  last_at    timestamptz NOT NULL DEFAULT now(),
  version    text NOT NULL DEFAULT '',        -- 小程序版本头，例如 mp-1.5.0
  env        text NOT NULL DEFAULT '',        -- trial / develop
  brand      text NOT NULL DEFAULT '',
  model      text NOT NULL DEFAULT '',
  platform   text NOT NULL DEFAULT '',        -- ios / android / devtools
  system     text NOT NULL DEFAULT '',
  wx_version text NOT NULL DEFAULT '',
  sdk        text NOT NULL DEFAULT '',
  bench      integer,                         -- 微信给的设备性能等级（安卓才有）
  net        text NOT NULL DEFAULT '',        -- wifi / 4g / 5g …
  scene      integer,                         -- 打开场景值（例如 1001 发现栏、1007 单人聊天）
  cold       boolean                          -- true = 冷启动
);
CREATE INDEX IF NOT EXISTS perf_sessions_last_idx ON perf_sessions (last_at DESC);

CREATE TABLE IF NOT EXISTS perf_marks (
  id      bigserial PRIMARY KEY,
  sid     text NOT NULL REFERENCES perf_sessions(sid) ON DELETE CASCADE,
  at      timestamptz NOT NULL DEFAULT now(),
  kind    text NOT NULL,                      -- launch 冷启动分段 / page 进页面 / req 请求 / wx 微信自带的性能条目
  name    text NOT NULL,                      -- 分段名、页面路径或接口（编号一律换成 :p）
  t       integer,                            -- 距这次打开开始多少毫秒
  ms      integer NOT NULL,                   -- 耗时（毫秒）
  status  integer,                            -- 请求的状态码（0 = 网络不通）
  extra   text NOT NULL DEFAULT ''            -- 少量补充（例如 cache=hit、mem=1），不放个人信息
);
CREATE INDEX IF NOT EXISTS perf_marks_sid_idx ON perf_marks (sid, id);
CREATE INDEX IF NOT EXISTS perf_marks_kind_at_idx ON perf_marks (kind, at DESC);
