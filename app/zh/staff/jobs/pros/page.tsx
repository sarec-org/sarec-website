'use client';
/**
 * 后台「接活人核验」：待核验 / 已通过 / 退回 / 下架。
 * 加州承包商牌照自动对照 CSLB 官方名单（显示结果和日期，可"再查一次"）；其余资质每人一键打开官方查询页 + 核验清单，
 * 工作人员手点通过（可只勾部分工种）/ 退回（带原因）/ 下架（带原因）。
 */
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { Msg, StaffGate } from '@/components/crm/staff/StaffGate';
import { api, fmtDate, fmtDateTime } from '@/components/crm/client';

type LicState = {
  state?: string; checkedAt?: string; found?: boolean; active?: boolean; problems?: string[]; status?: string | null; expires?: string | null; classes?: string[];
  businessName?: string | null; workersComp?: { type: string; expires: string | null; suspended: boolean } | null; bond?: { company: string; cancelled: boolean } | null;
  coveredTrades?: string[]; uncoveredTrades?: string[];
} | null;
type Pro = {
  id: string; contactName: string | null; phone: string | null; name: string; role: string; roleLabel: string; status: string; statusLabel: string; needsReview: boolean;
  trades: { key: string; name: string; licType: string | null; verified: boolean }[]; cities: string[]; licenseNo: string | null; licenseState: LicState;
  licenseExpiresOn: string | null; businessRegUrl: string | null; insuranceUrl: string | null; licenseDocUrl: string | null; intro: string | null; photos: string[];
  returnReason: string | null; removedReason: string | null; listed: boolean; isPaidMember?: boolean; verifiedAt: string | null; nextReviewAt: string | null; createdAt: string;
  officialUrls: { agency: string; url: string }[]; checklist: string[]; cslbDetailUrl: string | null;
  proxy?: boolean; proxyBy?: string | null; selfConfirmed?: boolean; businessRegNo?: string | null;
};
const TABS = [['pending', '待核验'], ['verified', '已通过'], ['returned', '退回'], ['removed', '下架']] as const;
const RETURN_REASONS = ['牌照号查不到', '牌照已过期或被停', '牌照类别和所选工种对不上', '名字和牌照登记的不一致', '缺营业登记或责任保险', '照片看不清，请重拍'];
const REMOVE_REASONS = ['有投诉，核实属实', '执照过期或被停', '资料不真实', '超出执照范围接活'];

export default function StaffJobsPros() {
  return (
    <StaffGate title="接活人核验" role="ops" wide>
      {() => <List />}
    </StaffGate>
  );
}

/** 「今天」里的链接带 ?status=&id=<接活人 id>：直接定位到这一个人（不在这一栏就到别的栏找一次） */
function linkParams(): { status: string | null; id: string | null } {
  if (typeof window === 'undefined') return { status: null, id: null };
  const sp = new URLSearchParams(window.location.search);
  const st = sp.get('status');
  return { status: st && TABS.some(([k]) => k === st) ? st : null, id: sp.get('id') };
}

