'use client';
/** 1.4 · 月供与现金流计算器（/zh/tools/mortgage） */
import { useMemo } from 'react';
import { useDraft } from '@/components/crm/client';
import { MORTGAGE_DEFAULTS, calcMortgage, cleanMortgageInput, pct, usd, type MortgageInput } from '@/lib/tools/mortgage';
import { L, NumField, ToolShell, useLang } from './ToolShell';
import { SavePanel } from './SavePanel';
import s from '@/components/crm/crm.module.css';
import t from './tools.module.css';

export function MortgageCalcPage() {
  return (
    <ToolShell
      eyebrow={{ zh: 'TOOLS · 月供与现金流', en: 'TOOLS · MORTGAGE' }}
      title={{ zh: '月供与现金流计算器', en: 'Mortgage & Cash Flow Calculator' }}
      lead={{
        zh: '输入房价、首付、利率和租金，粗算每月供款、每月现金流和年化现金回报。',
        en: 'Enter price, down payment, rate and rent to estimate the monthly payment, monthly cash flow and cash-on-cash return.'
      }}
    >
      <MortgageBody />
    </ToolShell>
  );
}

function MortgageBody() {
  const { lang } = useLang();
  const [inp, setInp, reset] = useDraft<MortgageInput>('tools:mortgage', MORTGAGE_DEFAULTS);
  const r = useMemo(() => calcMortgage(inp), [inp]);
  const set = (k: keyof MortgageInput) => (n: number) => setInp((p) => ({ ...p, [k]: n }));
  const clean = cleanMortgageInput(inp);
  const neg = (n: number) => (n < 0 ? t.neg : '');

  return (
    <div className={t.grid}>
      <div className={s.card}>
        <h2 className={s.h2} style={{ marginTop: 0 }}>{L(lang, '房子与贷款', 'Property & loan')}</h2>
        <div className={t.formGrid}>
          <NumField label={L(lang, '房价', 'Purchase price')} prefix="$" value={inp.price} onChange={set('price')} />
          <NumField label={L(lang, '首付比例', 'Down payment')} suffix="%" value={inp.downPct} onChange={set('downPct')} hint={usd(r.downPayment)} />
          <NumField label={L(lang, '年利率', 'Interest rate')} suffix="%" value={inp.ratePct} onChange={set('ratePct')} />
          <NumField label={L(lang, '贷款年限', 'Loan term')} suffix={L(lang, '年', 'yrs')} value={inp.years} onChange={set('years')} />
          <NumField label={L(lang, '房产税率（每年）', 'Property tax (per year)')} suffix="%" value={inp.taxPct} onChange={set('taxPct')} />
          <NumField label={L(lang, '保险（每年，按房价）', 'Insurance (per year, of price)')} suffix="%" value={inp.insurancePct} onChange={set('insurancePct')} />
          <NumField label={L(lang, 'HOA（每月）', 'HOA (monthly)')} prefix="$" value={inp.hoa} onChange={set('hoa')} />
          <NumField label={L(lang, '预期租金（每月）', 'Expected rent (monthly)')} prefix="$" value={inp.rent} onChange={set('rent')} />
        </div>
        <button type="button" className={`${s.btn} ${s.btnQuiet}`} onClick={() => { reset(); setInp(MORTGAGE_DEFAULTS); }}>{L(lang, '恢复默认值', 'Reset to defaults')}</button>
      </div>

      <div>
        <div className={t.big}>
          <div className={t.stat}><p className={t.statLabel}>{L(lang, '月供（本息）', 'Monthly P&I')}</p><p className={t.statValue}>{usd(r.principalInterest)}</p></div>
          <div className={t.stat}><p className={t.statLabel}>{L(lang, '月现金流', 'Monthly cash flow')}</p><p className={`${t.statValue} ${neg(r.cashFlow)}`}>{usd(r.cashFlow)}</p></div>
          <div className={t.stat}><p className={t.statLabel}>{L(lang, '年化现金回报', 'Cash-on-cash')}</p><p className={`${t.statValue} ${neg(r.cashOnCashPct ?? 0)}`}>{pct(r.cashOnCashPct)}</p></div>
        </div>
        <div className={s.card}>
          <table className={t.rows}>
            <tbody>
              <tr><td>{L(lang, '贷款金额', 'Loan amount')}</td><td>{usd(r.loan)}</td></tr>
              <tr><td>{L(lang, '本金 + 利息', 'Principal & interest')}</td><td>{usd(r.principalInterest)}</td></tr>
              <tr><td>{L(lang, '房产税', 'Property tax')}</td><td>{usd(r.tax)}</td></tr>
              <tr><td>{L(lang, '保险', 'Insurance')}</td><td>{usd(r.insurance)}</td></tr>
              <tr><td>HOA</td><td>{usd(r.hoa)}</td></tr>
              <tr><td>{L(lang, '每月总支出', 'Total monthly cost')}</td><td>{usd(r.totalMonthly)}</td></tr>
            </tbody>
          </table>
          <table className={t.rows} style={{ marginTop: '0.75rem' }}>
            <tbody>
              <tr><td>{L(lang, '每月租金', 'Monthly rent')}</td><td>{usd(clean.rent)}</td></tr>
              <tr><td>{L(lang, '每年现金流', 'Annual cash flow')}</td><td className={neg(r.annualCashFlow)}>{usd(r.annualCashFlow)}</td></tr>
              <tr><td>{L(lang, '贷款期内总利息', 'Total interest over term')}</td><td>{usd(r.totalInterest)}</td></tr>
            </tbody>
          </table>
          <p className={s.small} style={{ marginBottom: 0 }}>
            {L(
              lang,
              '年化现金回报 = 每年现金流 ÷ 首付。粗算未计空置、维修、物业管理、过户费、PMI 和所得税，实际数字以贷款机构和会计师为准。',
              'Cash-on-cash = annual cash flow ÷ down payment. This estimate excludes vacancy, repairs, management, closing costs, PMI and income tax; confirm with your lender and CPA.'
            )}
          </p>
        </div>
        <SavePanel
          tool="mortgage"
          lang={lang}
          inputs={clean}
          defaultTitle={L(lang, `房价 ${usd(clean.price)} · 首付 ${clean.downPct}%`, `${usd(clean.price)} · ${clean.downPct}% down`)}
          onLoad={(i) => setInp({ ...MORTGAGE_DEFAULTS, ...i })}
          share={() => ({
            title: L(lang, '月供与现金流粗算', 'Mortgage & cash flow estimate'),
            highlight: [L(lang, '月现金流', 'Monthly cash flow'), usd(r.cashFlow)],
            lines: [
              [L(lang, '房价', 'Price'), usd(clean.price)],
              [L(lang, '首付', 'Down payment'), L(lang, `${usd(r.downPayment)}（${clean.downPct}%）`, `${usd(r.downPayment)} (${clean.downPct}%)`)],
              [L(lang, '利率 / 年限', 'Rate / term'), `${clean.ratePct}% / ${clean.years}${L(lang, ' 年', ' yrs')}`],
              [L(lang, '月供（本息）', 'Monthly P&I'), usd(r.principalInterest)],
              [L(lang, '每月总支出', 'Total monthly cost'), usd(r.totalMonthly)],
              [L(lang, '每月租金', 'Monthly rent'), usd(clean.rent)],
              [L(lang, '年化现金回报', 'Cash-on-cash'), pct(r.cashOnCashPct)]
            ]
          })}
        />
      </div>
    </div>
  );
}
