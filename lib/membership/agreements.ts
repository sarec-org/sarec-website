/**
 * 协议留档元数据（版本 / URL / 内容 hash）—— agreement acceptance 用。
 * ------------------------------------------------------------------
 * M3 用固定版本常量 + 正文常量 sha256 作为稳定 hash（待律师审核后升版）。
 * 记录 type + version + url + hash + languageMode，满足留档不可抵赖要求
 * （不只存 version）。full_text 快照表 agreement_snapshots 留待后续里程碑落库。
 * 使用 node:crypto，仅服务端 import。
 */
import { createHash } from 'node:crypto';
import type { AgreementType, AgreementLanguageMode } from './types';

export const AGREEMENT_VERSIONS: Record<AgreementType, string> = {
  membership_agreement: '2026-v1-draft',
  strategic_partnership_agreement: '2026-v1-draft',
  privacy_policy: '2026-v1-draft'
};

const AGREEMENT_URLS: Record<AgreementType, string> = {
  membership_agreement: '/legal/membership-agreement',
  strategic_partnership_agreement: '/legal/strategic-partnership-agreement',
  privacy_policy: '/legal/privacy'
};

const AGREEMENT_TITLES: Record<AgreementType, string> = {
  membership_agreement: 'SAREC 入会协议 / SAREC Membership Agreement',
  strategic_partnership_agreement:
    'SAREC 战略合作伙伴协议 / SAREC Strategic Partnership Agreement',
  privacy_policy: '隐私政策 / Privacy Policy'
};

// 稳定正文摘要常量（用于 hash 的规范化参照，非页面渲染源）。措辞待律师审核。
const AGREEMENT_BODIES: Record<AgreementType, string> = {
  membership_agreement:
    'SAREC Membership Agreement (2026 v1 draft). Membership takes effect once SAREC confirms the application and receives the applicable fee. Certain visibility, speaking, referral and content benefits are subject to SAREC review, scheduling, and editorial standards. SAREC does not guarantee any client, transaction, financing, or investment return. Fees are in USD; the 2026 Launch Rate is a limited-time offer. Pending attorney review. English version prevails.',
  strategic_partnership_agreement:
    'SAREC Strategic Partnership Agreement (2026 v1 draft). The Partner is an independent organization; this agreement does not create any partnership, agency, employment, or similar relationship. Benefits are subject to SAREC review, scheduling, and editorial standards. SAREC does not guarantee any client, transaction, financing, or investment return. Fees are in USD; the Partner may pay in full or in two semi-annual installments. Pending attorney review. English version prevails.',
  privacy_policy:
    'SAREC Privacy Policy (2026 v1 draft). Describes the information SAREC collects, how it is used, and when it may be shared with necessary professionals or partners. SAREC does not sell personal information. Payments are processed by a third-party provider; SAREC does not store full card numbers. Pending attorney review. English version prevails.'
};

export const AGREEMENT_LANGUAGE_MODE: AgreementLanguageMode = 'bilingual_english_controls';

export type AgreementMeta = {
  type: AgreementType;
  version: string;
  url: string;
  title: string;
  hash: string;
  languageMode: AgreementLanguageMode;
};

/** 稳定内容 hash：sha256(type:version:body)。同版本每次一致，便于比对留档。 */
export function getAgreementMeta(type: AgreementType): AgreementMeta {
  const version = AGREEMENT_VERSIONS[type];
  const body = AGREEMENT_BODIES[type];
  const hash = createHash('sha256').update(`${type}:${version}:${body}`).digest('hex');
  return {
    type,
    version,
    url: AGREEMENT_URLS[type],
    title: AGREEMENT_TITLES[type],
    hash,
    languageMode: AGREEMENT_LANGUAGE_MODE
  };
}
