import type { Metadata } from 'next';
import { ViewportDebug } from './ViewportDebug';

// 临时真机诊断页(下一轮删除)。noindex,不进 sitemap(sitemap 为硬编码清单,不含本路由)。
export const metadata: Metadata = {
  title: 'Viewport Debug · SAREC',
  robots: { index: false, follow: false }
};

export default function ViewportDebugPage() {
  return <ViewportDebug />;
}
