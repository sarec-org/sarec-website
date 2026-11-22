/**
 * 指令 31 性能：公开、不分人的接口让 Vercel 边缘节点缓存（洛杉矶就近返回，不用每次回美国东部的函数和数据库）。
 * 只有同时满足才缓存：地址带 c=mp（小程序专用的公开地址，缓存按完整地址区分）、没带登录令牌、版本头是 1.3.1 及以后的小程序
 * （这类请求的返回内容只取决于地址：不带人数、不带金额）。其他请求（网站、带令牌的、旧版）照旧 no-store，一个字不变。
 * 新建 / 改活动后，边缘最多 20 秒内还是旧的，再过最多 120 秒内后台刷新（stale-while-revalidate）。
 */
import { isMp131, tokenFrom } from '@/lib/crm/http';

export function edgeCacheable(req: Request): boolean {
  if (req.method !== 'GET') return false;
  if (new URL(req.url).searchParams.get('c') !== 'mp') return false;
  if (req.headers.get('authorization')) return false;
  try { if (tokenFrom(req)) return false; } catch { return false; }
  return isMp131(req);
}

export function withEdgeCache(req: Request, res: Response, sMaxAge = 20, swr = 120): Response {
  if (res.status !== 200 || !edgeCacheable(req)) return res;
  res.headers.set('Cache-Control', `public, max-age=0, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`);
  res.headers.set('Vary', 'X-Sarec-Client');
  return res;
}
