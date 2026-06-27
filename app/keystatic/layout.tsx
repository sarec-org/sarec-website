import { notFound } from 'next/navigation';

/**
 * Keystatic 后台布局 —— 服务端组件,承担生产环境禁用守卫。
 * ------------------------------------------------------------------
 * - page.tsx 是 Keystatic 要求的客户端组件(无法在其中用 notFound 守卫),
 *   故把「生产环境禁用 /keystatic 后台」的安全守卫放在本服务端 layout。
 * - 生产环境(NODE_ENV === 'production')→ notFound(),绝不暴露公网后台;
 *   非生产环境 → 原样渲染 children(本地编辑可用)。
 * - NODE_ENV 是 Next 标准变量,非新增服务器环境变量。
 * - 与 app/api/keystatic 路由的生产 404 守卫成对,双层保险。
 */
export default function KeystaticLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }
  return children;
}
