import { CtaBlock, type CtaPosition } from './CtaBlock';
import { CTA_REGISTRY } from '@/lib/cta/registry';
import type { Locale } from '@/lib/i18n/types';

/** 入口 3 · 副线专业机构 AI 搜索可见度 · 明显降权(neutral / muted) */
export function AiSearchAuditCTA({ position, locale }: { position?: CtaPosition; locale?: Locale }) {
  return <CtaBlock cta={CTA_REGISTRY['ai-search-audit']} position={position} locale={locale} />;
}
