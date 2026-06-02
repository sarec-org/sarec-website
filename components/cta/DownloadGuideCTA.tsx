import { CtaBlock, type CtaPosition } from './CtaBlock';
import { CTA_REGISTRY } from '@/lib/cta/registry';
import type { Locale } from '@/lib/i18n/types';

/** Lead Magnet · 资料下载(资源库 / 文章中部;下载后引导升级到风险初诊) */
export function DownloadGuideCTA({ position, locale }: { position?: CtaPosition; locale?: Locale }) {
  return <CtaBlock cta={CTA_REGISTRY['download-guide']} position={position} locale={locale} />;
}
