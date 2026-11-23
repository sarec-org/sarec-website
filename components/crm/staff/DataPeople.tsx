'use client';
/**
 * 指令 44：「数据」页点开数字看到的名单（就在数据页里展开）。
 * - 每一行点名字进这个人的档案；联系按钮用全站同一套 ContactButtons（和「今天」「客户」一样）。
 * - 名单人数和上面的数字同一个口径（lib/crm/dataPeople.ts）。
 * - 可导出表格（记操作记录）。手机 390 宽不左右滑：只用换行的文字行，不用表格。
 */
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import styles from '@/components/crm/crm.module.css';
import { api, fmtDate, fmtDateTime } from '@/components/crm/client';
import { ContactButtons, MemberBadge } from '@/components/crm/staff/TodayActions';

export type Person = {
  id: string; name: string | null; memberNo: number; phone: string | null; email: string | null; wechat: string | null;
  company: string | null; industry: string | null; createdAt: string; source: string; did: string[];
  isMember: boolean; tierName: string | null; memberUntil: string | null;
};
type Act = { firstAt: string | null; lastAt: string | null; days: number; clients: string[]; top: string[] };
type Shell = { id: string; memberNo: number; firstAt: string; lastAt: string; days: number; clients: string[]; top: string[]; source: string };
type Unreg = Act & { id: string; memberNo: number; source: string; createdAt: string };

export type Open = { list: 'new' | 'shells' | 'arrived' | 'joined' | 'bringer' | 'visitors'; key?: string; title: string };

const wrap = { overflowWrap: 'anywhere' as const, wordBreak: 'break-word' as const };
const line = (s: ReactNode) => <div className={styles.small} style={wrap}>{s}</div>;
const money = (c: number | null) => (c == null ? '没记录' : `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`);

/** 一个人一行：名字（点进档案）+ 会员标识 + 资料 + 联系按钮 */
export function PersonRow({ p, extra, tag }: { p: Person; extra?: ReactNode; tag?: ReactNode }) {
  return (
    <div className={styles.card} style={{ padding: '0.7rem 0.9rem', margin: '0 0 0.5rem', ...wrap }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <Link href={`/zh/staff/contacts/${p.id}`} style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '1.05rem' }}>{p.name ?? '（没留姓名）'} ›</Link>
        <span className={styles.small}>#{p.memberNo}</span>
        <MemberBadge isMember={p.isMember} tier={p.tierName === '会员' ? null : p.tierName} />
        {!p.isMember && <span className={styles.small}>不是会员</span>}
        {tag}
      </div>
      {line(<>{p.phone ?? '没有手机号'}{p.email ? ` · ${p.email}` : ''}</>)}
      {line(<>{p.industry ?? '行业没填'}{p.company ? ` · ${p.company}` : ''}</>)}
      {line(<>{fmtDate(p.createdAt)} 来的 · 从哪来：{p.source}</>)}
      {line(<>来了以后：{p.did.length ? p.did.join('、') : '还没报名、签到、做名片或登记接活儿'}</>)}
      {extra}
      <ContactButtons phone={p.phone} email={p.email} wechat={p.wechat} />
    </div>
  );
}

function ShellRow({ x }: { x: Shell | Unreg }) {
  return (
    <div className={styles.card} style={{ padding: '0.6rem 0.9rem', margin: '0 0 0.5rem', ...wrap }}>
      <Link href={`/zh/staff/contacts/${x.id}`} style={{ color: 'var(--gold)', fontWeight: 700 }}>未登记的微信用户 #{x.memberNo} ›</Link>
      {'firstAt' in x && x.firstAt && line(<>第一次打开 {fmtDateTime(x.firstAt)}{x.lastAt ? ` · 最近一次 ${fmtDateTime(x.lastAt)}` : ''}</>)}
      {line(<>来过 {Math.max(1, x.days)} 天{x.clients.length ? `（${x.clients.join('、')}）` : ''} · 从哪来：{x.source}</>)}
      {line(<>点过：{x.top.length ? x.top.join('、') : '没有点击记录'}</>)}
    </div>
  );
}

