import { CtaBlock, type CtaPosition } from './CtaBlock';
import { CTA_REGISTRY } from '@/lib/cta/registry';
import type { Locale } from '@/lib/i18n/types';

/** 通用兜底 · 非漏斗页(关于 / 法务等) */
export function ContactGeneralCTA({ position, locale }: { position?: CtaPosition; locale?: Locale }) {
  return <CtaBlock cta={CTA_REGISTRY['contact-general']} position={position} locale={locale} />;
}
