import { makeRouteHandler } from '@keystatic/next/route-handler';
import config from '../../../../keystatic.config';

/**
 * Keystatic 读写 API —— 仅本地编辑使用，生产默认 404。
 * ------------------------------------------------------------------
 * - 生产环境下短路返回 404，使后台无法在公网写入文件（与 page.tsx 的 notFound 守卫成对）。
 * - local 模式：无登录 / 无 GitHub App / 无数据库 / 无新增服务器环境变量（NODE_ENV 为 Next 标准变量）。
 */
const handlers = makeRouteHandler({ config });

const blocked = () => new Response('Not found', { status: 404 });

export const GET = process.env.NODE_ENV === 'production' ? blocked : handlers.GET;
export const POST = process.env.NODE_ENV === 'production' ? blocked : handlers.POST;
