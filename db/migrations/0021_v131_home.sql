-- 0021：1.3.1 G 首页轮播（0020 留给第三窗口的网站工具）
-- ------------------------------------------------------------------
-- 轮播内容系统自动取（活动、照片、入会 / 会员服务、公告 / 合作伙伴），助理只处理例外：
-- 置顶、隐藏、换图、改文案、手动加一张。所有手动设置必须有截止时间；活动取消 / 结束、照片撤回授权等状态优先于手动设置。
CREATE TABLE IF NOT EXISTS home_slides (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action      text NOT NULL CHECK (action IN ('pin','hide','edit','add')),
  target      text,                         -- 自动卡片的编号：event:<id> / photos:<eventId> / join / member / intro；手动加的为空
  kind        text NOT NULL DEFAULT 'notice' CHECK (kind IN ('event','photos','join','member','notice','intro')),
  title       text,
  eyebrow     text,
  meta        text,
  image_url   text,
  button_text text,
  link        text,                         -- 小程序页面路径（/pages/...）或网站链接
  audience    text NOT NULL DEFAULT 'all' CHECK (audience IN ('all','new','member','registered')),
  region      text,                         -- 空 = 所有地区
  expires_at  timestamptz NOT NULL,         -- 必须有截止时间
  created_by  text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  removed_at  timestamptz
);
CREATE INDEX IF NOT EXISTS home_slides_live_idx ON home_slides (expires_at) WHERE removed_at IS NULL;
