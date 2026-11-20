/** POST /api/v1/jobs/me/pro/photo?kind=avatar|work|license|insurance|bizreg（multipart，字段 file）→ { url }：登记接活用的图片 */
import { handler, ok } from '@/lib/crm/http';
import { CrmError } from '@/lib/crm/events';
import { requireLogin, requireSide, viewer } from '@/lib/jobs/access';
import { uploadFromForm } from '@/lib/jobs/upload';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const KINDS = ['avatar', 'work', 'license', 'insurance', 'bizreg'];
export const POST = handler(async (req: Request) => {
  const v = await viewer(req);
  requireSide(v, 'work');
  requireLogin(v);
  const kind = new URL(req.url).searchParams.get('kind') ?? 'work';
  if (!KINDS.includes(kind)) throw new CrmError('bad_request', 'kind 只能是 avatar、work、license、insurance、bizreg');
  return ok({ url: await uploadFromForm(req, 'image', kind === 'avatar' ? 480 : 1600), kind });
});