export function DataPeople({ open, days, onClose }: { open: Open; days: number; onClose: () => void }) {
  const [d, setD] = useState<Record<string, unknown> | null>(null);
  const [err, setErr] = useState('');
  const qs = `list=${open.list}&days=${days}${open.key ? `&key=${encodeURIComponent(open.key)}` : ''}`;
  useEffect(() => {
    setD(null);
    setErr('');
    api<Record<string, unknown>>(`/api/v1/staff/data-people?${qs}`).then((r) => (r.ok ? setD(r.data) : setErr(r.message)));
    document.getElementById('people')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [qs]);

  return (
    <section id="people" className={styles.card} style={{ margin: '0 0 1rem', borderColor: 'var(--gold)', ...wrap }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <h2 className={styles.h2} style={{ margin: 0 }}>{open.title}<span className={styles.small} style={{ marginLeft: 6 }}>最近 {days} 天</span></h2>
        <div className={styles.btnRow} style={{ margin: 0 }}>
          <a className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`} href={`/api/v1/staff/data-people?${qs}&format=csv`}>导出表格</a>
          <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`} onClick={onClose}>收起名单</button>
        </div>
      </div>
      {err && <div className={styles.error}>{err}</div>}
      {!d && !err && <p className={styles.muted}>正在加载名单…</p>}
      {d && <Body open={open} days={days} d={d} />}
    </section>
  );
}

function Body({ open, days, d }: { open: Open; days: number; d: Record<string, unknown> }) {
  if (open.list === 'new') {
    const ps = d.people as Person[];
    return (
      <>
        <p className={styles.small}>
          共 <b>{ps.length}</b> 位，和上面的数字一致；最新来的排在前面。点名字看档案。
          想再按行业、区域筛：<Link href={`/zh/staff/contacts?newDays=${days}`} style={{ color: 'var(--gold)' }}>到「客户」看最近 {days} 天新增 ›</Link>
          （「客户」页还会列出带灰色标记的内部 / 测试账号，这里不算）
        </p>
        {!ps.length && <p className={styles.muted}>这段时间没有新人。</p>}
        {ps.map((p) => <PersonRow key={p.id} p={p} />)}
      </>
    );
  }
  if (open.list === 'shells') {
    const ps = d.people as Shell[];
    return (
      <>
        <p className={styles.small}>
          共 <b>{ps.length}</b> 位。<b>这些人还没留姓名手机</b>，所以没法直接联系；他们以后登记了，会自动移到“新人”里，不重复算。
          “来过几天”按有动作的天数算（小程序不记每一次打开）；“点过”是点过的功能，小程序不记看过哪一页。来源早期版本没记的写“没记录”。
        </p>
        {!ps.length && <p className={styles.muted}>这段时间没有只打开过的人。</p>}
        {ps.map((x) => <ShellRow key={x.id} x={x} />)}
      </>
    );
  }
  if (open.list === 'arrived') {
    const evs = d.events as { eventId: string; title: string; startsAt: string; people: (Person & { firstTime: boolean; nth: number })[] }[];
    return (
      <>
        <p className={styles.small}>共 <b>{d.total as number}</b> 人到场（按人算，一个人到了两场只算一个），其中第一次来的 <b>{d.first as number}</b> 人。下面按活动分组，到了两场的人两场里都有。</p>
        {!evs.length && <p className={styles.muted}>这段时间没有人签到。</p>}
        {evs.map((g) => (
          <div key={g.eventId} style={{ marginTop: '0.75rem' }}>
            <p style={{ margin: '0 0 0.4rem', fontWeight: 700 }}>{g.title} <span className={styles.small}>{fmtDateTime(g.startsAt)} · 到了 {g.people.length} 人</span></p>
            {g.people.map((p) => (
              <PersonRow key={p.id} p={p} tag={<span className={`${styles.badge} ${p.firstTime ? styles.badgeGreen : styles.badgeMuted}`}>{p.firstTime ? '第一次来' : `回头客 · 第 ${p.nth} 次`}</span>} />
            ))}
          </div>
        ))}
      </>
    );
  }
  if (open.list === 'joined') {
    const js = d.joined as (Person & { applicationId: string; startDate: string; tierName: string | null; paidCents: number | null; paidAt: string | null; method: string; plan: string | null })[];
    const os = d.otherMembers as (Person & { startDate: string | null; reason: string })[];
    return (
      <>
        <p className={styles.small}>共 <b>{js.length}</b> 人：已缴费、会籍在这段时间开始的。</p>
        {!js.length && <p className={styles.muted}>这段时间没有人缴费入会。</p>}
        {js.map((p) => (
          <PersonRow key={p.applicationId} p={p} extra={line(<b>{p.startDate} 入会{p.tierName ? ` · ${p.tierName}` : ''} · 交了 {money(p.paidCents)} · {p.method}{p.plan ? `（${p.plan}）` : ''}</b>)} />
        ))}
        <h3 className={styles.h2} style={{ fontSize: '1rem', marginTop: '1rem' }}>带会员标识、但不在这个数里的 {os.length} 人</h3>
        <p className={styles.small}>会籍有效、显示“会员”，但不是这段时间缴费开始的（比如更早入会、手动或线下标的会员）。列出来看全貌。</p>
        {os.map((p) => <PersonRow key={p.id} p={p} extra={line(<>为什么不在数里：{p.reason}{p.memberUntil ? ` · 会员到 ${p.memberUntil}` : ''}</>)} />)}
      </>
    );
  }
  if (open.list === 'bringer') {
    const ps = d.people as (Person & { firstRegAt: string; arrived: boolean; joined: boolean })[];
    return (
      <>
        <p className={styles.small}>
          {d.label as string}：这段时间经它报名 <b>{d.registered as number}</b> 人，其中到场 <b>{d.arrived as number}</b>、入会 <b>{d.joined as number}</b>（和上面的数字同一口径：按报名记录上最后一次带来这个人的功能 / 渠道算）。
        </p>
        {!ps.length && <p className={styles.muted}>这段时间没有人经它报名。</p>}
        {ps.map((p) => (
          <PersonRow key={p.id} p={p} extra={line(<>经它报名 {fmtDate(p.firstRegAt)} · {p.arrived ? '到场了' : '还没到场'} · {p.joined ? '入会了' : '没入会'}</>)} />
        ))}
      </>
    );
  }
  // visitors
  const reg = d.registered as (Person & Act)[];
  const unreg = d.unregistered as Unreg[];
  return (
    <>
      <p className={styles.small}>
        这段时间在小程序或网站上有动作（打开时登录、点功能）的人：登记过的 <b>{reg.length}</b> 位，未登记的 <b>{unreg.length}</b> 位
        {(d.anonymousWeb as number) ? `，另有网站上没登录的访客 ${d.anonymousWeb as number} 个（只有浏览器标识，没有姓名，列不出来）` : ''}。
        “来过几天”按有动作的天数算；“主要看了”是点得最多的功能（不记看过哪一页）。最近来的排在前面。
      </p>
      {reg.map((p) => (
        <PersonRow key={p.id} p={p} extra={line(<>最近一次 {p.lastAt ? fmtDateTime(p.lastAt) : '—'} · 来过 {p.days} 天{p.clients.length ? `（${p.clients.join('、')}）` : ''} · 主要看了：{p.top.length ? p.top.join('、') : '没有点击记录'}</>)} />
      ))}
      <details style={{ marginTop: '0.75rem' }}>
        <summary style={{ cursor: 'pointer', minHeight: 44, listStyle: 'revert' }}><strong>未登记 {unreg.length} 位（点开看）</strong></summary>
        <p className={styles.small}>这些人还没留姓名手机。</p>
        {unreg.map((x) => <ShellRow key={x.id} x={x} />)}
      </details>
    </>
  );
}
