'use client';
/** 1.4 · 1031 换房税务速算（/zh/tools/1031） */
import { useMemo } from 'react';
import { useDraft } from '@/components/crm/client';
import { EX1031_DEFAULTS, STATE_PRESETS, calc1031, clean1031Input, type Ex1031Input, type StateId } from '@/lib/tools/exchange1031';
import { usd } from '@/lib/tools/mortgage';
import { L, NumField, ToolShell, useLang } from './ToolShell';
import { SavePanel } from './SavePanel';
import s from '@/components/crm/crm.module.css';
import t from './tools.module.css';

export function Exchange1031Page() {
  return (
    <ToolShell
      eyebrow={{ zh: 'TOOLS · 1031 换房', en: 'TOOLS · 1031 EXCHANGE' }}
      title={{ zh: '1031 换房税务速算', en: '1031 Exchange Tax Estimator' }}
      notice={{ zh: '粗算，以会计师为准。', en: 'Rough estimate only. Your CPA has the final word.' }}
      lead={{
        zh: '输入卖出价、成本、折旧和所在州，粗算直接卖出要交多少税，以及做 1031 换房能递延多少。',
        en: 'Enter sale price, basis, depreciation and state to estimate the tax on an outright sale and how much a 1031 exchange could defer.'
      }}
    >
      <Body />
    </ToolShell>
  );
}

