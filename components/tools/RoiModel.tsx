'use client';
/** 1.4 · 投资回报模型模板（/zh/tools/roi-model）：所有人看介绍，会员可下载 Excel */
import { useEffect, useState } from 'react';
import { api } from '@/components/crm/client';
import { L, ToolShell, useLang } from './ToolShell';
import s from '@/components/crm/crm.module.css';
import t from './tools.module.css';

type MeLite = { member: { isMember: boolean; expired: boolean } };

export function RoiModelPage() {
  return (
    <ToolShell
      eyebrow={{ zh: 'TOOLS · 会员模板', en: 'TOOLS · MEMBER TEMPLATE' }}
      title={{ zh: '投资回报模型（Excel 模板）', en: 'Investment Return Model (Excel)' }}
      lead={{
        zh: '一份可以直接改数的 Excel：输入房价、贷款、租金和费用假设，自动算出 10 年现金流、IRR、Cap Rate、现金回报率和偿债覆盖率。',
        en: 'An editable Excel workbook: enter price, loan, rent and expense assumptions to get a 10-year cash flow, IRR, cap rate, cash-on-cash and DSCR.'
      }}
    >
      <Body />
    </ToolShell>
  );
}

function Body() {
  const { lang } = useLang();
  const [state, setState] = useState<'loading' | 'guest' | 'nonmember' | 'expired' | 'member'>('loading');
  useEffect(() => {
    api<MeLite>('/api/v1/me').then((r) => {
      if (!r.ok) return setState('guest');
      setState(r.data.member?.isMember ? 'member' : r.data.member?.expired ? 'expired' : 'nonmember');
    });
  }, []);
  const next = '/zh/tools/roi-model';

  const sheets: [string, string, string, string][] = [
    ['输入', 'Inputs', '房价、过户费用、装修、首付、利率、年限、租金、空置率、房产税、保险、HOA、维修、物业管理、租金 / 费用增长、增值率、卖出费用', 'Price, closing costs, renovation, down payment, rate, term, rent, vacancy, property tax, insurance, HOA, maintenance, management, rent/expense growth, appreciation, selling costs'],
    ['现金流', 'Cash Flow', '第 0–10 年逐年：有效总收入、营运费用、NOI、还款、税前现金流、贷款余额、房产价值、第 10 年卖出净额', 'Years 0–10: effective gross income, operating expenses, NOI, debt service, pre-tax cash flow, loan balance, value, year-10 net sale proceeds'],
    ['关键指标', 'Key metrics', 'Cap Rate、现金回报率、DSCR、10 年 IRR（税前）、权益倍数、10 年累计现金流', 'Cap rate, cash-on-cash, DSCR, 10-year pre-tax IRR, equity multiple, cumulative cash flow'],
    ['说明', 'Guide', '怎么用、每个指标的口径、哪些没算进去（所得税、折旧抵税、资本利得税、1031）', 'How to use, metric definitions and what is excluded (income tax, depreciation, capital gains, 1031)']
  ];

  return (
    <div className={t.grid}>
      <div className={s.card}>
        <h2 className={s.h2} style={{ marginTop: 0 }}>{L(lang, '模板里有什么', 'What’s inside')}</h2>
        <table className={t.rows}>
          <tbody>
            {sheets.map(([zh, en, dz, de]) => (
              <tr key={en}>
                <td style={{ verticalAlign: 'top', paddingRight: '1rem', whiteSpace: 'nowrap', color: 'var(--gold)' }}>{L(lang, zh, en)}</td>
                <td style={{ textAlign: 'left', fontWeight: 400, color: 'var(--ivory-warm)' }}>{L(lang, dz, de)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className={s.small} style={{ marginBottom: 0 }}>
          {L(lang, '全部是 Excel 公式，只改蓝色格子即可重算；Excel、WPS、Google 表格、Numbers 都能打开。', 'All Excel formulas — edit the blue cells to recalculate. Opens in Excel, WPS, Google Sheets and Numbers.')}
        </p>
      </div>

      <div className={s.card}>
        <h2 className={s.h2} style={{ marginTop: 0 }}>{L(lang, '下载', 'Download')}</h2>
        {state === 'loading' && <p className={s.muted}>…</p>}
        {state === 'member' && (
          <>
            <p className={s.muted}>{L(lang, '会员专享，可直接下载。', 'Included with your membership.')}</p>
            <a className={`${s.btn} ${s.btnBlock}`} href="/api/v1/tools/download/roi-model">{L(lang, '下载 Excel 模板', 'Download Excel template')}</a>
          </>
        )}
        {state === 'guest' && (
          <>
            <p className={s.muted}>{L(lang, '这个模板是会员专享。会员请先登录。', 'This template is for members. Members, please sign in.')}</p>
            <div className={s.btnRow}>
              <a className={s.btn} href={`/zh/signin?next=${encodeURIComponent(next)}`}>{L(lang, '会员登录', 'Member sign-in')}</a>
              <a className={`${s.btn} ${s.btnGhost}`} href="/zh/membership">{L(lang, '了解入会', 'About membership')}</a>
            </div>
          </>
        )}
        {(state === 'nonmember' || state === 'expired') && (
          <>
            <p className={s.muted}>
              {state === 'expired'
                ? L(lang, '您的会员已到期，续费后即可下载。', 'Your membership has expired. Renew to download.')
                : L(lang, '这个模板是会员专享，入会后即可下载。', 'This template is for members. Join to download.')}
            </p>
            <a className={`${s.btn} ${s.btnBlock}`} href="/zh/membership">{L(lang, state === 'expired' ? '去续费' : '了解入会', state === 'expired' ? 'Renew' : 'About membership')}</a>
          </>
        )}
        <p className={s.small} style={{ marginBottom: 0 }}>
          {L(lang, '不想下载也可以先用在线计算器：', 'Or try the free online calculator: ')}
          <a href="/zh/tools/mortgage" style={{ color: 'var(--gold)' }}>{L(lang, '月供与现金流计算器', 'Mortgage & cash flow')}</a>
        </p>
      </div>
    </div>
  );
}
