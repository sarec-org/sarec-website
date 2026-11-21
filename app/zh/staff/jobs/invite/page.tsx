'use client';
/**
 * 后台「邀请登记接活」：按行业标签筛选现有会员 → 勾人 → 先预览（发给谁、发什么）→ 再确认。
 * 沿用 1.5.0 群发的做法：默认演练（只记"本来会发给谁"，不真的发）。真发要管理员把"演练"关掉，并且只有正式站、两个开关都开着才会真的发出；
 * 测试站只会发给测试身份（名字以「验收」开头的测试账号），其他人一律不发。同一人 30 天内只邀请一次。
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { Msg, StaffGate, can, type StaffInfo } from '@/components/crm/staff/StaffGate';
import { api, fmtDate } from '@/components/crm/client';

type C = { id: string; name: string; roleCategory: string | null; roleSub: string | null; registered: boolean; invitedAt: string | null };
const PREVIEW = 'SAREC：商会新开了「找工人·接活」。登记一次，有对口的活儿会第一时间通知你：sinoamericanrec.org/zh/jobs/register';

export default function StaffJobsInvite() {
  return (
    <StaffGate title="邀请会员登记接活" role="ops" wide>
      {(me) => <Invite me={me} />}
    </StaffGate>
  );
}

function Invite({ me }: { me: StaffInfo }) {
  const [all, setAll] = useState<C[] | null>(null);
  const [cat, setCat] = useState('');
  const [sub, setSub] = useState('');
  const [rows, setRows] = useState<C[] | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [step, setStep] = useState<'pick' | 'preview'>('pick');
  const [dry, setDry] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const admin = can(me, 'admin');

  useEffect(() => { api<{ items: C[] }>('/api/v1/workbench/jobs/invite').then((r) => (r.ok ? setAll(r.data.items) : setMsg({ ok: false, text: r.message }))); }, []);
  const load = useCallback(async () => {
    if (!cat) { setRows(null); return; }
    const q = new URLSearchParams({ roleCategory: cat, ...(sub ? { roleSub: sub } : {}) });
    const r = await api<{ items: C[] }>(`/api/v1/workbench/jobs/invite?${q}`);
    if (!r.ok) return setMsg({ ok: false, text: r.message });
    setRows(r.data.items);
    setPicked(r.data.items.filter((x) => !x.registered && !(x.invitedAt && Date.now() - new Date(x.invitedAt).getTime() < 30 * 864e5)).map((x) => x.id));
    setStep('pick');
  }, [cat, sub]);
  useEffect(() => { load(); }, [load]);

  const cats = useMemo(() => Array.from(new Set((all ?? []).map((x) => x.roleCategory).filter((x): x is string => !!x))).sort(), [all]);
  const subs = useMemo(() => Array.from(new Set((all ?? []).filter((x) => x.roleCategory === cat).map((x) => x.roleSub).filter((x): x is string => !!x))).sort(), [all, cat]);
  const chosen = (rows ?? []).filter((x) => picked.includes(x.id));

  async function send() {
    if (dry) {
      // 演练不调发送接口（服务器的邀请接口现在一调就走发送流程），只在页面上列出本来会发给谁
      const skip = chosen.filter((x) => x.invitedAt && Date.now() - new Date(x.invitedAt).getTime() < 30 * 864e5);
      setMsg({ ok: true, text: `演练完成：本来会发给 ${chosen.length - skip.length} 人（${chosen.filter((x) => !skip.includes(x)).slice(0, 20).map((x) => x.name).join('、')}${chosen.length - skip.length > 20 ? ' 等' : ''}）；30 天内邀请过的 ${skip.length} 人跳过。没有真的发出任何消息。` });
      setStep('pick');
      return;
    }
    setBusy(true);
    const r = await api<{ sent: number; blocked: number; failed: number; skipped: number; dryRun?: boolean }>('/api/v1/workbench/jobs/invite', { body: { contactIds: picked } });
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, text: r.message });
    const x = r.data;
    setMsg({ ok: true, text: x.dryRun ? `演练完成：本来会发给 ${picked.length - x.skipped} 人，没有真的发出。` : `发出 ${x.sent} 条；没发（测试站非测试身份 / 开关没开）${x.blocked} 条；失败 ${x.failed} 条；30 天内邀请过跳过 ${x.skipped} 人。` });
    setStep('pick');
    load();
  }

  if (!all) return msg ? <Msg m={msg} /> : <p className={styles.muted}>正在加载…</p>;
  return (
    <>
      <div className={styles.notice}>
        现在是<b>{dry ? '演练' : '真发'}</b>：{dry ? '确认后只列出"本来会发给谁"，不会真的发出短信或微信通知。' : '只有正式站、两个栏目开关都开着才会真的发出；测试站只发给名字以「验收」开头的测试账号。'}
        {admin && <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSmall}`} style={{ marginLeft: 8 }} onClick={() => setDry(!dry)}>{dry ? '改成真发（管理员）' : '改回演练'}</button>}
      </div>
      <p className={styles.small}>第一步：按行业标签选会员。第二步：勾人、看预览。第三步：确认。已经登记接活的、30 天内邀请过的，默认不勾。</p>
      <Msg m={msg} />
      <p className={styles.label}>行业</p>
      <div className={styles.chips} style={{ marginBottom: '0.6rem' }}>
        {cats.length === 0 && <span className={styles.muted}>会员档案里还没有行业标签。</span>}
        {cats.map((c) => <button key={c} type="button" className={`${styles.chip} ${cat === c ? styles.chipOn : ''}`} onClick={() => { setCat(cat === c ? '' : c); setSub(''); }}>{c}</button>)}
      </div>
      {subs.length > 0 && (
        <>
          <p className={styles.label}>细分</p>
          <div className={styles.chips} style={{ marginBottom: '0.6rem' }}>
            <button type="button" className={`${styles.chip} ${!sub ? styles.chipOn : ''}`} onClick={() => setSub('')}>全部</button>
            {subs.map((c) => <button key={c} type="button" className={`${styles.chip} ${sub === c ? styles.chipOn : ''}`} onClick={() => setSub(c)}>{c}</button>)}
          </div>
        </>
      )}
      {!cat && <p className={styles.muted}>先选一个行业。</p>}
      {cat && !rows && <p className={styles.muted}>正在加载…</p>}
      {rows && rows.length === 0 && <p className={styles.muted}>这个行业下没有会员。</p>}
      {rows && rows.length > 0 && step === 'pick' && (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th><input type="checkbox" aria-label="全选" checked={picked.length === rows.length} onChange={(e) => setPicked(e.target.checked ? rows.map((x) => x.id) : [])} /></th><th>会员</th><th>行业</th><th>情况</th></tr></thead>
              <tbody>
                {rows.map((x) => (
                  <tr key={x.id}>
                    <td><input type="checkbox" checked={picked.includes(x.id)} onChange={(e) => setPicked(e.target.checked ? [...picked, x.id] : picked.filter((y) => y !== x.id))} /></td>
                    <td>{x.name}</td>
                    <td>{[x.roleCategory, x.roleSub].filter(Boolean).join(' · ')}</td>
                    <td>{x.registered ? '已登记接活' : x.invitedAt ? `${fmtDate(x.invitedAt)} 邀请过` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className={styles.btn} style={{ marginTop: '0.8rem' }} disabled={!picked.length} onClick={() => setStep('preview')}>预览（{picked.length} 人）</button>
        </>
      )}
      {step === 'preview' && (
        <div className={styles.card}>
          <p className={styles.cardTitle}>预览</p>
          <p>发给 <b>{chosen.length}</b> 人：{chosen.slice(0, 10).map((x) => x.name).join('、')}{chosen.length > 10 ? ` 等` : ''}</p>
          <p className={styles.small} style={{ margin: '0.4rem 0 0.2rem' }}>发的话（短信；有微信订阅的走微信通知）：</p>
          <div className={styles.notice} style={{ whiteSpace: 'pre-wrap' }}>{PREVIEW}</div>
          <p className={styles.small}>{dry ? '演练：确认后只记录，不发。' : '确认后会按上面的规则发出。'}</p>
          <div className={styles.btnRow}>
            <button className={styles.btn} disabled={busy || (!dry && !admin)} onClick={send}>{busy ? '正在处理…' : dry ? `确认（演练，${chosen.length} 人）` : `确认发送（${chosen.length} 人）`}</button>
            <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => setStep('pick')}>回去改</button>
          </div>
        </div>
      )}
    </>
  );
}
