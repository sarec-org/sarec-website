/**
 * IndexNow 提交（M6.2）—— 把已发布文章 URL 主动推给 Bing / Yandex 等支持 IndexNow 的引擎。
 * ------------------------------------------------------------------
 * 触发方式:
 *  - Vercel Cron(vercel.json)每日 GET 本路由,Authorization: Bearer <CRON_SECRET>;
 *  - 或部署后由 Deploy Hook / 手动带 ?key=<INDEXNOW_KEY> 触发。
 * 鉴权:CRON_SECRET(Bearer,常量时间比对)或 ?key= 命中 INDEXNOW_KEY 之一即可。
 * key 验证文件:public/<INDEXNOW_KEY>.txt(内容=key),IndexNow 端据此校验域名归属。
 * Google 不支持 IndexNow —— Google 侧需人工在 Search Console 提交 sitemap(见员工说明),本路由不承诺 Google 收录。
 */
import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';
import { listArticles } from '@/lib/geo/content';
import { SITE_URL } from '@/lib/seo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

function safeEqual(a: string, b: string): boolean {
  const x = createHash('sha256').update(a).digest();
  const y = createHash('sha256').update(b).digest();
  return timingSafeEqual(x, y);
}

function authorize(req: Request): boolean {
  const key = process.env.INDEXNOW_KEY;
  const cronSecret = process.env.CRON_SECRET;
  const header = req.headers.get('authorization') || '';
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (cronSecret && m && safeEqual(m[1], cronSecret)) return true;
  const qKey = new URL(req.url).searchParams.get('key') || '';
  if (key && safeEqual(qKey, key)) return true;
  return false;
}

export async function GET(req: Request): Promise<NextResponse> {
  const key = process.env.INDEXNOW_KEY;
  if (!key) {
    return NextResponse.json(
      { ok: false, error: '未配置 INDEXNOW_KEY(见部署说明),暂不提交。' },
      { status: 501 }
    );
  }
  if (!authorize(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const host = new URL(SITE_URL).host;
  const urlList = listArticles({ status: 'published' }).map((a) => `${SITE_URL}/zh/research/${a.slug}`);
  // 也带上研究中心列表页
  urlList.push(`${SITE_URL}/zh/research`);

  if (urlList.length === 0) {
    return NextResponse.json({ ok: true, submitted: 0, note: '无已发布文章。' });
  }

  const payload = {
    host,
    key,
    keyLocation: `${SITE_URL}/${key}.txt`,
    urlList,
  };

  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      submitted: urlList.length,
      urls: urlList,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 502 });
  }
}
