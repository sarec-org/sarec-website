/** 1.3.1 B：一键确认出席 / 去不了（点开确认页再点一下，打开链接不会自动确认）。
 *  鉴权：短信链接里的签名 t，或小程序会话本人的报名。GET → 报名状态；POST { t?, answer: 'yes'|'no' } */
import { getPool } from '@/lib/db/client';
import { CrmError } from '@/lib/crm/events';
import { body, handler, ok, optionalContact } from '@/lib/crm/http';
import { answerConfirm, confirmInfo, confirmTokenOk } from '@/lib/crm/seats';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
async function allowed(req: Request, reg: string, t: string | null | undefined) {
  if (!/^[0-9a-f-]{36}$/.test(reg)) throw new CrmError('not_found', '链接不对，请从短信或小程序重新打开');
  if (confirmTokenOk(reg, t)) return;
  const me = await optionalContact(req);
  if (me) {
    const { rows } = await getPool().query(`SELECT 1 FROM registrations WHERE id = $1 AND contact_id = $2`, [reg, me]);
    if (rows[0]) return;
  }
  throw new CrmError('forbidden', '链接已失效，请从短信或小程序重新打开');
}
export const GET = handler(async (req: Request, { params }: { params: { reg: string } }) => {
  await allowed(req, params.reg, new URL(req.url).searchParams.get('t'));
  return ok({ info: await confirmInfo(params.reg) });
});
export const POST = handler(async (req: Request, { params }: { params: { reg: string } }) => {
  const b = await body<{ t?: string; answer?: string }>(req);
  await allowed(req, params.reg, b.t);
  if (b.answer !== 'yes' && b.answer !== 'no') throw new CrmError('bad_request', '请点“我来”或“去不了”');
  return ok({ result: await answerConfirm(params.reg, b.answer === 'yes'), info: await confirmInfo(params.reg) });
});
