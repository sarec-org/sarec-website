'use client';
/**
 * 数据（后台综合优化 11/21，第二部分九）：原「增长」里的统计、「流程数据」、「功能排行」三页合成这一页。
 * - 最上面回答四个问题：来了多少新人、多少人到场、多少人入会、哪几个功能和渠道带来的入会和到场最多。
 * - 明细收在下面，点开才看：每场活动、每个功能、点击统计、推荐排行、功能月报预览、操作记录（管理员）。
 * - 全部用人话：功能叫小程序里的名字，不出现英文代号、模板编号、内部编号。
 * 旧网址 /zh/staff/flow-stats、/zh/staff/features、/zh/staff/growth 自动跳到这里（或「设置」）。
 * 读的还是原来的接口：/api/v1/staff/flow-stats、/api/v1/staff/features、/api/v1/staff/growth?only=stats、/api/v1/staff/team（操作记录，管理员）。
 */
import Link from 'next/link';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import styles from '@/components/crm/crm.module.css';
import { Msg, StaffGate, can, type StaffInfo } from '@/components/crm/staff/StaffGate';
import { api, fmtDateTime } from '@/components/crm/client';
import { AuditLog, type LogRow } from '@/components/crm/staff/AuditLog';

type Sum = { days: number; new_people: number; shells: number; arrived: number; arrived_first: number; joined: number; top: { label: string; kind: string; arrived: number; joined: number; registered: number }[]; eventsInWindow: number; sampleTooSmall: boolean };
type Ev = { slug: string; title: string; startsAt: string; scans: number; scanDone: number; scanRate: number | null; regs: number; arrived: number; arriveRate: number | null; sharedRegs: number; sharedArrived: number; manual: number; backfill: number };
type Flow = { events: Ev[]; repeaters: number; attendees: number; join: { total: number; paid: number; link_sent: number; rate: number | null } };
type F = { visits: number; registered: number; arrived: number; joined: number; inquiries: number; firstTouch: number };
type FRow = { key: string; label: string; group: string; times: number; people: number; brings: F | null };
type Feat = { rows: FRow[]; eventsInWindow: number; sampleTooSmall: boolean };
type Stat = { name: string; target: string | null; client: string; n: number; people: number };
type Ref = { id: string; member_no: number; name: string; visits: number; registered: number; arrived: number; first_referred: number; joined: number; inquiries: number };
type EvOpt = { id: string; title: string };

const pct = (n: number | null) => (n == null ? '—' : `${n}%`);
/** 打点名 → 小程序里的叫法 */
const TRACK: Record<string, string> = {
  home_entry: '点首页入口', share: '分享给朋友 / 群', share_timeline: '分享到朋友圈', poster: '生成邀请海报', poster_save: '保存邀请海报', card_open: '打开电子名片', card_share: '分享电子名片',
  visit: '从分享 / 渠道码进来', status_action: '点状态卡上的按钮', wechat_qr: '看商会微信', channels: '点视频号', album_open: '打开活动相册', agent_open: '打开 AI 助手',
  companion_add: '带一位朋友', group_signup: '群报名', photo_upload: '上传我拍的照片', beauty_apply: '用美颜', photo_share: '分享照片', jobs_trade: '点找工人的工种'
};
const HOME: Record<string, string> = { events: '活动报名', mine: '我的报名', checkin: '现场签到', invite: '邀请好友', card: '我的名片', benefits: '会员权益', rooms: '会议室', contact: '联系商会' };
/** 目标只显示人能看懂的（首页入口名、中文）；英文代号、活动编号一律不显示 */
const targetText = (s: Stat) => (s.target && HOME[s.target]) || (s.target && /[一-龥]/.test(s.target) ? s.target : '');

