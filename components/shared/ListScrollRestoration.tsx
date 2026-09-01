'use client';

/**
 * ListScrollRestoration —— 列表页返回位置恢复(最小实现)。
 * ------------------------------------------------------------------
 * 背景:微信 iOS 内从列表页点进详情再返回,落点不正确
 * (/zh/projects 回到顶部、/zh/research 落点不确定)。
 * 根因之一已由「hero 视口高改走 --locked-vh」治掉(页高不再随地址栏变化);
 * 本组件是第二层兜底 —— 覆盖微信把返回当成整页重新加载(BFCache 失效)的情况,
 * 那种情况下浏览器 / Next 的自动恢复根本不会发生。
 *
 * 规格(刻意保持最小):
 *  - 按 pathname 分键存取,互不干扰
 *  - 恢复后【立即删除】该键 —— 只对「返回」这一次生效,
 *    之后从导航正常进入该页仍然落在顶部
 *  - rAF + 60ms 二次补偿,写法照抄既有的 HomeScrollRestoration.forceInstantScroll
 *  - 【不设 history.scrollRestoration = 'manual'】
 *    scrollRestoration 是标签页级设置,改了会影响全站;本组件不碰它,
 *    与浏览器 / Next 的自动恢复并存 —— 两者恢复到同一位置,不冲突。
 *    (站内既有的 ServiceScrollRestoration 设 manual,但已在卸载时还原为 auto,
 *     无跨页副作用,本次核实无需改动。)
 *  - 无新依赖、无视觉输出(返回 null)。
 */

import { useEffect, useLayoutEffect } from 'react';
import { usePathname } from 'next/navigation';

const PREFIX = 'sarec:list-scroll:';

function keyFor(pathname: string) {
  return `${PREFIX}${pathname}`;
}

/** 强制无动画滚动 —— 逐字照抄 HomeScrollRestoration 的既有写法。 */
function forceInstantScroll(y: number) {
  const root = document.documentElement;
  const body = document.body;
  const previousRootBehavior = root.style.scrollBehavior;
  const previousBodyBehavior = body.style.scrollBehavior;

  root.style.scrollBehavior = 'auto';
  body.style.scrollBehavior = 'auto';
  window.scrollTo(0, y);
  root.style.scrollBehavior = previousRootBehavior;
  body.style.scrollBehavior = previousBodyBehavior;
}

export function ListScrollRestoration() {
  const pathname = usePathname();

  // 恢复:尽早执行,并做两次补偿(图片 / 字体落位后页高可能微调)。
  useLayoutEffect(() => {
    if (typeof window === 'undefined' || !pathname) return;

    const key = keyFor(pathname);
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(key);
      // 只对「返回」这一次生效,读到即删。
      if (raw !== null) sessionStorage.removeItem(key);
    } catch {
      return;
    }

    const y = raw ? Number.parseInt(raw, 10) : Number.NaN;
    if (!Number.isFinite(y) || y <= 0) return;

    forceInstantScroll(y);
    requestAnimationFrame(() => forceInstantScroll(y));
    window.setTimeout(() => forceInstantScroll(y), 60);
  }, [pathname]);

  // 保存:离开本页前记录当前位置。
  useEffect(() => {
    if (typeof window === 'undefined' || !pathname) return;

    const save = () => {
      try {
        sessionStorage.setItem(keyFor(pathname), String(Math.round(window.scrollY)));
      } catch {
        /* 隐私模式等场景下 sessionStorage 不可用,静默跳过 */
      }
    };

    // 站内软导航(next/link)走 click;整页离开 / 进后台走 pagehide。
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href]');
      if (!anchor || anchor.target || anchor.hasAttribute('download')) return;
      save();
    };

    window.addEventListener('click', onClick, { capture: true });
    window.addEventListener('pagehide', save);

    return () => {
      window.removeEventListener('click', onClick, { capture: true });
      window.removeEventListener('pagehide', save);
    };
  }, [pathname]);

  return null;
}
