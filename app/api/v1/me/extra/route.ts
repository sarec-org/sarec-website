/** 1.5.0 选填资料：年龄段、性别（东哥已点头：选填，不强制）。GET；POST { ageRange, gender }（空 = 不填） */
import { getPool } from '@/lib/db/client';
import { AGE_RANGES, GENDERS } from '@/lib/crm/broadcast';
import { body, handler, ok, requireContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  const me = await requireContact(req);
  const { rows } = await getPool().query<{ age_range: string | null; gender: string | null }>(`SELECT age_range, gender FROM contacts WHERE id = $1`, [me]);
  return ok({ ageRange: rows[0]?.age_range ?? '', gender: rows[0]?.gender ?? '', ageOptions: AGE_RANGES, genderOptions: GENDERS });
});
export const POST = handler(async (req: Request) => {
  const me = await requireContact(req);
  const b = await body<{ ageRange?: string; gender?: string }>(req);
  const age = AGE_RANGES.includes(String(b.ageRange)) ? String(b.ageRange) : null;
  const gender = GENDERS.includes(String(b.gender)) ? String(b.gender) : null;
  await getPool().query(`UPDATE contacts SET age_range = $2, gender = $3, updated_at = now() WHERE id = $1`, [me, age, gender]);
  return ok({ message: '已保存（随时可以改回“不填”）' });
});
