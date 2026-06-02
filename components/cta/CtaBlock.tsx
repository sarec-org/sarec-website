import Link from 'next/link';
import styles from './CtaBlock.module.css';
import type { CtaConfig } from '@/lib/cta/registry';
import { localize, type Locale } from '@/lib/i18n/types';

/**
 * CtaBlock — 统一 CTA 渲染器(实施方案 D 节 · 阶段①双语)
 * 读 lib/cta/registry.ts 配置,按 position(布局)+ tone(三维降权)渲染。
 *
 * position(布局位置):full 整宽 banner / inline 正文嵌入 / card 紧凑卡片
 * tone.color(颜色轴):gold / navy / neutral —— 配色待 Andy 确认
 * tone.weight(权重轴):primary(实心·大)/ medium(实心·中)/ muted(描边·紧凑)
 *   → 三维降权 = 颜色 + 尺寸 + 形状(实心↔描边)
 *
 * locale:阶段①生产端一律默认 'zh'(英文只存不渲染);仅预览页传 'en' 看英文。
 * 路由:阶段① route 只填 zh,组件读 route.zh(方案 A)。
 */
export type CtaPosition = 'full' | 'inline' | 'card';

const POSITION_CLASS: Record<CtaPosition, string> = {
  full: styles.full,
  inline: styles.inline,
  card: styles.card
};

const COLOR_CLASS: Record<CtaConfig['tone']['color'], string> = {
  gold: styles.colorGold,
  navy: styles.colorNavy,
  neutral: styles.colorNeutral
};

const WEIGHT_CLASS: Record<CtaConfig['tone']['weight'], string> = {
  primary: styles.wPrimary,
  medium: styles.wMedium,
  muted: styles.wMuted
};

export function CtaBlock({
  cta,
  position = 'full',
  locale = 'zh'
}: {
  cta: CtaConfig;
  position?: CtaPosition;
  locale?: Locale;
}) {
  const cls = [
    styles.cta,
    POSITION_CLASS[position],
    COLOR_CLASS[cta.tone.color],
    WEIGHT_CLASS[cta.tone.weight]
  ].join(' ');

  return (
    <section className={cls} data-cta={cta.id} data-locale={locale}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>{localize(cta.eyebrow, locale)}</p>
        <h2 className={styles.title}>{localize(cta.title, locale)}</h2>
        <p className={styles.description}>{localize(cta.description, locale)}</p>
        <div className={styles.row}>
          <Link href={cta.primary.route.zh} className={styles.primary}>
            {localize(cta.primary.label, locale)}
          </Link>
          {cta.secondary ? (
            <Link href={cta.secondary.route.zh} className={styles.secondary}>
              {localize(cta.secondary.label, locale)}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
