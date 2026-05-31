'use client';

import { MotionConfig } from 'framer-motion';

/**
 * 全首页 framer-motion 动效统一尊重 prefers-reduced-motion。
 * 包裹首页各区块即可(MotionConfig 仅提供 context,不渲染 DOM,无布局影响)。
 */
export function MotionReduced({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
