/** 1.5.0 我的项目 / 案例：POST { id?, title, body, images[] } 新建或修改（有图的先审后发）；DELETE ?id= */
import { deleteProject, saveProject } from '@/lib/crm/ugc';
import { body, handler, ok, requireContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request) => ok(await saveProject(await requireContact(req), await body(req))));
export const DELETE = handler(async (req: Request) => ok(await deleteProject(await requireContact(req), String(new URL(req.url).searchParams.get('id') ?? ''))));
