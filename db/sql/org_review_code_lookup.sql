-- 只读：查现在能用的审核码（填进提审文案的 XXXXXXXXXX）。不改任何数据。
SELECT k.code, k.expires_at, k.uses, k.revoked_at
  FROM organizer_codes k JOIN organizers o ON o.id = k.organizer_id
 WHERE k.kind = 'review' AND o.is_demo AND o.name = 'SAREC 审核测试' AND k.revoked_at IS NULL AND k.expires_at > now()
 ORDER BY k.expires_at DESC LIMIT 1;
