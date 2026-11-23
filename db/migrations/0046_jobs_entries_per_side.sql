-- 1.5.0 体验1（指令 29，东哥 11/21 23:29）：家政保洁只属于「我要接活儿」那一侧，「找工人／施工队」那一侧不出现。
-- 首页入口按侧显示：jobs_home_entries.show_on（'find' 找工人一侧、'work' 接活儿一侧），work_sort = 接活儿一侧的顺序（空 = 跟 sort 一样）。
-- 「全部工种和服务」页和家政保洁那一组不动。幂等，可重复跑；依赖 0038（jobs_home_entries、jobs_trade_groups）。
ALTER TABLE jobs_home_entries ADD COLUMN IF NOT EXISTS show_on text[] NOT NULL DEFAULT '{find,work}';
ALTER TABLE jobs_home_entries ADD COLUMN IF NOT EXISTS work_sort integer;

-- 家政保洁（指向 group 'clean' 的入口）改成只在接活儿一侧、排第一。
-- 后台已经按侧保存过首页入口（操作记录 jobs_home_entries 里带 showOn）= 人工定过，不动。
UPDATE jobs_home_entries
   SET show_on = '{work}', work_sort = 0, updated_at = now()
 WHERE target_type = 'group' AND target_key = 'clean'
   AND show_on = '{find,work}'
   AND NOT EXISTS (SELECT 1 FROM crm_audit_log a WHERE a.action = 'jobs_home_entries' AND a.after_value::text LIKE '%"showOn"%');

-- 家政保洁这一行不在了（例如线上 1.4.3 临时去掉过）：补回来，只在接活儿一侧、排第一；放进空着的位置（1–7）。
INSERT INTO jobs_home_entries (slot, label, icon, target_type, target_key, sort, pinned, show_on, work_sort)
SELECT (SELECT min(s) FROM generate_series(1, 7) s WHERE s NOT IN (SELECT slot FROM jobs_home_entries)),
       '家政保洁', 'sparkles', 'group', 'clean', 0, false, '{work}', 0
 WHERE NOT EXISTS (SELECT 1 FROM jobs_home_entries WHERE target_type = 'group' AND target_key = 'clean')
   AND EXISTS (SELECT 1 FROM jobs_trade_groups WHERE key = 'clean')
   AND EXISTS (SELECT 1 FROM generate_series(1, 7) s WHERE s NOT IN (SELECT slot FROM jobs_home_entries));
