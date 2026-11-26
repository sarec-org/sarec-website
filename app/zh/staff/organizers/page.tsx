'use client';
/**
 * 后台「主办方」（1.6.0 活动工具开放给别的主办方）：
 * 开关（总开关、接龙模式）→ 等放行的活动（先审后发）→ 开通一个主办方（出开通码，负责人用微信扫、看完《主办方数据承诺》点开通）→
 * 主办方列表（停用 / 恢复、新开通码、记一次商会帮忙、先审后发还剩几场）→ 最近的主办方活动（下架 / 恢复、平台查看名单要写原因）→
 * 「我也要办活动」申请 → 平台查看记录。不给主办方任何后台账号密码。
 */
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { Msg, StaffGate } from '@/components/crm/staff/StaffGate';
import { api, fmtDateTime } from '@/components/crm/client';

type Member = { id: string; name: string; role: 'owner' | 'helper' };
type Org = { id: string; name: string; is_demo?: boolean; public_contact: string | null; staff_note: string | null; status: string; review_left: number; agreed_at: string | null; suspended_at: string | null; suspend_reason: string | null; helps: number; members: Member[] | null; events: number; open_code: string | null; created_at: string };
type Ev = { id: string; code: string; organizer: string; title: string; mode: string; when: string; status: string; secStatus: string | null; description: string | null; locationName: string | null; address: string | null; people: number; reviewNote: string | null; takenDownReason: string | null; createdAt: string };
type App = { id: string; org_name: string; person_name: string; phone: string | null; note: string | null; from_title: string | null; status: string; created_at: string };
type ReviewCode = { code: string; expires_at: string; created_at: string; created_by: string; note: string | null; revoked_at: string | null; uses: number; org_name: string };
type Overview = { reviewCodes?: ReviewCode[]; switches: { tool: boolean; chain: boolean; open?: boolean }; organizers: Org[]; events: Ev[]; applications: App[]; guests: number; promiseVersion: string };
type Code = { code: string; expiresAt: string; qr: string | null; qrPlain: string | null };
type LogRow = { actor: string; reason: string; created_at: string; title: string | null; organizer: string | null };

const STATUS: Record<string, string> = { review: '等放行', published: '已公开', rejected: '没放行', taken_down: '已下架', cancelled: '主办方取消了' };
const ORG_STATUS: Record<string, string> = { pending: '等负责人扫码开通', active: '使用中', suspended: '已停用' };

export default function StaffOrganizers() {
  return (
    <StaffGate title="主办方" role="ops" wide>
      {(me) => <Page admin={me.roles.includes('admin')} />}
    </StaffGate>
  );
}

function CodeBox({ c, title }: { c: Code; title: string }) {
  return (
    <div className={styles.notice}>
      <b>{title}</b>
      <p className={styles.small}>请负责人用自己的微信扫下面的码（{fmtDateTime(c.expiresAt)} 前有效，只能用一次）。扫了先看《主办方数据承诺》，点「我看完了，开通」就开通了。不给任何后台账号密码。</p>
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {c.qr && <div><img src={c.qr} alt="开通小程序码" width={200} height={200} /><div className={styles.small}>微信扫一扫</div></div>}
        {c.qrPlain && <div><img src={c.qrPlain} alt="开通码" width={160} height={160} /><div className={styles.small}>{c.qr ? '或在小程序「我的 → 工作人员绑定码 → 扫码绑定」扫这个' : '测试环境：在小程序「我的 → 工作人员绑定码 → 扫码绑定」扫这个'}</div></div>}
      </div>
      <p>开通码：<span className={styles.mono}>{c.code}</span></p>
    </div>
  );
}

