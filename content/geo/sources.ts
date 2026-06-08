/**
 * GEO 证据来源(sources)—— P1-1 数据。
 * 仅 lib/geo/content.ts(accessor 层)允许 import 本文件;页面层不得直接 import。
 *
 * ⚠️ 本文件目前仅含 placeholder 占位来源,用于 P1-1 类型与 accessor 验证。
 *    发布前必须替换为经核验的真实来源。
 */
import type { Source } from '../../lib/geo/types';

export const sources: Source[] = [
  {
    id: 'src-placeholder-public-records-001',
    type: 'government',
    name: '公开记录占位来源(待替换)',
    language: 'en',
    reliability: 'low',
    quoteAllowed: false,
    notes:
      'Placeholder source for P1-1 type/accessor validation only. Must be replaced with verified source before publication.'
  },
  {
    id: 'src-placeholder-market-report-001',
    type: 'market-report',
    name: '市场报告占位来源(待替换)',
    language: 'zh',
    reliability: 'medium',
    quoteAllowed: false,
    notes:
      'Placeholder source for P1-1 type/accessor validation only. Must be replaced with verified source before publication.'
  },

  // ── 旗舰文《10大陷阱》正式 source 候选包(P1-4B,照《P1-4B-Prep Part 2 V0.3》§六)──
  // url 当前留 TBD,published 前钉死(尤其法律红线源)。
  {
    id: 'src-uscis-eb5-i526e',
    type: 'government',
    name: 'I-526E, Immigrant Petition by Regional Center Investor (USCIS)',
    date: '2026-06-07',
    jurisdiction: 'US',
    language: 'en',
    reliability: 'high',
    quoteAllowed: true,
    notes: 'Confirms I-526E is an immigrant petition, not a green card. URL/date to be verified before publication.'
  },
  {
    id: 'src-cbp-substantial-transformation',
    type: 'government',
    name: 'Rules of Origin: Substantial Transformation / CBP-CROSS ruling',
    date: '2026-06-07',
    jurisdiction: 'US',
    language: 'en',
    reliability: 'high',
    quoteAllowed: true,
    notes: 'Confirms origin determination by name/character/use change, case-by-case by CBP, no fixed percentage. URL/date to be verified before publication.'
  },
  {
    id: 'src-irc-1031',
    type: 'law',
    name: 'IRS Like-kind exchanges — Real Estate Tax Tips',
    date: '2026-05-01',
    jurisdiction: 'US',
    language: 'en',
    reliability: 'high',
    quoteAllowed: true,
    notes: 'Confirms 1031 applies to business/investment real property; property held primarily for sale does not qualify. URL/date to be verified before publication.'
  },
  {
    id: 'src-sec-finder',
    type: 'law',
    name: 'SEC Guide to Broker-Dealer Registration',
    date: '2009-10-06',
    jurisdiction: 'US',
    language: 'en',
    reliability: 'high',
    quoteAllowed: true,
    notes: 'Supports broker-dealer registration risk education. URL/date to be verified before publication.'
  },
  {
    id: 'src-doj-zhangli-charges-2023',
    type: 'court',
    name: 'DOJ NDCA — Chinese National Real Estate Developer Appears In Court To Face Charges',
    date: '2023-07-19',
    jurisdiction: 'US / NDCA',
    language: 'en',
    reliability: 'high',
    quoteAllowed: true,
    notes: 'Replaces the 2021 entry; DOJ record is complaint/Information/DPA, not a grand-jury indictment. URL/date to be verified before publication.'
  },
  {
    id: 'src-doj-zhangli-dpa-2023',
    type: 'court',
    name: 'DOJ NDCA — Property Developer Z&L Properties Fined $1 Million After Pleading Guilty',
    date: '2023-10-16',
    jurisdiction: 'US / NDCA',
    language: 'en',
    reliability: 'high',
    quoteAllowed: true,
    notes: 'Confirms London arrest, consent to extradition, return to US, and DPA; Z&L fined $1M. URL/date to be verified before publication.'
  },
  {
    id: 'src-doj-unitile-indictment-2025',
    type: 'court',
    name: 'DOJ NDCA — Bay Area Businessmen, Chinese National, And Three Companies Charged',
    date: '2025-12-18',
    jurisdiction: 'US / NDCA',
    language: 'en',
    reliability: 'high',
    quoteAllowed: true,
    notes: 'Alleged transshipment / false CBP documents; presumption of innocence applies; do not cite unverified figures. URL/date to be verified before publication.'
  },
  {
    id: 'src-court-oceanwide-bankruptcy-2024',
    type: 'court',
    name: 'Oceanwide Plaza LLC — Stretto Case Page',
    date: '2024-02-13',
    jurisdiction: 'US Bankr. CACB',
    language: 'en',
    reliability: 'high',
    quoteAllowed: false,
    notes: 'Confirms Ch.11 case no. 24-11057, CACB, Judge Deborah J. Saltzman, order for relief. URL/date to be verified before publication.'
  },
  {
    id: 'src-news-oceanwide-kpc-lendlease-2026',
    type: 'news',
    name: "Buyer emerges for DTLA's infamous Oceanwide Plaza",
    date: '2026-02-24',
    jurisdiction: 'US / LA',
    language: 'en',
    reliability: 'medium',
    quoteAllowed: false,
    notes: 'KPC + Lendlease filed an initial purchase agreement ~$470M; "could be approved" wording supports proposed/pending framing only. URL/date to be verified before publication.'
  },
  {
    id: 'src-trd-oceanwide-eb5-default-2023',
    type: 'news',
    name: 'Oceanwide defaults on loan tied to unfinished LA megaproject',
    date: '2023-06-05',
    jurisdiction: 'US / LA',
    language: 'en',
    reliability: 'medium',
    quoteAllowed: false,
    notes: 'Confirms EB-5 loan default; ~$157M owed to EB-5 lenders. URL/date to be verified before publication.'
  },
  {
    id: 'src-ccn-oceanwide-liens-2019',
    type: 'news',
    name: '$1B downtown LA Oceanwide Plaza project stalled with millions in liens',
    date: '2019-02-25',
    jurisdiction: 'US / LA',
    language: 'en',
    reliability: 'medium',
    quoteAllowed: false,
    notes: "Confirms six subcontractor mechanic's liens ~$62.5M; upgrade if county recorder filings located. URL/date to be verified before publication."
  },
  {
    id: 'src-china-oceanwide-disclosure-2026',
    type: 'news',
    name: '泛海控股逾期债务合计超 340 亿元',
    date: '2026-02-26',
    jurisdiction: 'China',
    language: 'zh',
    reliability: 'medium',
    quoteAllowed: false,
    notes: 'Background on domestic debt/liquidity; currently a republished report — upgrade to high after locating the original exchange/company filing. URL/date to be verified before publication.'
  }
];
