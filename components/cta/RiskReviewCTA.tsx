import { CtaBlock, type CtaPosition } from './CtaBlock';
import { CTA_REGISTRY } from '@/lib/cta/registry';
import type { Locale } from '@/lib/i18n/types';

/** 入口 1 · 风险初诊 · 全漏斗转化核心(每个内容页底部默认挂这个) */
export function RiskReviewCTA({ position, locale }: { position?: CtaPosition; locale?: Locale }) {
  return <CtaBlock cta={CTA_REGISTRY['risk-review']} position={position} locale={locale} />;
}
