-- 1.6.0 上线双击文件用：在正式库准备审核员的路（指令 57 第 4 条）。前提：迁移 0050、0051 已跑。
-- 做两件事，都可重复执行（跑两遍不会多出东西）：
--   1) 没有演示主办方「SAREC 审核测试」就建一个（is_demo = true，先审后发 0 场，状态"使用中"）；被停用了就恢复。
--   2) 没有"能用的"审核码（没作废、还有 14 天以上有效期）就新出一个：10 位大写字母+数字（不含 I O 0 1），60 天有效，可多人反复用。
-- 最后一行只输出这 10 位码（psql -tA -f 这个文件 → 只打印码）。
-- 过审后在后台「主办方 → 审核用开通码」点「作废」。
BEGIN;
INSERT INTO organizers (name, staff_note, status, review_left, created_by, is_demo)
SELECT 'SAREC 审核测试', '微信审核员用的演示主办方（不是真实主办方）', 'active', 0, 'launch-script', true
 WHERE NOT EXISTS (SELECT 1 FROM organizers WHERE is_demo AND name = 'SAREC 审核测试');
UPDATE organizers SET status = 'active', review_left = 0, suspended_at = NULL, suspended_by = NULL, suspend_reason = NULL, updated_at = now()
 WHERE is_demo AND name = 'SAREC 审核测试' AND (status <> 'active' OR review_left <> 0);
INSERT INTO organizer_codes (code, organizer_id, kind, created_by, expires_at, note)
SELECT (SELECT string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '') FROM generate_series(1, 10)),
       o.id, 'review', 'launch-script', now() + interval '60 days', '微信审核用'
  FROM organizers o
 WHERE o.is_demo AND o.name = 'SAREC 审核测试'
   AND NOT EXISTS (SELECT 1 FROM organizer_codes k WHERE k.kind = 'review' AND k.organizer_id = o.id AND k.revoked_at IS NULL AND k.expires_at > now() + interval '14 days')
 ORDER BY o.created_at LIMIT 1;
COMMIT;
SELECT k.code FROM organizer_codes k JOIN organizers o ON o.id = k.organizer_id
 WHERE k.kind = 'review' AND o.is_demo AND o.name = 'SAREC 审核测试' AND k.revoked_at IS NULL AND k.expires_at > now()
 ORDER BY k.expires_at DESC LIMIT 1;
