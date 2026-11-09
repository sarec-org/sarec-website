/**
 * GET /api/v1/tools/download/roi-model —— 1.4 会员下载：投资回报模型 Excel 模板。
 * 只给有效会员：未登录 401、非会员 / 已过期 403（页面上引导入会）。
 * 文件放在 private/（不在 public/，没有直链），随函数一起部署（next.config.js outputFileTracingIncludes）。
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getPool } from '@/lib/db/client';
import { CrmError } from '@/lib/crm/events';
import { memberStatus } from '@/lib/crm/membership';
import { handler, requireContact } from '@/lib/crm/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FILE = path.join(process.cwd(), 'private', 'tools', 'sarec-roi-model-v1.xlsx');
const NAME = 'SAREC投资回报模型_v1.xlsx';

export const GET = handler(async (req: Request) => {
  const me = await requireContact(req);
  const st = await memberStatus(getPool(), me);
  if (!st.isMember) {
    throw new CrmError('forbidden', st.expired ? '会员已到期，续费后即可下载' : '这个模板是会员专享，入会后即可下载');
  }
  const buf = await readFile(FILE);
  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="sarec-roi-model-v1.xlsx"; filename*=UTF-8''${encodeURIComponent(NAME)}`,
      'Cache-Control': 'private, no-store'
    }
  });
});