function Body() {
  const { lang } = useLang();
  const [inp, setInp, reset] = useDraft<Ex1031Input>('tools:1031', EX1031_DEFAULTS);
  const clean = clean1031Input(inp);
  const r = useMemo(() => calc1031(inp), [inp]);
  const set = (k: keyof Ex1031Input) => (n: number) => setInp((p) => ({ ...p, [k]: n }));
  const setState = (id: StateId) => {
    const p = STATE_PRESETS.find((x) => x.id === id)!;
    setInp((x) => ({ ...x, state: id, stateRatePct: id === 'CUSTOM' ? x.stateRatePct : p.rate }));
  };

  return (
    <div className={t.grid}>
      <div className={s.card}>
        <h2 className={s.h2} style={{ marginTop: 0 }}>{L(lang, '卖出的房子', 'Property sold')}</h2>
        <div className={t.formGrid}>
          <NumField label={L(lang, '卖出价', 'Sale price')} prefix="$" value={inp.salePrice} onChange={set('salePrice')} />
          <NumField label={L(lang, '卖出费用（佣金、过户等）', 'Selling costs')} suffix="%" value={inp.sellingCostPct} onChange={set('sellingCostPct')} hint={usd(clean.salePrice - r.netSale)} />
          <NumField label={L(lang, '购入成本（含改良）', 'Cost basis (incl. improvements)')} prefix="$" value={inp.costBasis} onChange={set('costBasis')} />
          <NumField label={L(lang, '累计已提折旧', 'Accumulated depreciation')} prefix="$" value={inp.depreciation} onChange={set('depreciation')} />
        </div>
        <h2 className={s.h2}>{L(lang, '换入的房子', 'Replacement property')}</h2>
        <div className={t.formGrid}>
          <NumField label={L(lang, '新房价格', 'Replacement price')} prefix="$" value={inp.replacementPrice} onChange={set('replacementPrice')} />
          <NumField label={L(lang, '换房时取出的现金', 'Cash taken out')} prefix="$" value={inp.cashOut} onChange={set('cashOut')} />
        </div>
        <h2 className={s.h2}>{L(lang, '税率', 'Tax rates')}</h2>
        <label className={s.field}>
          <span className={s.label}>{L(lang, '联邦长期资本利得税率', 'Federal long-term capital gains rate')}</span>
          <select className={s.select} value={clean.fedRatePct} onChange={(e) => set('fedRatePct')(Number(e.target.value))}>
            <option value={20}>20%</option>
            <option value={15}>15%</option>
            <option value={0}>0%</option>
          </select>
        </label>
        <label className={s.field} style={{ flexDirection: 'row', alignItems: 'center', gap: '0.6rem' }}>
          <input type="checkbox" checked={clean.niit} onChange={(e) => setInp((p) => ({ ...p, niit: e.target.checked }))} style={{ width: 22, height: 22 }} />
          <span className={s.label}>{L(lang, '计入 3.8% 净投资收入税（NIIT）', 'Include 3.8% Net Investment Income Tax')}</span>
        </label>
        <label className={s.field}>
          <span className={s.label}>{L(lang, '所在州', 'State')}</span>
          <select className={s.select} value={clean.state} onChange={(e) => setState(e.target.value as StateId)}>
            {STATE_PRESETS.map((p) => <option key={p.id} value={p.id}>{L(lang, p.zh, p.en)}</option>)}
          </select>
        </label>
        <NumField label={L(lang, '州税率', 'State tax rate')} suffix="%" value={inp.stateRatePct} onChange={(n) => setInp((p) => ({ ...p, stateRatePct: n, state: 'CUSTOM' }))} />
        <button type="button" className={`${s.btn} ${s.btnQuiet}`} onClick={() => { reset(); setInp(EX1031_DEFAULTS); }}>{L(lang, '恢复默认值', 'Reset to defaults')}</button>
      </div>

      <div>
        <div className={t.big}>
          <div className={t.stat}><p className={t.statLabel}>{L(lang, '直接卖出粗算税额', 'Tax if sold outright')}</p><p className={t.statValue}>{usd(r.taxIfSold.total)}</p></div>
          <div className={t.stat}><p className={t.statLabel}>{L(lang, '换房当年要交的税', 'Tax due now (exchange)')}</p><p className={t.statValue}>{usd(r.taxNow)}</p></div>
          <div className={t.stat}><p className={t.statLabel}>{L(lang, '递延税额', 'Tax deferred')}</p><p className={t.statValue}>{usd(r.deferred)}</p></div>
        </div>
        <div className={s.card}>
          <table className={t.rows}>
            <tbody>
              <tr><td>{L(lang, '卖出净额', 'Net sale proceeds')}</td><td>{usd(r.netSale)}</td></tr>
              <tr><td>{L(lang, '调整后成本（成本 − 折旧）', 'Adjusted basis (cost − depreciation)')}</td><td>{usd(r.adjustedBasis)}</td></tr>
              <tr><td>{L(lang, '　其中折旧回收', '  of which depreciation recapture')}</td><td>{usd(r.recapture)}</td></tr>
              <tr><td>{L(lang, '　其中资本利得', '  of which capital gain')}</td><td>{usd(r.capitalGain)}</td></tr>
              <tr><td>{L(lang, '应税利得合计', 'Total taxable gain')}</td><td>{usd(r.gain)}</td></tr>
            </tbody>
          </table>
          <h3 className={s.label} style={{ margin: '1rem 0 0.25rem' }}>{L(lang, '直接卖出的税（粗算）', 'Tax on outright sale (estimate)')}</h3>
          <table className={t.rows}>
            <tbody>
              <tr><td>{L(lang, '折旧回收税（25%）', 'Recapture (25%)')}</td><td>{usd(r.taxIfSold.recapture)}</td></tr>
              <tr><td>{L(lang, `联邦资本利得税（${clean.fedRatePct}%）`, `Federal capital gains (${clean.fedRatePct}%)`)}</td><td>{usd(r.taxIfSold.federal)}</td></tr>
              <tr><td>NIIT（3.8%）</td><td>{usd(r.taxIfSold.niit)}</td></tr>
              <tr><td>{L(lang, `州税（${clean.stateRatePct}%）`, `State (${clean.stateRatePct}%)`)}</td><td>{usd(r.taxIfSold.state)}</td></tr>
              <tr><td>{L(lang, '合计', 'Total')}</td><td>{usd(r.taxIfSold.total)}</td></tr>
            </tbody>
          </table>
          <h3 className={s.label} style={{ margin: '1rem 0 0.25rem' }}>{L(lang, '做 1031 换房', 'With a 1031 exchange')}</h3>
          <table className={t.rows}>
            <tbody>
              <tr><td>{L(lang, '补价（boot，当年计税）', 'Boot (taxed now)')}</td><td>{usd(r.boot)}</td></tr>
              <tr><td>{L(lang, '递延的利得', 'Gain deferred')}</td><td>{usd(r.deferredGain)}</td></tr>
              <tr><td>{L(lang, '新房结转成本（粗算）', 'Carryover basis in new property')}</td><td>{usd(r.newBasis)}</td></tr>
              <tr><td>{L(lang, '递延税额', 'Tax deferred')}</td><td>{usd(r.deferred)}</td></tr>
            </tbody>
          </table>
          <p className={s.small} style={{ marginBottom: 0 }}>
            {L(
              lang,
              '简化口径：新房价格低于卖出净额的差额、或取出的现金，按补价当年计税；未计债务减免、AMT、各州特殊规则和个人收入档位。1031 有 45 天指定、180 天完成等硬性要求，需通过合格中介办理。粗算，以会计师为准。',
              'Simplified: any shortfall of replacement price below net proceeds, or cash taken out, is treated as boot and taxed now. Excludes debt relief, AMT, state-specific rules and individual brackets. A 1031 requires a qualified intermediary and strict 45/180-day deadlines. Rough estimate only; consult your CPA.'
            )}
          </p>
        </div>
        <SavePanel
          tool="1031"
          lang={lang}
          inputs={clean}
          defaultTitle={L(lang, `卖 ${usd(clean.salePrice)} → 换 ${usd(clean.replacementPrice)}`, `Sell ${usd(clean.salePrice)} → buy ${usd(clean.replacementPrice)}`)}
          onLoad={(i) => setInp({ ...EX1031_DEFAULTS, ...i })}
          share={() => ({
            title: L(lang, '1031 换房税务粗算（以会计师为准）', '1031 exchange tax estimate (confirm with CPA)'),
            path: '/zh/tools/1031',
            highlight: [L(lang, '递延税额（粗算）', 'Tax deferred (est.)'), usd(r.deferred)],
            lines: [
              [L(lang, '卖出价', 'Sale price'), usd(clean.salePrice)],
              [L(lang, '调整后成本', 'Adjusted basis'), usd(r.adjustedBasis)],
              [L(lang, '应税利得', 'Taxable gain'), usd(r.gain)],
              [L(lang, '直接卖出税额', 'Tax if sold'), usd(r.taxIfSold.total)],
              [L(lang, '新房价格', 'Replacement price'), usd(clean.replacementPrice)],
              [L(lang, '换房当年要交的税', 'Tax due now'), usd(r.taxNow)],
            ]
          })}
        />
      </div>
    </div>
  );
}
