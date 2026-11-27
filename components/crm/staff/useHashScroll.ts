'use client';
import { useEffect } from 'react';

/**
 * 指令 89-B：从「常用 / 开关」或搜索点进来带 #某块 时，等页面数据加载好再滚到那一块（Next 换页时那一块往往还没渲染出来）。
 * ready：数据到了再传 true。
 */
export function useHashScroll(ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    const go = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      const el = id ? document.getElementById(id) : null;
      if (!el) return;
      if (el.tagName === 'DETAILS') (el as HTMLDetailsElement).open = true;
      el.scrollIntoView({ block: 'start' });
    };
    const t = setTimeout(go, 60);
    window.addEventListener('hashchange', go);
    return () => { clearTimeout(t); window.removeEventListener('hashchange', go); };
  }, [ready]);
}
