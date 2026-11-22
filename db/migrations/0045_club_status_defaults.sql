-- 1.5.0 体验1（指令 27）：俱乐部 / 专委会"已成立 / 筹备中"的默认值——首页只显示已成立的，筹备中的只在「全部」里标"筹备中"。
-- 状态存在 crm_settings.committees（[{ key, name, status: 'active' | 'preparing' }]），后台在
--   「设置与团队 › 设置 › 专委会与俱乐部状态」或「客户 › 俱乐部」编辑里改（两处写同一份，改动都记 crm_audit_log）。
-- 默认（只改数据，程序里不写死）：guandan = 已成立；investment、design = 筹备中；golf 不动（后台现在是什么就是什么）。
-- 只在"没有人工改过这一项的状态"时才设：crm_audit_log 里 target_id = 'committees' 的 update_setting 记录中，
--   这个 key 的 status 和改之前不一样（或之前没有这个 key）= 人工改过，不动。
-- 设置里还没有这个 key、但俱乐部表里有：按俱乐部名字补一项。幂等，可重复跑；依赖 0003（crm_settings、crm_audit_log）、0037（clubs）。
DO $$
DECLARE
  defaults jsonb := '{"guandan": "active", "investment": "preparing", "design": "preparing"}'::jsonb;
  cur jsonb;
  nxt jsonb;
  k text;
  st text;
  human boolean;
  idx int;
BEGIN
  SELECT CASE WHEN jsonb_typeof(value) = 'array' THEN value ELSE '[]'::jsonb END INTO cur FROM crm_settings WHERE key = 'committees';
  cur := coalesce(cur, '[]'::jsonb);
  nxt := cur;
  FOR k, st IN SELECT * FROM jsonb_each_text(defaults) LOOP
    SELECT EXISTS (
      SELECT 1 FROM crm_audit_log a
       CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(a.after_value::jsonb) = 'array' THEN a.after_value::jsonb ELSE '[]'::jsonb END) x
       WHERE a.target_id = 'committees' AND a.action = 'update_setting' AND x->>'key' = k
         AND NOT EXISTS (
           SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(a.before_value::jsonb) = 'array' THEN a.before_value::jsonb ELSE '[]'::jsonb END) y
            WHERE y->>'key' = k AND y->>'status' = x->>'status')
    ) INTO human;
    IF human THEN CONTINUE; END IF;
    SELECT (o - 1)::int INTO idx FROM jsonb_array_elements(nxt) WITH ORDINALITY e(el, o) WHERE el->>'key' = k LIMIT 1;
    IF idx IS NOT NULL THEN
      IF nxt->idx->>'status' IS DISTINCT FROM st THEN
        nxt := jsonb_set(nxt, ARRAY[idx::text, 'status'], to_jsonb(st));
      END IF;
    ELSIF EXISTS (SELECT 1 FROM clubs c WHERE c.key = k AND c.closed_at IS NULL) THEN
      nxt := nxt || jsonb_build_array(jsonb_build_object('key', k, 'name', (SELECT name FROM clubs WHERE key = k), 'status', st));
    END IF;
  END LOOP;
  IF nxt IS DISTINCT FROM cur THEN
    INSERT INTO crm_settings (key, value, updated_by, updated_at) VALUES ('committees', nxt, 'migration', now())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = 'migration', updated_at = now();
    -- 记一条操作记录，但 action 不是 update_setting，不算"人工改过"
    INSERT INTO crm_audit_log (actor, action, target_type, target_id, before_value, after_value, reason)
    VALUES ('migration', 'default_status', 'setting', 'committees', cur, nxt, '0045：掼蛋已成立，投资委员会、设计联盟筹备中（没人工改过的才设）');
  END IF;
END $$;

-- 掼蛋的方块图标（0044 已设；这里再保一次，图标空才设）
UPDATE clubs SET icon = '🃏', updated_at = now() WHERE key = 'guandan' AND icon IS NULL;
