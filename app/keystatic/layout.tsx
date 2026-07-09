/**
 * Keystatic 后台布局 —— GitHub 模式(批次 1)。
 * ------------------------------------------------------------------
 * - 批次 0 前是 local 模式,本 layout 曾在生产 notFound() 封锁公网后台。
 * - 批次 1 切 GitHub 模式后解除封锁:/keystatic 在生产可访问,
 *   访问控制交由 Keystatic GitHub App + OAuth 承担——
 *   未登录只见登录页、无法读写;对本仓库无写权限者即使登录也无法提交(GitHub 侧拒绝)。
 * - 因此本 layout 不再做 NODE_ENV 守卫,原样渲染 children。
 */
export default function KeystaticLayout({ children }: { children: React.ReactNode }) {
  return children;
}
