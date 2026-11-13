-- 0035：小程序报错上报（东哥 11/12 定的发版关卡：问题出现的当天就知道，不用等东哥碰上）
-- 只新建表，可重复执行。只存按天汇总的次数：页面、接口（去掉活动名 / 编号 / 令牌）、状态码、错误码、版本号；不存任何个人信息和 IP。
CREATE TABLE IF NOT EXISTS client_errors (
  day        date NOT NULL,
  sig        text NOT NULL,          -- 页面 + 接口 + 状态码 + 错误码 的指纹（同一类错误）
  page       text NOT NULL,
  api        text NOT NULL,
  status     integer NOT NULL,
  code       text NOT NULL DEFAULT '',
  version    text NOT NULL DEFAULT '',
  n          integer NOT NULL DEFAULT 0,
  first_at   timestamptz NOT NULL DEFAULT now(),
  last_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (day, sig, version)
);
CREATE INDEX IF NOT EXISTS client_errors_sig_idx ON client_errors (sig, day);
