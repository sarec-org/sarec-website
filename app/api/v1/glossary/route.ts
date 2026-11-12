/** GET /api/v1/glossary —— 1.3.3 小程序「术语速查」：中英术语、分类、一两句解释（不带具体金额 / 利率数字）。不用登录；以后加词不用发版。 */
import { handler, ok } from '@/lib/crm/http';
import { glossaryForMp } from '@/lib/tools/glossary';
export const runtime = 'nodejs';
export const revalidate = 3600;
export const GET = handler(async () => {
  const r = ok(glossaryForMp());
  r.headers.set('Cache-Control', 'public, max-age=600, s-maxage=3600');
  return r;
});
