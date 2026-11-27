-- 0055：1.7.1 首页「商会看板」（指令 95，服务器这一半）。
-- 只新建一张表 board_notices（工作人员手动发的通知）。自动消息（新活动、名额快满、组局还差几位、新入会、找工人新活儿、
-- 节日祝福、相册新照片、新文章、新海报模板）都由 /api/v1/board 从现有表实时算，不建触发器、不存副本。
-- 每种自动消息的开关存 crm_settings.board_auto（{"event_new": false, ...}；没有这条 / 没写的种类 = 开），不需要在这里插。
-- 只依赖 PostgreSQL 13+ 自带的 gen_random_uuid()，不依赖任何别的表；可重复执行（第二遍只有"已存在，跳过"提示）。

CREATE TABLE IF NOT EXISTS board_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 一句话，最多 60 个字（按字符算）
  text text NOT NULL CHECK (char_length(text) BETWEEN 1 AND 60),
  -- 点了去哪：NULL = 不跳；{"type":"event","id":"<events.id>"} / {"type":"page","path":"/pages/..."} / {"type":"web","url":"https://..."}
  link jsonb,
  -- 置顶的永远排在最前（看板页最上面醒目显示）
  pinned boolean NOT NULL DEFAULT false,
  -- 从什么时候开始显示（默认发出即显示）
  starts_at timestamptz NOT NULL DEFAULT now(),
  -- 到什么时候自动撤下（NULL = 不自动撤；不置顶的 14 天后自然滚出看板）
  ends_at timestamptz,
  -- 谁发的（工作人员 email / 名字，和 crm_audit_log.actor 同一写法）
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- 立即撤下（不删行，留底）
  removed_at timestamptz
);

-- 查"现在在显示的"：没撤下的按开始时间倒序
CREATE INDEX IF NOT EXISTS board_notices_live_idx ON board_notices (starts_at DESC) WHERE removed_at IS NULL;