function Fold({ id, title, sub, open, children }: { id: string; title: string; sub: string; open?: boolean; children: ReactNode }) {
  return (
    <details id={id} className={styles.card} open={open} style={{ margin: '0 0 0.75rem' }}>
      <summary style={{ cursor: 'pointer', minHeight: 44, listStyle: 'revert' }}>
        <strong>{title}</strong>
        <span className={styles.small} style={{ display: 'block', marginTop: 4 }}>{sub}</span>
      </summary>
      <div style={{ marginTop: '0.75rem' }}>{children}</div>
    </details>
  );
}
function Big({ q, n, unit, note }: { q: string; n: ReactNode; unit: string; note?: ReactNode }) {
  return (
    <div className={styles.card} style={{ margin: 0 }}>
      <p className={styles.small} style={{ margin: 0 }}>{q}</p>
      <p style={{ fontSize: 30, margin: '0.2rem 0', color: 'var(--gold-bright)' }}>{n}<span style={{ fontSize: 16, marginLeft: 4 }}>{unit}</span></p>
      {note && <p className={styles.small} style={{ margin: 0 }}>{note}</p>}
    </div>
  );
}

function Data({ s }: { s: StaffInfo }) {
  const admin = can(s, 'admin');
  const [days, setDays] = useState(30);
  const [from, setFrom] = useState('');
  const [sum, setSum] = useState<Sum | null>(null);
  const [flow, setFlow] = useState<Flow | null>(null);
  const [featWin, setFeatWin] = useState('');
  const [feat, setFeat] = useState<Feat | null>(null);
  const [evs, setEvs] = useState<EvOpt[]>([]);
  const [track, setTrack] = useState<Stat[] | null>(null);
  const [refs, setRefs] = useState<Ref[] | null>(null);
  const [report, setReport] = useState<string | null>(null);
  const [log, setLog] = useState<LogRow[] | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setFrom(new URLSearchParams(location.search).get('from') ?? '');
    api<Flow>('/api/v1/staff/flow-stats').then((r) => (r.ok ? setFlow(r.data) : setMsg({ ok: false, text: r.message })));
    api<{ events: EvOpt[] }>('/api/v1/staff/events').then((r) => r.ok && setEvs(r.data.events ?? []));
    if (admin) api<{ log: LogRow[] }>('/api/v1/staff/team').then((r) => r.ok && setLog(r.data.log));
  }, [admin]);
  const load = useCallback(async () => {
    setSum(null);
    const r = await api<Sum>(`/api/v1/staff/data-summary?days=${days}`);
    if (r.ok) setSum(r.data);
    else setMsg({ ok: false, text: r.message });
    const g = await api<{ track: { byName: Stat[] }; referrals: Ref[] }>(`/api/v1/staff/growth?only=stats&days=${days}`);
    if (g.ok) {
      setTrack(g.data.track.byName);
      setRefs(g.data.referrals);
    }
  }, [days]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    const q = featWin.startsWith('ev:') ? `eventId=${featWin.slice(3)}` : `days=${days}`;
    api<Feat>(`/api/v1/staff/features?${q}`).then((r) => r.ok && setFeat(r.data));
  }, [featWin, days]);

  const trackRows = (track ?? []).map((x) => ({ ...x, label: TRACK[x.name] ?? '还没起中文名的点击（开发补名字）', t: targetText(x) }));
  // 同名同目标（英文目标不显示后会重复）合并成一行
  const merged = Object.values(
    trackRows.reduce<Record<string, { label: string; t: string; client: string; n: number; people: number }>>((acc, x) => {
      const k = `${x.label}|${x.t}|${x.client}`;
      acc[k] = acc[k] ? { ...acc[k], n: acc[k].n + x.n, people: acc[k].people + x.people } : { label: x.label, t: x.t, client: x.client, n: x.n, people: x.people };
      return acc;
    }, {})
  ).sort((a, b) => b.n - a.n);

  return (
    <>
      {from && (
        <div className={styles.notice}>
          {from === 'flow-stats' ? '原来的「流程数据」并到这一页了，在下面「每场活动」里。' : from === 'features' ? '原来的「功能排行」并到这一页了，在下面「每个功能用了多少、带来多少」里。' : '原来的统计并到这一页了。'}
        </div>
      )}
      <Msg m={msg} />
      <div className={styles.chips}>
        {[7, 30, 90].map((n) => (
          <button key={n} className={`${styles.chip} ${days === n ? styles.chipOn : ''}`} onClick={() => setDays(n)}>
            最近 {n} 天
          </button>
        ))}
      </div>

      <div className={styles.grid2} style={{ marginBottom: '1rem' }}>
        <Big q="1. 这段时间来了多少新人？" n={sum ? sum.new_people : '…'} unit="人" note={sum ? `新登记了姓名或手机号的人。另有 ${sum.shells} 位只打开过小程序、没登记，不算在内。` : null} />
        <Big q="2. 多少人到场？" n={sum ? sum.arrived : '…'} unit="人" note={sum ? `其中第一次来的 ${sum.arrived_first} 人。` : null} />
        <Big q="3. 多少人入会？" n={sum ? sum.joined : '…'} unit="人" note="已缴费、会籍在这段时间开始的。" />
        <div className={styles.card} style={{ margin: 0 }}>
          <p className={styles.small} style={{ margin: 0 }}>4. 哪几个功能和渠道带来的入会和到场最多？</p>
          {!sum ? (
            <p className={styles.muted}>正在算…</p>
          ) : sum.top.length ? (
            <ol style={{ margin: '0.4rem 0 0', paddingLeft: '1.2rem' }}>
              {sum.top.map((t) => (
                <li key={t.kind + t.label} style={{ marginBottom: 4 }}>
                  {t.label}<span className={styles.small}>（{t.kind}）</span>：入会 <strong>{t.joined}</strong>、到场 <strong>{t.arrived}</strong>
                </li>
              ))}
            </ol>
          ) : (
            <p style={{ margin: '0.4rem 0 0' }}>这段时间还没有哪个功能或渠道带来到场、入会。</p>
          )}
          {sum?.sampleTooSmall && <p className={styles.small} style={{ margin: '0.4rem 0 0' }}>这段时间只有 {sum.eventsInWindow} 场活动，样本太少，仅供参考。</p>}
        </div>
      </div>

      <h2 className={styles.h2}>明细（点开看）</h2>

      <Fold id="events" title="每场活动" sub="扫码完成签到比例、报名到场率、分享带来的报名、人工处理多少人；重复参加、入会申请到入会（原「流程数据」）" open={from === 'flow-stats'}>
        {!flow ? (
          <p className={styles.muted}>正在加载…</p>
        ) : (
          <>
            <div className={styles.grid2}>
              <div><p className={styles.small} style={{ margin: 0 }}>重复参加（到过 2 场及以上）</p><p style={{ fontSize: 22, margin: 0 }}>{flow.repeaters} 人</p><p className={styles.small} style={{ margin: 0 }}>共 {flow.attendees} 人到过场</p></div>
              <div><p className={styles.small} style={{ margin: 0 }}>入会申请 → 入会</p><p style={{ fontSize: 22, margin: 0 }}>{pct(flow.join.rate)}</p><p className={styles.small} style={{ margin: 0 }}>申请 {flow.join.total} · 已发缴费链接 {flow.join.link_sent} · 已入会 {flow.join.paid}</p></div>
            </div>
            <p className={styles.small}>扫码完成签到比例 = 扫了现场码、最后自己签到成功的人 ÷ 扫了现场码的人（1.3.1 起才有扫码记录）。人工处理 = 工作人员代签到、现场登记、补登记的人数。</p>
            {!flow.events.length && <p className={styles.muted}>还没有已举办的活动。</p>}
            {flow.events.map((e) => (
              <div key={e.slug} style={{ padding: '0.55rem 0', borderTop: '1px solid var(--line-2)' }}>
                <strong>{e.title}</strong> <span className={styles.small}>{fmtDateTime(e.startsAt)}</span>
                <div className={styles.small}>
                  报名到场率 {pct(e.arriveRate)}（{e.arrived} / {e.regs}）· 扫码完成签到 {e.scans ? `${pct(e.scanRate)}（${e.scanDone} / ${e.scans}）` : '—'} · 分享带来报名 {e.sharedRegs}（到场 {e.sharedArrived}）· 人工处理 {e.manual}
                  {e.backfill ? `（含补登记 ${e.backfill}）` : ''}
                </div>
              </div>
            ))}
          </>
        )}
      </Fold>

      <Fold id="features" title="每个功能用了多少、带来多少" sub="次数、人数；带来的访问、报名、到场、入会、有效咨询（原「功能排行」）" open={from === 'features'}>
        <select className={styles.select} value={featWin} onChange={(e) => setFeatWin(e.target.value)} aria-label="看哪段时间" style={{ marginBottom: 8 }}>
          <option value="">跟上面一样：最近 {days} 天</option>
          {evs.map((e) => <option key={e.id} value={`ev:${e.id}`}>只看活动：{e.title}</option>)}
        </select>
        {feat?.sampleTooSmall && <p className={styles.small}>这段时间只有 {feat.eventsInWindow} 场活动，样本太少，仅供参考。</p>}
        {['首页入口', '传播', '获客', '照片'].map((g) => {
          const list = feat?.rows.filter((r) => r.group === g) ?? [];
          if (!list.length) return null;
          return (
            <div key={g} style={{ marginTop: 8 }}>
              <p className={styles.small} style={{ fontWeight: 700, margin: '0.6rem 0 0.2rem' }}>{g}</p>
              {list.map((r) => (
                <div key={r.key} style={{ padding: '0.4rem 0', borderTop: '1px solid var(--line-2)' }}>
                  {r.label.replace('首页入口 · ', '')}：用了 {r.times} 次、{r.people} 人
                  <div className={styles.small}>
                    {r.brings ? `带来访问 ${r.brings.visits} · 报名 ${r.brings.registered} · 到场 ${r.brings.arrived} · 入会 ${r.brings.joined} · 有效咨询 ${r.brings.inquiries} · 第一次因它而来 ${r.brings.firstTouch}` : '站内入口，不单独算带来多少'}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
        <p className={styles.small}>小程序首页入口的顺序是固定的（按冻结清单），不在后台调；这里只看每个功能的使用和带来的结果。</p>
      </Fold>

      <Fold id="clicks" title="点击统计" sub={`最近 ${days} 天每种点击的次数和人数（原「增长」页）`}>
        {!track ? <p className={styles.muted}>正在加载…</p> : !merged.length ? <p className={styles.muted}>这段时间还没有点击数据。</p> : merged.map((x, i) => (
          <div key={i} style={{ padding: '0.4rem 0', borderTop: '1px solid var(--line-2)' }}>
            {x.label}{x.t ? `：${x.t}` : ''}
            <span className={styles.small}>　{x.client === 'mp' ? '小程序' : x.client === 'web' ? '网站' : '其他端'} · {x.n} 次 · {x.people} 人</span>
          </div>
        ))}
      </Fold>

      <Fold id="referrals" title="推荐排行（只在后台显示）" sub="谁带来的人最多：带来源的访问 → 报名 → 到场 → 入会（原「增长」页）">
        <p className={styles.small} style={{ marginTop: 0 }}>记的是真实结果；生成海报、点分享不算。自己推荐自己、重复报名已去重。小程序里不出现任何奖励规则。</p>
        {!refs ? <p className={styles.muted}>正在加载…</p> : !refs.length ? <p className={styles.muted}>还没有推荐记录。</p> : refs.map((r) => (
          <div key={r.id} style={{ padding: '0.4rem 0', borderTop: '1px solid var(--line-2)' }}>
            <Link href={`/zh/staff/contacts/${r.id}`} style={{ color: 'var(--gold)' }}>{r.name}</Link>
            <div className={styles.small}>访问 {r.visits} · 报名 {r.registered} · 到场 {r.arrived} · 首次推荐 {r.first_referred} · 入会 {r.joined} · 咨询 {r.inquiries}</div>
          </div>
        ))}
      </Fold>

      <Fold id="report" title="功能月报预览" sub="每月 1 号自动发给东哥的功能月报，先在这里看看">
        {report ? (
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>{report}</pre>
        ) : (
          <button
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={async () => {
              const r = await api<{ report: { subject: string; text: string } }>('/api/v1/staff/features?report=1');
              if (r.ok) setReport(`${r.data.report.subject}\n\n${r.data.report.text}`);
              else setMsg({ ok: false, text: r.message });
            }}
          >
            生成本月功能月报预览
          </button>
        )}
      </Fold>

      {admin && (
        <Fold id="log" title="操作记录" sub="谁、对谁、做了什么（最近 200 条，管理员能看）">
          {log ? <AuditLog log={log} /> : <p className={styles.muted}>正在加载…</p>}
        </Fold>
      )}
    </>
  );
}

export default function Page() {
  return (
    <StaffGate role="ops" title="数据">
      {(s) => <Data s={s} />}
    </StaffGate>
  );
}
