import { CtaBlock, type CtaPosition } from './CtaBlock';
import { CTA_REGISTRY } from '@/lib/cta/registry';
import type { Locale } from '@/lib/i18n/types';

/** 入口 2 · 项目方华人市场增长 · 合规敏感(文案须过中英 forbiddenWords + 人工复读) */
export function ProjectGrowthCTA({ position, locale }: { position?: CtaPosition; locale?: Locale }) {
  return <CtaBlock cta={CTA_REGISTRY['project-growth']} position={position} locale={locale} />;
}