function Page({ admin }: { admin: boolean }) {
  const [d, setD] = useState<Overview | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: '', publicContact: '', staffNote: '', applicationId: '' });
  const [code, setCode] = useState<{ orgId: string; c: Code } | null>(null);
  const [reason, setReason] = useState<Record<string, string>>({});
  const [view, setView] = useState<{ id: string; title: string; people: { name: string; phone: string; partySize: number; status: string; checkedIn: boolean }[] } | null>(null);
  const [log, setLog] = useState<LogRow[]>([]);
  const load = useCallback(async () => {
    const r = await api<Overview>('/api/v1/staff/organizers');
    if (!r.ok) return setMsg({ ok: false, text: r.message });
    setD(r.data);
    const l = await api<{ log: LogRow[] }>('/api/v1/staff/organizers?view=log');
    if (l.ok) setLog(l.data.log);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function post<T = { message?: string }>(b: Record<string, unknown>, okText?: string): Promise<T | null> {
    setBusy(true);
    const r = await api<T>('/api/v1/staff/organizers', { method: 'POST', body: b });
    setBusy(false);
    if (!r.ok) { setMsg({ ok: false, text: r.message }); return null; }
    setMsg({ ok: true, text: okText ?? ((r.data as { message?: string }).message || '已保存') });
    load();
    return r.data;
  }
  const why = (id: string) => (reason[id] ?? '').trim();

  if (!d) return msg ? <Msg m={msg} /> : <p className={styles.muted}>正在加载…</p>;
  const pending = d.events.filter((e) => e.status === 'review');
  const others = d.events.filter((e) => e.status !== 'review');
  return (
    <>
      <p className={styles.small}>
        经商会开通的主办方，在小程序「我的 → 我办的活动」里自己发活动、出海报、门口扫码签到、看名单和导出。他们的活动和报名人只在主办方自己那里，
        <b>不进商会的活动、客户、今天、待跟进、群发、邮件通讯、积分</b>。只通过主办方活动来过的人（「主办方的客人」，现在 {d.guests} 人）不在「客户」列表里。
        试用情况看 <Link href="/zh/staff/organizers/trial">主办方试用看板 ›</Link>
      </p>
      <Msg m={msg} />

      <div className={styles.card}>
        <h2 className={styles.h2}>开关</h2>
        {[
          { k: 'tool', name: '活动工具总开关', on: d.switches.tool, hint: d.switches.tool ? '开着：开通的主办方在「我的」里能看到「我办的活动」。万一审核不认，关掉后入口消失、主办方活动页显示"暂停使用"，不用重新传小程序。' : '关着：主办方看不到「我办的活动」，报名页显示"暂停使用"。' },
          { k: 'open', name: '主办方自动开通', on: d.switches.open !== false, hint: d.switches.open !== false ? '开着（默认）：用户点「办活动」填个名称、同意数据承诺就当场开通；发的活动过了微信内容检测直接公开（先发后审），不好的在下面一键下架、停用主办方。工作人员自动是「中美房地产商会」主办方。' : '关着 = 需审核：用户点「办活动」只能填申请，商会出开通码；新主办方前几场要在下面放行。微信审核因为"人人可发布"驳回时关掉它再提审，不用换包。' },
          { k: 'chain', name: '接龙模式', on: d.switches.chain, hint: d.switches.chain ? '开着：发活动时多一个「接龙」模板（审核员用审核码进去也能看到）。' : '关着（默认）：第一版代码里有接龙，但不给用，审核员也看不到；第二版单独提审再打开。' }
        ].map((x) => (
          <div key={x.k} className={styles.row}>
            <span><b>{x.name}</b> <span className={`${styles.badge} ${x.on ? styles.badgeGreen : styles.badgeMuted}`}>{x.on ? '开着' : '关着'}</span><br /><span className={styles.small}>{x.hint}</span></span>
            <button className={`${styles.btn} ${styles.btnSmall} ${x.on ? styles.btnQuiet : ''}`} disabled={!admin || busy}
              onClick={() => { if (window.confirm(`确定${x.on ? '关掉' : '打开'}「${x.name}」？马上生效。`)) post({ action: 'switch', key: x.k, on: !x.on }); }}>
              {!admin ? '只有管理员能改' : x.on ? '关掉' : '打开'}
            </button>
          </div>
        ))}
      </div>

      <ReviewCodes list={d.reviewCodes ?? []} busy={busy} post={post} />

      <div className={styles.card}>
        <h2 className={styles.h2}>等放行的活动（{pending.length}）</h2>
        <p className={styles.small}>机器检测说「建议复核」（或正式站检测没出结果）的，以及「主办方自动开通」关着时新主办方的前几场（默认 3 场，每个主办方可改），先在这里看一眼再公开。放行前报名页只有主办方自己看得到。</p>
        {!pending.length && <p className={styles.muted}>没有等放行的活动</p>}
        {pending.map((e) => (
          <div key={e.id} className={styles.listItem}>
            <b>{e.title}</b>（{e.organizer} · {e.mode === 'chain' ? '接龙' : '报名'}）<br />
            <span className={styles.small}>{e.when} · {e.locationName}{e.address ? ' · ' + e.address : ''} · 机器检测：{e.secStatus ?? '—'}</span>
            {e.description && <p className={styles.small} style={{ whiteSpace: 'pre-wrap' }}>{e.description}</p>}
            <div className={styles.btnRow}>
              <button className={`${styles.btn} ${styles.btnSmall}`} disabled={busy} onClick={() => post({ action: 'event', op: 'approve', id: e.id })}>放行</button>
              <input className={styles.input} style={{ maxWidth: 260 }} placeholder="不放行的原因（主办方能看到）" value={reason[e.id] ?? ''} onChange={(x) => setReason({ ...reason, [e.id]: x.target.value })} />
              <button className={`${styles.btn} ${styles.btnSmall} ${styles.btnQuiet}`} disabled={busy || !why(e.id)} onClick={() => post({ action: 'event', op: 'reject', id: e.id, reason: why(e.id) })}>不放行</button>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.card}>
        <h2 className={styles.h2}>开通一个主办方</h2>
        <div className={styles.field}><label className={styles.label}>主办方名称（报名页、海报上显示）</label><input className={styles.input} value={form.name} maxLength={40} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="例如：尔湾华人商会" /></div>
        <div className={styles.field}><label className={styles.label}>对外联系方式（报名页「联系主办方」显示，可不填）</label><input className={styles.input} value={form.publicContact} maxLength={60} onChange={(e) => setForm({ ...form, publicContact: e.target.value })} placeholder="例如：电话 949-xxx-xxxx / 微信号 xxx" /></div>
        <div className={styles.field}><label className={styles.label}>后台备注（只有工作人员看）</label><input className={styles.input} value={form.staffNote} maxLength={200} onChange={(e) => setForm({ ...form, staffNote: e.target.value })} placeholder="谁介绍的、负责人是谁" /></div>
        <button className={styles.btn} disabled={busy || form.name.trim().length < 2} onClick={async () => {
          const r = await post<Code & { id: string }>({ action: 'create', ...form }, `已建好「${form.name.trim()}」，请负责人扫下面的码开通`);
          if (r) { setCode({ orgId: r.id, c: r }); setForm({ name: '', publicContact: '', staffNote: '', applicationId: '' }); }
        }}>建好并出开通码</button>
        <p className={styles.small}>开通时负责人要看完《主办方数据承诺》（第 {d.promiseVersion} 版）点同意，同意时间会记下来。</p>
        {code && !d.organizers.find((o) => o.id === code.orgId && o.status !== 'pending') && <CodeBox c={code.c} title="开通码" />}
      </div>

      <div className={styles.card}>
        <h2 className={styles.h2}>主办方（{d.organizers.length}）</h2>
        {!d.organizers.length && <p className={styles.muted}>还没有开通任何主办方</p>}
        {d.organizers.map((o) => (
          <div key={o.id} className={styles.listItem}>
            <div className={styles.row}>
              <span><b>{o.name}</b> {o.is_demo && <span className={`${styles.badge} ${styles.badgeMuted}`}>审核演示</span>} <span className={`${styles.badge} ${o.status === 'active' ? styles.badgeGreen : o.status === 'suspended' ? styles.badgeRed : styles.badgeMuted}`}>{ORG_STATUS[o.status]}</span></span>
              <span className={styles.small}>公开活动 {o.events} 场 · 先审后发还剩 {o.review_left} 场 · 商会帮忙 {o.helps} 次</span>
            </div>
            <p className={styles.small}>
              {(o.members ?? []).map((m) => `${m.name}（${m.role === 'owner' ? '负责人' : '帮手'}）`).join('、') || '还没有人扫码开通'}
              {o.agreed_at ? ` · ${fmtDateTime(o.agreed_at)} 同意数据承诺` : ''}{o.public_contact ? ` · 对外联系：${o.public_contact}` : ''}{o.staff_note ? ` · 备注：${o.staff_note}` : ''}
              {o.suspended_at ? ` · ${fmtDateTime(o.suspended_at)} 停用：${o.suspend_reason ?? ''}` : ''}
            </p>
            {code?.orgId === o.id && o.status === 'pending' && <CodeBox c={code.c} title="开通码" />}
            <div className={styles.btnRow}>
              {o.status !== 'suspended' && <button className={`${styles.btn} ${styles.btnSmall} ${styles.btnGhost}`} disabled={busy} onClick={async () => { const r = await post<Code>({ action: 'code', id: o.id }, '已出新的开通码（换负责人也用这个）'); if (r) setCode({ orgId: o.id, c: r }); }}>{o.status === 'pending' ? '重新出开通码' : '换负责人：出开通码'}</button>}
              <button className={`${styles.btn} ${styles.btnSmall} ${styles.btnGhost}`} disabled={busy} onClick={() => post({ action: 'org', op: 'help', id: o.id })}>记一次商会帮忙</button>
              <button className={`${styles.btn} ${styles.btnSmall} ${styles.btnGhost}`} disabled={busy} onClick={() => { const n = window.prompt(`「${o.name}」还要人工放行几场？（0 = 以后机器检测通过就直接公开）`, String(o.review_left)); if (n != null) post({ action: 'org', op: 'edit', id: o.id, reviewLeft: Number(n) }); }}>改先审后发场数</button>
              {o.status === 'suspended'
                ? <button className={`${styles.btn} ${styles.btnSmall}`} disabled={busy} onClick={() => post({ action: 'org', op: 'resume', id: o.id })}>恢复</button>
                : <>
                    <input className={styles.input} style={{ maxWidth: 220 }} placeholder="停用原因" value={reason['o' + o.id] ?? ''} onChange={(x) => setReason({ ...reason, ['o' + o.id]: x.target.value })} />
                    <button className={`${styles.btn} ${styles.btnSmall} ${styles.btnDanger}`} disabled={busy || !why('o' + o.id)} onClick={() => { if (window.confirm(`停用「${o.name}」？他的活动全部下架，名单 30 天内负责人还能导出。`)) post({ action: 'org', op: 'suspend', id: o.id, reason: why('o' + o.id) }); }}>停用</button>
                  </>}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.card}>
        <h2 className={styles.h2}>主办方的活动（最近 60 天和以后的）</h2>
        <p className={styles.small}>出问题可以一键下架（主办方能看到原因）。名单明细商会这边平时看不到；处理投诉、主办方请帮忙时，管理员写原因才能打开，每次都记下来。</p>
        {!others.length && <p className={styles.muted}>还没有</p>}
        {others.length > 0 && (
          <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>活动</th><th>主办方</th><th>时间</th><th>报名人数</th><th>状态</th><th>操作</th></tr></thead><tbody>
            {others.map((e) => (
              <tr key={e.id}>
                <td>{e.title}{e.mode === 'chain' ? '（接龙）' : ''}</td><td>{e.organizer}</td><td>{e.when}</td><td>{e.people}</td>
                <td>{STATUS[e.status] ?? e.status}{e.takenDownReason ? `：${e.takenDownReason}` : e.reviewNote ? `：${e.reviewNote}` : ''}</td>
                <td>
                  <input className={styles.input} style={{ maxWidth: 180 }} placeholder="原因（下架 / 查看名单要写）" value={reason[e.id] ?? ''} onChange={(x) => setReason({ ...reason, [e.id]: x.target.value })} />
                  <div className={styles.btnRow}>
                    {(e.status === 'taken_down' || e.status === 'rejected')
                      ? <button className={`${styles.btn} ${styles.btnSmall}`} disabled={busy} onClick={() => post({ action: 'event', op: 'restore', id: e.id })}>恢复</button>
                      : e.status === 'published' && <button className={`${styles.btn} ${styles.btnSmall} ${styles.btnDanger}`} disabled={busy || !why(e.id)} onClick={() => post({ action: 'event', op: 'takedown', id: e.id, reason: why(e.id) })}>下架</button>}
                    {admin && <button className={`${styles.btn} ${styles.btnSmall} ${styles.btnQuiet}`} disabled={busy || why(e.id).length < 4} onClick={async () => {
                      const r = await post<{ title: string; people: NonNullable<typeof view>['people'] }>({ action: 'view', id: e.id, reason: why(e.id) }, '已打开名单（这次查看已记录）');
                      if (r) setView({ id: e.id, ...r });
                    }}>查看名单（记录）</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody></table></div>
        )}
        {view && (
          <div className={styles.notice}>
            <b>{view.title}</b> 的名单（只显示姓名、手机尾号、人数、到场；这次查看已记录） <button className={`${styles.btn} ${styles.btnSmall} ${styles.btnQuiet}`} onClick={() => setView(null)}>收起</button>
            <ul>{view.people.map((p, i) => <li key={i}>{p.name} · {p.phone} · {p.partySize} 位 · {p.status === 'waitlisted' ? '候补' : '已报名'}{p.checkedIn ? ' · 到了' : ''}</li>)}</ul>
          </div>
        )}
      </div>

      <div className={styles.card}>
        <h2 className={styles.h2}>「我也要办活动」申请（{d.applications.filter((a) => a.status === 'open').length} 条没处理）</h2>
        {!d.applications.length && <p className={styles.muted}>还没有人申请</p>}
        {d.applications.map((a) => (
          <div key={a.id} className={styles.listItem}>
            <b>{a.org_name}</b> · {a.person_name} · {a.phone ?? ''} <span className={styles.small}>{fmtDateTime(a.created_at)}{a.from_title ? ` · 从「${a.from_title}」报名页点进来` : ''}{a.status !== 'open' ? ' · 已处理' : ''}</span>
            {a.note && <p className={styles.small}>{a.note}</p>}
            {a.status === 'open' && (
              <div className={styles.btnRow}>
                <button className={`${styles.btn} ${styles.btnSmall}`} onClick={() => { setForm({ name: a.org_name, publicContact: '', staffNote: `申请人 ${a.person_name} ${a.phone ?? ''}`, applicationId: a.id }); window.scrollTo({ top: 0, behavior: 'smooth' }); setMsg({ ok: true, text: '已把申请填进「开通一个主办方」，看一眼点「建好并出开通码」' }); }}>开通他</button>
                <button className={`${styles.btn} ${styles.btnSmall} ${styles.btnQuiet}`} onClick={() => post({ action: 'application', id: a.id, status: 'dismissed' })}>不用处理</button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className={styles.card}>
        <h2 className={styles.h2}>商会查看主办方名单的记录</h2>
        {!log.length && <p className={styles.muted}>还没有人查看过</p>}
        {log.map((l, i) => <p key={i} className={styles.small}>{fmtDateTime(l.created_at)} · {l.actor} 查看了「{l.organizer}」的「{l.title}」 · 原因：{l.reason}</p>)}
      </div>
    </>
  );
}

/** 审核用开通码（指令 57 第 4 条）：给微信审核员用，可多人反复用、默认 60 天、可一键作废 */
function ReviewCodes({ list, busy, post }: { list: ReviewCode[]; busy: boolean; post: (b: Record<string, unknown>, okText?: string) => Promise<unknown> }) {
  const [days, setDays] = useState('60');
  const live = (c: ReviewCode) => !c.revoked_at && new Date(c.expires_at).getTime() > Date.now();
  return (
    <div className={styles.card}>
      <h2 className={styles.h2}>审核用开通码</h2>
      <p className={styles.small}>
        给微信审核员（陌生微信号）进「我办的活动」看完整功能用：小程序「我的 → 我也要办活动」页上的「已有开通码」框里填这 10 位码 → 看《主办方数据承诺》→「我看完了，开通」。
        所有填这个码的微信号都成为演示主办方「SAREC 审核测试」的负责人（先审后发 0 场，机器检测照旧）。演示主办方不进试用看板，它的活动和所有主办方活动一样不进首页、不进商会的客户和群发。
        过审后点「作废」，码就不能再用；要连演示主办方一起停掉，在下面主办方列表里停用「SAREC 审核测试」。
      </p>
      <div className={styles.btnRow}>
        <label className={styles.small}>有效天数 <input className={styles.input} style={{ maxWidth: 80 }} value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ''))} /></label>
        <button className={`${styles.btn} ${styles.btnSmall}`} disabled={busy} onClick={() => post({ action: 'review_code', days: Number(days) || 60 })}>出一个审核码</button>
      </div>
      {!list.length && <p className={styles.muted}>还没有出过审核码</p>}
      {list.map((c) => (
        <div key={c.code} className={styles.row}>
          <span>
            <span className={styles.mono}>{c.code}</span>{' '}
            <span className={`${styles.badge} ${live(c) ? styles.badgeGreen : styles.badgeMuted}`}>{c.revoked_at ? '已作废' : live(c) ? '能用' : '已过期'}</span>
            <br /><span className={styles.small}>{c.org_name} · {fmtDateTime(c.expires_at)} 前有效 · 已有 {c.uses} 个微信号用它开通 · {c.created_by} {fmtDateTime(c.created_at)} 出的{c.revoked_at ? ` · ${fmtDateTime(c.revoked_at)} 作废` : ''}</span>
          </span>
          {!c.revoked_at && <button className={`${styles.btn} ${styles.btnSmall} ${styles.btnDanger}`} disabled={busy} onClick={() => { if (window.confirm(`作废审核码 ${c.code}？作废后谁都不能再用它开通。`)) post({ action: 'review_revoke', code: c.code }); }}>作废</button>}
        </div>
      ))}
    </div>
  );
}
