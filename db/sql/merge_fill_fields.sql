-- 指令 58（11/24）一次性补救：以前合并档案时，名片 / 头像这类"一人一份"的东西撞了唯一约束、整份留在旧档案，主档案那份是空的。
-- 对每一次还没撤销的合并：主档案名片里空着的格子用被合并档案的补上；主档案已经填了的一律不动（例如东哥 11/24 重填的）；
-- 主档案名片从没编辑过时，模板、公开勾选、审核状态也跟过来；头像等主档案空着才补。被合并档案原样留着当底。
-- 和 lib/crm/dupMerge.ts 的 fillFromMerged 同一套规则。可重复执行（第二遍什么都不改）。每补一格记一条 crm_audit_log。
-- 最后一行输出：补了几格。
BEGIN;
CREATE TEMP TABLE _filled (kept uuid, merged uuid, t text, col text, prev jsonb, val jsonb) ON COMMIT DROP;
DO $$
DECLARE
  r record; c text; n int; kc timestamptz; mc timestamptz; has_k boolean; has_m boolean;
  card_text text[] := ARRAY['company','title','intro','wechat_id','name_en','company_en','title_en','industry','project_photo_url','website','address','logo_url','bio','company_intro'];
  card_arr  text[] := ARRAY['offers','seeks'];
  card_whole text[] := ARRAY['template','show_phone','show_email','show_wechat','show_website','show_region','show_address','searchable','reviewed_at','reviewed_by','sec_check','content_updated_at'];
  contact_text text[] := ARRAY['avatar_url','region_self','name_alt','gender','age_range'];
BEGIN
  FOR r IN SELECT kept_id, merged_id FROM contact_merges WHERE undone_at IS NULL ORDER BY created_at LOOP
    SELECT true, content_updated_at INTO has_k, kc FROM member_cards WHERE contact_id = r.kept_id;
    SELECT true, content_updated_at INTO has_m, mc FROM member_cards WHERE contact_id = r.merged_id;
    IF has_k AND has_m AND mc IS NOT NULL THEN
      FOREACH c IN ARRAY card_text LOOP
        EXECUTE format('WITH old AS (SELECT to_jsonb(%1$I) p FROM member_cards WHERE contact_id=$1),
          u AS (          UPDATE member_cards k SET %1$I=m.%1$I FROM member_cards m WHERE k.contact_id=$1 AND m.contact_id=$2
            AND (k.%1$I IS NULL OR btrim(k.%1$I)='''') AND nullif(btrim(m.%1$I),'''') IS NOT NULL RETURNING to_jsonb(k.%1$I) v) INSERT INTO _filled SELECT $1,$2,%3$L,%2$L,(SELECT p FROM old),v FROM u', c, c, 'member_cards') USING r.kept_id, r.merged_id;
      END LOOP;
      FOREACH c IN ARRAY card_arr LOOP
        EXECUTE format('WITH old AS (SELECT to_jsonb(%1$I) p FROM member_cards WHERE contact_id=$1),
          u AS (          UPDATE member_cards k SET %1$I=m.%1$I FROM member_cards m WHERE k.contact_id=$1 AND m.contact_id=$2
            AND coalesce(cardinality(k.%1$I),0)=0 AND coalesce(cardinality(m.%1$I),0)>0 RETURNING to_jsonb(k.%1$I) v) INSERT INTO _filled SELECT $1,$2,%3$L,%2$L,(SELECT p FROM old),v FROM u', c, c, 'member_cards') USING r.kept_id, r.merged_id;
      END LOOP;
      IF kc IS NULL THEN
        FOREACH c IN ARRAY card_whole LOOP
          EXECUTE format('WITH old AS (SELECT to_jsonb(%1$I) p FROM member_cards WHERE contact_id=$1),
            u AS (            UPDATE member_cards k SET %1$I=m.%1$I FROM member_cards m WHERE k.contact_id=$1 AND m.contact_id=$2
              AND k.%1$I IS DISTINCT FROM m.%1$I RETURNING to_jsonb(k.%1$I) v) INSERT INTO _filled SELECT $1,$2,%3$L,%2$L,(SELECT p FROM old),v FROM u', c, c, 'member_cards') USING r.kept_id, r.merged_id;
        END LOOP;
      END IF;
    END IF;
    FOREACH c IN ARRAY contact_text LOOP
      EXECUTE format('WITH old AS (SELECT to_jsonb(%1$I) p FROM contacts WHERE id=$1),
        u AS (        UPDATE contacts k SET %1$I=m.%1$I FROM contacts m WHERE k.id=$1 AND m.id=$2
          AND (k.%1$I IS NULL OR btrim(k.%1$I::text)='''') AND nullif(btrim(m.%1$I::text),'''') IS NOT NULL RETURNING to_jsonb(k.%1$I) v) INSERT INTO _filled SELECT $1,$2,%3$L,%2$L,(SELECT p FROM old),v FROM u', c, c, 'contacts') USING r.kept_id, r.merged_id;
    END LOOP;
    has_k := NULL; has_m := NULL; kc := NULL; mc := NULL;
  END LOOP;
END $$;
INSERT INTO crm_audit_log (actor, action, target_type, target_id, before_value, after_value, reason)
SELECT 'launch-script', 'merge_fill_fields', 'contact', kept::text, jsonb_build_object(t||'.'||col, prev), jsonb_build_object(t||'.'||col, val, 'from', merged), '指令 58：合并时留在旧档案的名片/头像补到主档案'
  FROM _filled;
SELECT count(*) FROM _filled;
COMMIT;
