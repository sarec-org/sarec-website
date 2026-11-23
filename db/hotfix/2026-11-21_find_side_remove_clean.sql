-- 线上 1.4.3 临时处理（指令 29 第 5 条，东哥决定要不要跑）：让「找工人／施工队」首页方块马上不显示家政保洁。
-- 只删 jobs_home_entries 里指向「家政保洁」组（target_type = 'group' AND target_key = 'clean'）的那一行；先把整行存进备份表，可撤销（见同目录 _undo.sql）。
-- 影响：1.4.3 的首页「找工人」一侧少一个方块（家政保洁连同“招募中”角标），其余 6 个按原顺序往前补；
--       1.4.3 的「我要接活儿」一侧没有工种方块，所以线上首页在 1.5.0 上线前完全看不到家政保洁方块（「全部工种和服务」里的家政保洁组照样在）。
-- 1.5.0 上线时迁移 0046 会把这一行补回来，只在接活儿一侧、排第一。
-- 用法：psql -1 -v ON_ERROR_STOP=1 -f 这个文件（整段一个事务，出错全部不做）。可重复跑：第二次什么也不删。
CREATE TABLE IF NOT EXISTS jobs_home_entries_backup_0046 (LIKE jobs_home_entries INCLUDING DEFAULTS);
ALTER TABLE jobs_home_entries_backup_0046 ADD COLUMN IF NOT EXISTS backed_up_at timestamptz NOT NULL DEFAULT now();

-- 1) 先列出要删的那一行
SELECT slot, label, icon, target_type, target_key, sort, pinned, updated_by, updated_at
  FROM jobs_home_entries WHERE target_type = 'group' AND target_key = 'clean';

-- 2) 备份整行（同一行已经备份过就不重复）
INSERT INTO jobs_home_entries_backup_0046 (slot, label, icon, target_type, target_key, sort, updated_by, updated_at, pinned)
SELECT e.slot, e.label, e.icon, e.target_type, e.target_key, e.sort, e.updated_by, e.updated_at, e.pinned
  FROM jobs_home_entries e
 WHERE e.target_type = 'group' AND e.target_key = 'clean'
   AND NOT EXISTS (SELECT 1 FROM jobs_home_entries_backup_0046 b WHERE b.slot = e.slot AND b.target_key = e.target_key AND b.updated_at = e.updated_at);

-- 3) 只删这一行，留一条操作记录
WITH gone AS (
  DELETE FROM jobs_home_entries WHERE target_type = 'group' AND target_key = 'clean' RETURNING slot, label, target_key
)
INSERT INTO crm_audit_log (actor, action, target_type, target_id, before_value, reason)
SELECT 'hotfix', 'jobs_home_entry_remove', 'jobs_home_entries', target_key, to_jsonb(gone), '指令 29：找工人一侧去掉家政保洁（1.4.3 临时处理，可撤销）' FROM gone;

-- 4) 删完的样子（找工人一侧首页入口，按顺序）
SELECT slot, label, target_type, target_key, sort, pinned FROM jobs_home_entries ORDER BY sort, slot;
