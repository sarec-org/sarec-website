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

  // ── 旗舰文《10大陷阱》正式 source 候选包(P1-4C 写回 url/date/name/notes;照《P1-4B-Prep Part 2 V0.3》§六)──
  {
    id: 'src-uscis-eb5-i526e',
    type: 'government',
    name: 'USCIS: I-526E, Immigrant Petition by Regional Center Investor',
    url: 'https://www.uscis.gov/i-526e',
    date: 'accessed 2026-06-07',
    jurisdiction: 'United States',
    language: 'en',
    reliability: 'high',
    quoteAllowed: true,
    notes: 'USCIS official page. Form I-526E is an immigrant petition by a regional center investor, not a visa or green card.'
  },
  {
    id: 'src-cbp-substantial-transformation',
    type: 'government',
    name: 'CBP: Marking of Country of Origin on U.S. Imports',
    url: 'https://www.cbp.gov/trade/rulings/informed-compliance-publications/marking-country-origin-us-imports',
    date: 'accessed 2026-06-07',
    jurisdiction: 'United States',
    language: 'en',
    reliability: 'high',
    quoteAllowed: true,
    notes: 'CBP official guidance. Substantial transformation = a new article with a different name, character, and use; no fixed percentage rule.'
  },
  {
    id: 'src-irc-1031',
    type: 'law',
    name: 'IRS: Like-kind exchanges — Real estate tax tips',
    url: 'https://www.irs.gov/businesses/small-businesses-self-employed/like-kind-exchanges-real-estate-tax-tips',
    date: 'accessed 2026-06-07',
    jurisdiction: 'United States',
    language: 'en',
    reliability: 'high',
    quoteAllowed: true,
    notes: 'IRS official guidance. Section 1031 applies to real property held for business/investment; property held primarily for sale (dealer/inventory) does not qualify (IRC 1031(a)(2)).'
  },
  {
    id: 'src-sec-finder',
    type: 'law',
    name: 'SEC: Guide to Broker-Dealer Registration',
    url: 'https://www.sec.gov/about/divisions-offices/division-trading-markets/division-trading-markets-compliance-guides/guide-broker-dealer-registration',
    date: 'accessed 2026-06-07',
    jurisdiction: 'United States',
    language: 'en',
    reliability: 'high',
    quoteAllowed: true,
    notes: 'SEC official guide. Broker-dealer registration risk education, including finders and placement agents in private placements. Do NOT position SAREC as a broker, placement agent, capital intermediary, or transaction-based securities participant.'
  },
  {
    id: 'src-doj-zhangli-charges-2023',
    type: 'court',
    name: 'DOJ NDCA: Chinese National Real Estate Developer Appears In Court To Face Charges Of Bribing A Prominent San Francisco Public Official',
    url: 'https://www.justice.gov/usao-ndca/pr/chinese-national-real-estate-developer-appears-court-face-charges-bribing-prominent',
    date: '2023-07-19',
    jurisdiction: 'United States / Northern District of California',
    language: 'en',
    reliability: 'high',
    quoteAllowed: true,
    notes: 'DOJ official release. Zhang charged by Criminal Complaint then Information (waived right to indictment); entered DPA. Do NOT describe Zhang as indicted by a grand jury. Z&L Properties (company) pleaded guilty; Zhang (individual) DPA — keep distinct.'
  },
  {
    id: 'src-doj-zhangli-dpa-2023',
    type: 'court',
    name: 'DOJ NDCA: Property Developer Z&L Properties Fined $1 Million After Pleading Guilty To Honest Services Fraud Conspiracy',
    url: 'https://www.justice.gov/usao-ndca/pr/property-developer-zl-properties-fined-1-million-after-pleading-guilty-honest-services',
    date: '2023-10-16',
    jurisdiction: 'United States / Northern District of California',
    language: 'en',
    reliability: 'high',
    quoteAllowed: true,
    notes: 'DOJ official release. Zhang London arrest, waiver of extradition, return to US, DPA; Z&L Properties (company) guilty plea + $1,000,000 fine.'
  },
  {
    id: 'src-doj-unitile-indictment-2025',
    type: 'court',
    name: 'DOJ NDCA: Bay Area Businessmen, Chinese National, And Three Companies Charged With Scheme To Evade Millions In Customs Duties',
    url: 'https://www.justice.gov/usao-ndca/pr/bay-area-businessmen-chinese-national-and-three-companies-charged-scheme-evade',
    date: '2025-12-18',
    jurisdiction: 'United States / Northern District of California',
    language: 'en',
    reliability: 'high',
    quoteAllowed: true,
    notes: 'DOJ official release. Indictment of related individuals/companies re alleged customs-duty evasion. Preserve presumption of innocence; treat as allegations, not convictions. User-facing article anonymizes individual defendants.'
  },
  {
    id: 'src-court-oceanwide-bankruptcy-2024',
    type: 'court',
    name: 'Stretto: Oceanwide Plaza LLC Chapter 11 Case Page',
    url: 'https://cases.stretto.com/oceanwideplaza/',
    date: '2024-02-13',
    jurisdiction: 'United States / Central District of California Bankruptcy Court',
    language: 'en',
    reliability: 'high',
    quoteAllowed: false,
    notes: 'Stretto official case page. Oceanwide Plaza LLC Chapter 11, case 24-11057, petition date 2024-02-13, Judge Deborah J. Saltzman. Transaction status subject to court documents, approval, closing.'
  },
  {
    id: 'src-news-oceanwide-kpc-lendlease-2026',
    type: 'news',
    name: "Urbanize LA: Buyer emerges for DTLA's infamous Oceanwide Plaza",
    url: 'https://la.urbanize.city/post/buyer-emerges-dtlas-infamous-oceanwide-plaza',
    date: '2026-02-24',
    jurisdiction: 'California / Los Angeles',
    language: 'en',
    reliability: 'medium',
    quoteAllowed: false,
    notes: 'KPC Development Co. + Lendlease filed an initial $470M purchase agreement in bankruptcy court. Proposed/pending sale only; do NOT state approved/closed/completed.'
  },
  {
    id: 'src-trd-oceanwide-eb5-default-2023',
    type: 'news',
    name: 'The Real Deal: Oceanwide Defaults on Loan Tied to Unfinished DTLA Megaproject',
    url: 'https://therealdeal.com/la/2023/06/05/oceanwide-defaults-on-loan-tied-to-unfinished-la-megaproject/',
    date: '2023-06-05',
    jurisdiction: 'California / Los Angeles',
    language: 'en',
    reliability: 'medium',
    quoteAllowed: false,
    notes: "Oceanwide EB-5 loan default; reported amount owed to EB-5 lenders; failure to obtain senior construction loan; mechanic's liens; unpaid interest/principal. Public reporting, not court finding."
  },
  {
    id: 'src-ccn-oceanwide-liens-2019',
    type: 'news',
    name: 'California Construction News: $1 billion downtown LA Oceanwide Plaza project stalled with millions of dollars in liens filed',
    url: 'https://www.californiaconstructionnews.com/2019/02/25/1-billion-downtown-la-oceanwide-plaza-project-stalled-with-millions-of-dollars-in-liens-filed/',
    date: '2019-02-25',
    jurisdiction: 'California / Los Angeles',
    language: 'en',
    reliability: 'medium',
    quoteAllowed: false,
    notes: "Public reporting: at least six subcontractors filed mechanic's liens ~$62.5M as of Feb 15, 2019. Upgrade if county recorder/court filings obtained."
  },
  {
    id: 'src-china-oceanwide-disclosure-2026',
    type: 'news',
    name: '财联社：泛海控股未能按期偿还有息债务合计344.81亿元',
    url: 'https://www.cls.cn/detail/2380330',
    date: '2026-05-25',
    jurisdiction: 'China',
    language: 'zh',
    reliability: 'medium',
    quoteAllowed: false,
    notes: 'Media report citing China Oceanwide disclosure (as of 2026-04-30). Domestic debt/liquidity background only. Prefer original company/exchange filing before publication; do NOT use alone to support any aggregate "500亿级别" claim. NOTE: 文章正文仍用 340.26 亿(2026-01 口径)以保持全篇一致,不在正文引入 344.81。'
  }
];