function List() {
  const [tab, setTab] = useState<string>(() => linkParams().status ?? 'pending');
  const [focus] = useState<string | null>(() => linkParams().id);
  const [looked, setLooked] = useState(false);
  const [rows, setRows] = useState<Pro[] | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  // 指令 102：「待核验」标签上的红数字（含核验后又改了资料的）
  const [pendingN, setPendingN] = useState(0);
  useEffect(() => { api<{ pros: number }>('/api/v1/workbench/jobs/counts').then((r) => { if (r.ok) setPendingN(r.data.pros); }); }, [rows]);
  const load = useCallback(async () => {
    const r = await api<{ items: Pro[] }>(`/api/v1/workbench/jobs/pros?status=${tab}`);
    if (r.ok) setRows(r.data.items); else setMsg({ ok: false, text: r.message });
  }, [tab]);
  useEffect(() => { setRows(null); load(); }, [load]);
  useEffect(() => {
    if (!focus || !rows) return;
    if (rows.some((p) => p.id === focus)) {
      document.getElementById(`pro-${focus}`)?.scrollIntoView({ block: 'start' });
      window.scrollBy(0, -120); // 顶栏是固定的，别把名字挡住
      return;
    }
    if (looked) return;
    setLooked(true);
    (async () => {
      for (const [k] of TABS) {
        if (k === tab) continue;
        const r = await api<{ items: Pro[] }>(`/api/v1/workbench/jobs/pros?status=${k}`);
        if (r.ok && r.data.items.some((p) => p.id === focus)) return setTab(k);
      }
    })();
  }, [rows, focus]); // eslint-disable-line react-hooks/exhaustive-deps
  async function verify(id: string, body: Record<string, unknown>, okText: string) {
    const r = await api(`/api/v1/workbench/jobs/pros/${id}/verify`, { body });
    if (!r.ok) { setMsg({ ok: false, text: r.message }); return; }
    setMsg({ ok: true, text: okText });
    load();
  }
  return (
    <>
      <p className={styles.small}>加州承包商牌照自动对照 CSLB 官方名单（状态、类别、工伤保险、保证金），结果和日期写在每人卡片上；其余资质点“打开官方查询页”，照清单逐条对。每 90 天自动复核，执照过期或被停会自动下架并通知本人。结果会通知本人。</p>
      <div className={styles.tabs}>
        {TABS.map(([k, l]) => <button key={k} className={`${styles.tab} ${tab === k ? styles.tabOn : ''}`} onClick={() => setTab(k)}>{l}{k === 'pending' && pendingN > 0 ? <span className={styles.badge} style={{ marginLeft: 6, background: "#d64545", borderColor: "#d64545", color: "#fff", fontWeight: 700 }}>{pendingN}</span> : null}</button>)}
      </div>
      <Msg m={msg} />
      {!rows && <p className={styles.muted}>正在加载…</p>}
      {rows && rows.length === 0 && <p className={styles.muted}>{tab === 'pending' ? '没有等着核验的人。' : '这一栏还没有人。'}</p>}
      {rows?.map((p) => (
        <div key={p.id} id={`pro-${p.id}`} style={focus === p.id ? { outline: '2px solid var(--gold)', borderRadius: 8 } : undefined}>
          <ProRow p={p} verify={verify} />
        </div>
      ))}
    </>
  );
}

function Cslb({ s }: { s: LicState }) {
  if (!s) return null;
  if (s.state === 'queued') return <div className={styles.notice} style={{ margin: '0.5rem 0' }}>CSLB 自动查：已排队，几分钟内出结果（刷新本页看）。</div>;
  if (s.state !== 'done') return null;
  return (
    <div className={s.active ? styles.success : styles.error} style={{ margin: '0.5rem 0' }}>
      <b>CSLB 自动查（{s.checkedAt ? fmtDateTime(s.checkedAt) : ''}）：{s.active ? '有效' : '有问题'}</b>
      {s.found ? (
        <div className={styles.small} style={{ color: 'inherit' }}>
          {s.businessName ? `登记名称 ${s.businessName} · ` : ''}状态 {s.status ?? '—'} · 到期 {s.expires ?? '—'} · 类别 {(s.classes ?? []).join(', ') || '—'}
          {s.workersComp ? ` · 工伤保险 ${s.workersComp.suspended ? '无效' : s.workersComp.type || '有'}${s.workersComp.expires ? `（到 ${s.workersComp.expires}）` : ''}` : ''}
          {s.bond ? ` · 保证金 ${s.bond.cancelled || !s.bond.company ? '无效' : s.bond.company}` : ''}
        </div>
      ) : null}
      {(s.problems ?? []).length > 0 && <div className={styles.small} style={{ color: 'inherit' }}>问题：{s.problems!.join('；')}</div>}
      {(s.uncoveredTrades ?? []).length > 0 && <div className={styles.small} style={{ color: 'inherit' }}>牌照类别不覆盖：{s.uncoveredTrades!.join('、')}</div>}
    </div>
  );
}

