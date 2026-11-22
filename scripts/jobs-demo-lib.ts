/** 演示数据脚本共用：只许测试库（和正式库比主机名，不打印）、按「演示-」前缀找、删 */
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Pool } from 'pg';

export const DEMO_PREFIX = '演示-';
export const DEMO_EMAIL_DOMAIN = '@example.com';

function hostsIn(text: string): string[] {
  const out = new Set<string>();
  for (const m of Array.from(text.matchAll(/postgres(?:ql)?:\/\/[^\s"'`]+/g))) {
    try { out.add(new URL(m[0]).hostname.toLowerCase()); } catch { /* 跳过 */ }
  }
  for (const m of Array.from(text.matchAll(/^(?:export\s+)?[A-Z_]*(?:PGHOST|POSTGRES_HOST|DB_HOST)[A-Z_]*\s*=\s*["']?([^"'\s]+)/gm))) out.add(m[1].toLowerCase());
  return Array.from(out);
}

/** 数据库主机不是正式库主机才放行；读不到正式库主机名也拒绝。只打印“通过 / 拒绝”，不打印主机名和密钥。 */
export function assertTestDb(): void {
  if (process.env.VERCEL_ENV === 'production') { console.error('拒绝：VERCEL_ENV=production'); process.exit(1); }
  let target = '';
  try { target = new URL(process.env.DATABASE_URL ?? '').hostname.toLowerCase(); } catch { /* 下面拒绝 */ }
  const f = join(homedir(), '.sarec', 'prod.env');
  const prod = existsSync(f) ? hostsIn(readFileSync(f, 'utf8')) : [];
  if (!target || !prod.length) { console.error('拒绝：读不到数据库主机名或正式库主机名，无法确认不是正式库'); process.exit(1); }
  const strip = (h: string) => h.replace(/-pooler(?=\.)/, '');
  if (prod.some((h) => strip(h) === strip(target))) { console.error('拒绝：DATABASE_URL 指向正式库'); process.exit(1); }
  console.log('主机比对通过：不是正式库');
}

export async function demoContactIds(pool: Pool): Promise<string[]> {
  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM contacts WHERE name LIKE $1 AND email LIKE 'demo-jobs-%' AND email LIKE $2`,
    [`${DEMO_PREFIX}%`, `%${DEMO_EMAIL_DOMAIN}`]
  );
  return rows.map((r) => r.id);
}

/** 删演示数据：按前缀找到的身份 + 额外给的 ID（身份、接活人、活儿都行） */
export async function removeDemo(pool: Pool, extraIds: string[]) {
  const ids = new Set(await demoContactIds(pool));
  const uuids = extraIds.filter((x) => /^[0-9a-f-]{36}$/i.test(x));
  if (uuids.length) {
    const { rows } = await pool.query<{ id: string }>(
      `SELECT id FROM contacts WHERE id = ANY($1::uuid[]) AND name LIKE $2
       UNION SELECT contact_id FROM jobs_pros WHERE id = ANY($1::uuid[]) AND name LIKE $2
       UNION SELECT p.contact_id FROM jobs_posts p JOIN contacts c ON c.id = p.contact_id WHERE p.id = ANY($1::uuid[]) AND c.name LIKE $2`,
      [uuids, `${DEMO_PREFIX}%`]
    );
    rows.forEach((r) => ids.add(r.id));
  }
  const list = Array.from(ids);
  if (!list.length) return { contacts: 0, pros: 0, posts: 0 };
  const q = async (sql: string) => (await pool.query(sql, [list])).rowCount ?? 0;
  await q(`DELETE FROM ops_exceptions WHERE ref IN (SELECT id::text FROM jobs_pros WHERE contact_id = ANY($1::uuid[])) OR ref IN (SELECT id::text FROM jobs_posts WHERE contact_id = ANY($1::uuid[]))`).catch(() => 0);
  await q(`DELETE FROM jobs_contacts WHERE viewer_contact_id = ANY($1::uuid[])`).catch(() => 0);
  await q(`DELETE FROM jobs_notifications WHERE contact_id = ANY($1::uuid[]) OR post_id IN (SELECT id FROM jobs_posts WHERE contact_id = ANY($1::uuid[]))`).catch(() => 0);
  await q(`DELETE FROM jobs_reports WHERE reporter_contact_id = ANY($1::uuid[])`).catch(() => 0);
  const posts = await q(`DELETE FROM jobs_posts WHERE contact_id = ANY($1::uuid[])`);
  const pros = await q(`DELETE FROM jobs_pros WHERE contact_id = ANY($1::uuid[])`);
  await q(`DELETE FROM applications WHERE contact_id = ANY($1::uuid[])`);
  await q(`DELETE FROM sessions WHERE contact_id = ANY($1::uuid[])`).catch(() => 0);
  await q(`DELETE FROM track_events WHERE contact_id = ANY($1::uuid[])`).catch(() => 0);
  const contacts = await q(`DELETE FROM contacts WHERE id = ANY($1::uuid[])`);
  return { contacts, pros, posts };
}
