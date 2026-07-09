import { makeRouteHandler } from '@keystatic/next/route-handler';
import config from '../../../../keystatic.config';

/**
 * Keystatic 读写 / OAuth API —— GitHub 模式(批次 1)。
 * ------------------------------------------------------------------
 * - 批次 0 前是 local 模式,本路由在生产短路 404,禁止公网写入。
 * - 批次 1 切 GitHub 模式:本路由承载 GitHub OAuth 登录回调与读写,
 *   生产必须可用,故解除 404 守卫。
 * - 鉴权:Keystatic GitHub App + OAuth。写操作以登录用户的 GitHub 令牌执行,
 *   对本仓库无写权限者无法提交(GitHub 侧拒绝);未登录无有效会话即无法读写。
 * - 需要的环境变量(Production + Preview 两套):
 *   KEYSTATIC_GITHUB_CLIENT_ID / KEYSTATIC_GITHUB_CLIENT_SECRET / KEYSTATIC_SECRET
 *   + NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG(公开,用于拼登录链接)。
 */
const handlers = makeRouteHandler({ config });

export const GET = handlers.GET;
export const POST = handlers.POST;