function ProRow({ p, verify }: { p: Pro; verify: (id: string, b: Record<string, unknown>, ok: string) => void }) {
  const [mode, setMode] = useState<'' | 'return' | 'remove'>('');
  const [reason, setReason] = useState('');
  const [checked, setChecked] = useState<string[]>([]);
  const covered = p.licenseState?.coveredTrades;
  const [pick, setPick] = useState<string[]>(p.trades.filter((t) => t.licType !== 'A' || !covered || covered.includes(t.key)).map((t) => t.key));
  const links = [...(p.cslbDetailUrl ? [{ agency: 'CSLB 牌照详情', url: p.cslbDetailUrl }] : []), ...p.officialUrls.filter((l) => l.url !== p.cslbDetailUrl)];
  const docs = [['营业登记', p.businessRegUrl], ['责任保险', p.insuranceUrl], ['执照照片', p.licenseDocUrl]].filter(([, u]) => u) as [string, string][];
  const canApprove = p.status === 'pending' || p.status === 'returned' || p.needsReview;
  return (
    <div className={styles.card}>
      <div>
        <b>{p.name}</b> · {p.roleLabel} <span className={styles.badge}>{p.statusLabel}</span>
        {p.needsReview && <span className={`${styles.badge} ${styles.badgeRed}`}>改了资料，待再看</span>}
        {p.isPaidMember && <span className={`${styles.badge} ${styles.badgeGreen}`}>缴费会员</span>}
        {p.listed && <span className={`${styles.badge} ${styles.badgeGreen}`}>在列表上</span>}
        {p.proxy && <span className={`${styles.badge} ${styles.badgeMuted}`}>商会代登记{p.selfConfirmed ? ' · 本人已确认' : ' · 本人未确认'}</span>}
      </div>
      <div className={styles.small}>{p.contactName && p.contactName !== p.name ? `${p.contactName} · ` : ''}{p.phone ?? '没有手机号'} · 城市：{p.cities.join('、') || '—'} · 登记 {fmtDateTime(p.createdAt)}{p.verifiedAt ? ` · 通过 ${fmtDate(p.verifiedAt)}` : ''}{p.nextReviewAt ? ` · 下次复核 ${fmtDate(p.nextReviewAt)}` : ''}</div>
      {p.licenseNo && <div className={styles.small}>牌照 / 执照号 <span className={styles.mono}>{p.licenseNo}</span>{p.licenseExpiresOn ? ` · 到期 ${p.licenseExpiresOn}` : ''}</div>}
      {p.businessRegNo && <div className={styles.small}>营业登记号 <span className={styles.mono}>{p.businessRegNo}</span>（代登记填的号码，照号码到官方查询页核对）</div>}
      {p.intro && <div className={styles.small}>介绍：{p.intro}</div>}
      <Cslb s={p.licenseState} />
      {p.returnReason && <div className={styles.small}>退回原因：{p.returnReason}</div>}
      {p.removedReason && <div className={styles.small}>下架原因：{p.removedReason}</div>}
      {(docs.length > 0 || p.photos.length > 0) && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '0.4rem 0' }}>
          {docs.map(([l, u]) => <a key={l} className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSmall}`} href={u} target="_blank" rel="noreferrer">看{l} ↗</a>)}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {p.photos.slice(0, 9).map((u) => <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 4 }} /></a>)}
        </div>
      )}
      {links.length > 0 && (
        <div className={styles.btnRow} style={{ margin: '0.5rem 0' }}>
          {links.map((l) => <a key={l.url} className={`${styles.btn} ${styles.btnGhost}`} href={l.url} target="_blank" rel="noreferrer">打开官方查询页：{l.agency || '查询'} ↗</a>)}
          {p.licenseNo && p.trades.some((t) => t.licType === 'A') && <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => verify(p.id, { action: 'check' }, `已让系统再查一次 ${p.name} 的 CSLB 牌照，几分钟后刷新看结果`)}>CSLB 再查一次</button>}
        </div>
      )}
      {p.checklist.length > 0 && canApprove && (
        <div style={{ margin: '0.4rem 0' }}>
          <p className={styles.small} style={{ margin: 0 }}>核验清单（{checked.length}/{p.checklist.length}，帮自己对，勾不勾都能点「通过」）：</p>
          {p.checklist.map((c) => (
            <label key={c} style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 36 }}>
              <input type="checkbox" checked={checked.includes(c)} onChange={(e) => setChecked(e.target.checked ? [...checked, c] : checked.filter((x) => x !== c))} />
              {c}
            </label>
          ))}
        </div>
      )}
      <div style={{ margin: '0.4rem 0' }}>
        <p className={styles.small} style={{ margin: 0 }}>工种（{canApprove ? '勾上核验通过的' : '已通过的打勾'}）：</p>
        {p.trades.map((t) => (
          <label key={t.key} style={{ display: 'inline-flex', gap: 6, alignItems: 'center', minHeight: 36, marginRight: 14 }}>
            <input type="checkbox" disabled={!canApprove} checked={canApprove ? pick.includes(t.key) : t.verified} onChange={(e) => setPick(e.target.checked ? [...pick, t.key] : pick.filter((x) => x !== t.key))} />
            {t.name}<span className={styles.small}>（{t.licType === 'A' ? '承包商牌照' : t.licType === 'B' ? '州执照' : '营业登记'}）</span>
          </label>
        ))}
      </div>
      {mode ? (
        <div style={{ marginTop: '0.5rem' }}>
          <p className={styles.small} style={{ margin: '0 0 0.3rem' }}>{mode === 'return' ? '不通过的原因（退回给本人，让他改好再交）' : '下架原因（会告诉本人）'}：</p>
          <div className={styles.chips} style={{ marginBottom: '0.5rem' }}>
            {(mode === 'return' ? RETURN_REASONS : REMOVE_REASONS).map((x) => (
              <button key={x} type="button" className={`${styles.chip} ${reason === x ? styles.chipOn : ''}`} onClick={() => setReason(x)}>{x}</button>
            ))}
          </div>
          <div className={styles.inputRow}>
            <input className={styles.input} placeholder="也可以自己写" value={reason} onChange={(e) => setReason(e.target.value)} />
            <button className={`${styles.btn} ${styles.btnDanger}`} disabled={!reason.trim()} onClick={() => verify(p.id, { action: mode, reason: reason.trim() }, mode === 'return' ? `${p.name} 没通过，已退回，原因已告诉本人` : `已下架 ${p.name}`)}>{mode === 'return' ? '确认不通过' : '确认下架'}</button>
            <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => { setMode(''); setReason(''); }}>取消</button>
          </div>
        </div>
      ) : (
        <div className={styles.btnRow} style={{ marginTop: '0.5rem' }}>
          {canApprove && (
            // 指令 102：「通过」一下就生效（核验清单是帮自己对的，勾不勾都能点）；只通过部分工种就先去掉不通过的勾
            <button className={styles.btn} disabled={pick.length === 0} onClick={() => verify(p.id, { action: 'approve', trades: pick }, `${p.name} 核验通过（${pick.length} 个工种），本人会收到通知`)}>
              {pick.length === 0 ? '先勾通过的工种' : pick.length < p.trades.length ? `通过（${pick.length} 个工种）` : '通过'}
            </button>
          )}
          {(p.status === 'pending' || p.needsReview) && <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => setMode('return')}>不通过</button>}
          {p.status !== 'removed' && <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => setMode('remove')}>下架</button>}
          {p.status === 'removed' && <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => verify(p.id, { action: 'approve', trades: p.trades.filter((t) => t.verified).map((t) => t.key).length ? p.trades.filter((t) => t.verified).map((t) => t.key) : p.trades.map((t) => t.key) }, `${p.name} 已恢复（核验通过）`)}>恢复上架</button>}
        </div>
      )}
    </div>
  );
}
