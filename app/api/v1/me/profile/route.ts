/** 1.5.0 我的个人主页：GET；POST { bio, companyIntro, offers[], seeks[] } */
import { myProfile, saveProfile } from '@/lib/crm/ugc';
import { body, handler, ok, requireContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => ok(await myProfile(await requireContact(req))));
export const POST = handler(async (req: Request) => ok(await saveProfile(await requireContact(req), await body(req))));
