-- 撤销「找工人一侧去掉家政保洁」：从备份表把那一行放回原位置（原 slot、原内容）。
-- 原位置已经被别的入口占了（后台改过）就不放，提示出来。用法同上：psql -1 -v ON_ERROR_STOP=1 -f 这个文件。
SELECT b.slot, b.label, b.target_key, EXISTS (SELECT 1 FROM jobs_home_entries e WHERE e.slot = b.slot) AS slot_taken
  FROM (SELECT DISTINCT ON (target_key) * FROM jobs_home_entries_backup_0046 WHERE target_key = 'clean' ORDER BY target_key, backed_up_at DESC) b;

INSERT INTO jobs_home_entries (slot, label, icon, target_type, target_key, sort, updated_by, updated_at, pinned)
SELECT b.slot, b.label, b.icon, b.target_type, b.target_key, b.sort, b.updated_by, b.updated_at, b.pinned
  FROM (SELECT DISTINCT ON (target_key) * FROM jobs_home_entries_backup_0046 WHERE target_type = 'group' AND target_key = 'clean' ORDER BY target_key, backed_up_at DESC) b
 WHERE NOT EXISTS (SELECT 1 FROM jobs_home_entries e WHERE e.target_type = 'group' AND e.target_key = 'clean')
   AND NOT EXISTS (SELECT 1 FROM jobs_home_entries e WHERE e.slot = b.slot);

INSERT INTO crm_audit_log (actor, action, target_type, target_id, reason)
SELECT 'hotfix', 'jobs_home_entry_restore', 'jobs_home_entries', 'clean', '撤销：家政保洁放回首页入口'
 WHERE EXISTS (SELECT 1 FROM jobs_home_entries WHERE target_type = 'group' AND target_key = 'clean');

SELECT slot, label, target_type, target_key, sort, pinned FROM jobs_home_entries ORDER BY sort, slot;
