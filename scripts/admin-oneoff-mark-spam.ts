/**
 * 正式库一次性改动（后台综合优化 第二部分 四.9）：把 11/19 那条外部会计公司的推销标为"不跟进"。
 * ------------------------------------------------------------------
 * 只认参数传进来的条件，不写死任何人；默认只打印要改哪几条（dry-run），加 --apply 才真改。
 * 等东哥说"行"后由开发窗口做成双击文件执行；子任务 B 不执行。
 *
 * 用法：
 *   DATABASE_URL=... pnpm dlx tsx scripts/admin-oneoff-mark-spam.ts --date 2026-11-19 --contains 会计 [--contains accounting] [--name 某某] [--email x@y.com] [--id <任务号>] [--category pitch|spam] [--apply]
 * 条件之间是"并且"；--contains 可以给多次（任一命中即可，查称呼、需求、原话）。至少要给 --id，或 --date 加一个其他条件。
 * 只改仍在"待联系 / 已联系 / 已约谈"的；改成 status='dropped'、category 默认 'pitch'、category_by='staff'，并写一条处理记录（谁：一次性脚本）。
 * 一次最多改 5 条，多了拒绝（防止条件写宽了误伤）。
 */
import { getPool } from '@/lib/db/client';

function args() {
  const a = process.argv.slice(2);
  const out: { date?: string; contains: string[]; name?: string; email?: string; id?: string; category: string; apply: boolean } = { contains: [], category: 'pitch', apply: false };
  for (let i = 0; i < a.length; i++) {
    const k = a[i];
    const v = a[i + 1];
    if (k === '--apply') out.apply = true;
    else if (k === '--date') (out.date = v), i++;
    else if (k === '--contains') (out.contains.push(v), i++);
    else if (k === '--name') (out.name = v), i++;
    else if (k === '--email') (out.email = v), i++;
    else if (k === '--id') (out.id = v), i++;
    else if (k === '--category') (out.category = v), i++;
  }
  return out;
}

async function main() {
  const o = args();
  if (!process.env.DATABASE_URL) throw new Error('请先设置 DATABASE_URL');
  if (o.date && !/^\d{4}-\d{2}-\d{2}$/.test(o.date)) throw new Error('--date 格式应为 YYYY-MM-DD');
  if (o.id && !/^[0-9a-f-]{36}$/i.test(o.id)) throw new Error('--id 格式不对');
  if (!['pitch', 'spam'].includes(o.category)) throw new Error('--category 只能是 pitch 或 spam');
  if (!o.id && !(o.date && (o.contains.length || o.name || o.email))) throw new Error('条件太宽：至少给 --id，或 --date 加 --contains / --name / --email');
  const pool = getPool();
  const { rows } = await pool.query<{ id: string; name: string | null; need: string | null; message: string | null; status: string; created_at: Date; email: string | null }>(
    `SELECT f.id, f.name, f.need, i.message, f.status, f.created_at, i.email
       FROM followups f LEFT JOIN inquiries i ON i.id = f.inquiry_id
      WHERE f.status IN ('todo','contacted','meeting')
        AND ($1::uuid IS NULL OR f.id = $1)
        AND ($2::date IS NULL OR (f.created_at AT TIME ZONE 'America/Los_Angeles')::date = $2::date)
        AND (cardinality($3::text[]) = 0 OR EXISTS (SELECT 1 FROM unnest($3::text[]) w
               WHERE coalesce(f.name,'') ILIKE '%' || w || '%' OR coalesce(f.need,'') ILIKE '%' || w || '%' OR coalesce(i.message,'') ILIKE '%' || w || '%'))
        AND ($4::text IS NULL OR f.name ILIKE '%' || $4 || '%')
        AND ($5::text IS NULL OR lower(i.email) = lower($5) OR f.contact_text ILIKE '%' || $5 || '%')
      ORDER BY f.created_at`,
    [o.id ?? null, o.date ?? null, o.contains, o.name ?? null, o.email ?? null]
  );
  console.log(`${o.apply ? '【真改】' : '【只看，不改】'}符合条件的 ${rows.length} 条：`);
  for (const r of rows) {
    const text = (r.message || r.need || '').replace(/\s+/g, ' ').slice(0, 60);
    const mail = r.email ? r.email.replace(/^(.).*@/, '$1***@') : '';
    console.log(`  - ${r.id} · ${r.created_at.toISOString().slice(0, 16)} · ${r.name ?? '未留称呼'} ${mail} · ${r.status} · ${text}`);
  }
  if (rows.length > 5) throw new Error('超过 5 条，条件可能写宽了，没有改任何东西');
  if (!o.apply || !rows.length) {
    if (!o.apply) console.log('（没加 --apply，什么都没改）');
    await pool.end();
    return;
  }
  for (const r of rows) {
    await pool.query(`UPDATE followups SET status = 'dropped', category = $2, category_by = 'staff', updated_at = now() WHERE id = $1`, [r.id, o.category]);
    await pool.query(`INSERT INTO followup_log (followup_id, actor, from_status, to_status, note) VALUES ($1, 'script:admin-oneoff-mark-spam', $2, 'dropped', $3)`, [
      r.id,
      r.status,
      `一次性脚本：标为${o.category === 'pitch' ? '合作或推销' : '垃圾'}，不跟进（东哥同意）`
    ]);
  }
  console.log(`已改 ${rows.length} 条。`);
  await pool.end();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
