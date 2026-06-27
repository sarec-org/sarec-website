'use client';

import { makePage } from '@keystatic/next/ui/app';
import config from '../../../keystatic.config';

/**
 * Keystatic 后台 UI —— 官方 App Router 客户端写法。
 * ------------------------------------------------------------------
 * Keystatic 后台是纯客户端 SPA,必须在 'use client' 边界内挂载,
 * 否则服务端渲染为空 body → 叠加 globals 近黑背景 = 黑屏(见 Gate 3A-6 诊断)。
 * 生产环境禁用守卫下沉到同目录 layout.tsx(服务端组件)承担。
 */
export default makePage(config);
