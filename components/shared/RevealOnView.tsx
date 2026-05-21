'use client';

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type ElementType,
  type Ref
} from 'react';

export type RevealOnViewProps = {
  children: ReactNode;
  /** 渲染标签,默认 'span'。可指定 'h2' / 'blockquote' / 'p' 等 */
  as?: ElementType;
  /** 外部 className(合并 .reveal-line / .reveal-visible 全局类)*/
  className?: string;
  /** IntersectionObserver threshold,默认 0.3 */
  threshold?: number;
  /** 触发后延迟启动 ms,用于同 section 多元素错峰,默认 0 */
  delay?: number;
};

/**
 * RevealOnView — IO-gated clip-path reveal 共享组件
 *
 * 元素进入 viewport(threshold 默认 0.3)时触发 .reveal-visible 类,
 * 启动全局 @keyframes revealLine(clip-path 从左到右揭开)。
 *
 * 用全局类 .reveal-line / .reveal-visible(写在 app/globals.css)而非 CSS Modules —
 * 避免跨多个 module.css hash 不一致的问题,整站长期复用。
 *
 * 用法:
 *   <RevealOnView as="h2" className={styles.sectionH2}>标题</RevealOnView>
 *   <RevealOnView as="blockquote" className={styles.quoteText}>引文</RevealOnView>
 *
 * Fallback:
 *   - IO 不支持 → 直接 visible
 *   - prefers-reduced-motion → 全局 CSS 已兜底(clip-path:none + animation:none)
 */
export function RevealOnView({
  children,
  as: Tag = 'span',
  className = '',
  threshold = 0.3,
  delay = 0
}: RevealOnViewProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (delay > 0) {
            setTimeout(() => setVisible(true), delay);
          } else {
            setVisible(true);
          }
          io.disconnect();
        }
      },
      { threshold, rootMargin: '0px' }
    );
    io.observe(el);

    return () => io.disconnect();
  }, [threshold, delay]);

  const mergedClass = `${className} reveal-line ${visible ? 'reveal-visible' : ''}`
    .trim()
    .replace(/\s+/g, ' ');

  return (
    <Tag ref={ref as Ref<HTMLElement>} className={mergedClass}>
      {children}
    </Tag>
  );
}
