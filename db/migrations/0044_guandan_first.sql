-- 1.5.0 体验1（指令 21）：小程序首页「专委会与俱乐部」默认第一个大方块是掼蛋俱乐部（东哥：掼蛋是重点）。
-- 只改数据，不在程序里写死；后台「俱乐部」页照样能再调排序。幂等，可重复跑；依赖 0037（clubs、ugc_actions）和 0043（clubs.icon）。
-- 规则：
--   · 只有掼蛋（key = 'guandan'）还不是第一个时才挪：排序改成其他俱乐部里最小的再减 1；
--   · 后台有人保存过俱乐部（ugc_actions 里 kind='club' 的 save / reorder）就不动，尊重人调过的顺序；
--   · 挪了就记一条操作记录（actor = 'migration'，action = 'default_order'，不算人工调序）；
--   · 掼蛋没有图标时给默认 🃏。专委会接口按同 key 的俱乐部排序，自然跟着排第一。
WITH moved AS (
  UPDATE clubs g
     SET sort_order = (SELECT min(o.sort_order) FROM clubs o WHERE o.key <> 'guandan') - 1,
         updated_at = now()
   WHERE g.key = 'guandan'
     AND EXISTS (SELECT 1 FROM clubs o WHERE o.key <> 'guandan' AND o.closed_at IS NULL AND o.sort_order <= g.sort_order)
     AND NOT EXISTS (SELECT 1 FROM ugc_actions a WHERE a.kind = 'club' AND a.action IN ('save', 'reorder'))
  RETURNING g.key, g.sort_order
)
INSERT INTO ugc_actions (kind, target_id, action, actor, note)
SELECT 'club', key, 'default_order', 'migration', '掼蛋俱乐部默认排第一（排序 ' || sort_order || '）' FROM moved;

UPDATE clubs SET icon = '🃏', updated_at = now() WHERE key = 'guandan' AND icon IS NULL;
