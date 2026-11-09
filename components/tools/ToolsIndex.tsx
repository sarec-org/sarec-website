'use client';
/** 1.4 · 工具总页（/zh/tools）：列出全部网站工具。小程序"全部服务"里的工具入口指向这里。 */
import Link from 'next/link';
import { L, ToolShell, useLang } from './ToolShell';
import s from '@/components/crm/crm.module.css';
import t from './tools.module.css';

export const TOOLS_LIST = [
  {
    href: '/zh/tools/mortgage',
    zh: '月供与现金流计算器', en: 'Mortgage & Cash Flow Calculator',
    dz: '房价、首付、利率、租金 → 月供、月现金流、年化现金回报。可保存、可生成分享图。',
    de: 'Price, down payment, rate, rent → monthly payment, cash flow and cash-on-cash. Save results or create a share image.',
    tag: { zh: '免费', en: 'Free' }
  },
  {
    href: '/zh/tools/1031',
    zh: '1031 换房税务速算', en: '1031 Exchange Tax Estimator',
    dz: '卖出价、成本、折旧、所在州 → 粗算应税额和换房可递延的税。粗算，以会计师为准。',
    de: 'Sale price, basis, depreciation, state → rough tax on a sale and the amount a 1031 could defer.',
    tag: { zh: '免费', en: 'Free' }
  },
  {
    href: '/zh/tools/roi-model',
    zh: '投资回报模型（Excel）', en: 'Investment Return Model (Excel)',
    dz: '10 年现金流、IRR、Cap Rate、现金回报率、DSCR，全部公式可改。',
    de: '10-year cash flow, IRR, cap rate, cash-on-cash and DSCR — fully editable formulas.',
    tag: { zh: '会员下载', en: 'Members' }
  }
] as const;

export function ToolsIndexPage() {
  return (
    <ToolShell
      hideBack
      eyebrow={{ zh: 'TOOLS · 工具', en: 'TOOLS' }}
      title={{ zh: '房地产工具', en: 'Real Estate Tools' }}
      lead={{ zh: '给中美房地产从业者和投资人用的小工具：先算清楚，再去谈。', en: 'Practical calculators for cross-border real estate professionals and investors.' }}
    >
      <List />
    </ToolShell>
  );
}

function List() {
  const { lang } = useLang();
  return (
    <div className={t.toolGrid}>
      {TOOLS_LIST.map((x) => (
        <Link key={x.href} href={x.href} className={`${s.card} ${t.toolCard}`}>
          <span className={t.tag}>{L(lang, x.tag.zh, x.tag.en)}</span>
          <span className={t.toolName}>{L(lang, x.zh, x.en)}</span>
          <span className={s.muted}>{L(lang, x.dz, x.de)}</span>
          <span className={t.toolGo}>{L(lang, '打开 →', 'Open →')}</span>
        </Link>
      ))}
    </div>
  );
}
