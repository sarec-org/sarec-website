'use client';
/**
 * 真机速度（指令 31 第二部分，11/22）：体验版 / 开发版小程序的真机计时（冷启动各阶段、进页面耗时、每个请求耗时、机型和网络）。
 * 只在测试站收（体验版连测试站）；正式站不收、这页显示空。不带任何个人信息：会话号每次打开随机生成。
 * 挂在「设置与团队 → 系统状态」旁边，只给工作人员（ops / admin）看。
 */
import { useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { StaffGate } from '@/components/crm/staff/StaffGate';
import { api } from '@/components/crm/client';

type Mark = { kind: string; name: string; t: number | null; ms: number; status: number | null; extra: string };
type Session = {
  sid: string; first_at: string; version: string; env: string; brand: string; model: string; platform: string; system: string;
  wx_version: string; sdk: string; bench: number | null; net: string; scene: number | null; cold: boolean | null; marks: Mark[];
};
type Agg = { name: string; n: number; p50: number; p90: number; max: number; fails: number; models: string[] };
type Data = { enabled: boolean; sessions: Session[]; reqs: Agg[]; pages: Agg[]; models: { model: string; n: number }[] };

// 冷启动分段的大白话（小程序里 utils/perf.js 打的点 + 微信自带的性能条目）
const STAGE: Record<string, string> = {
  appLaunch: '微信启动小程序（含下载代码包）',
  downloadPackage: '下载代码包',
  evaluateScript: '执行代码',
  firstRender: '首页第一次画出来',
  firstPaint: '首次绘制',
  firstContentfulPaint: '首次出内容',
  largestContentfulPaint: '最大内容出来',
  route: '页面切换',
  'app.js': '小程序代码开始跑',
  'app.launch': 'onLaunch',
  'home.load': '首页 onLoad',
  'home.skeleton': '首页先画骨架（没有上次内容）',
  'home.cache': '首页先画上次内容',
  'home.ready': '首页 onReady（能点）',
  'home.data': '首页新内容到位',
  'home.all': '首页名片/找工人等全部到位',
  'login.wx': 'wx.login 拿 code',
  'login.api': '登录接口',
  login: '整个登录'
};
const ms = (n: number | null | undefined) => (n == null ? '—' : n >= 1000 ? `${(n / 1000).toFixed(2)} 秒` : `${n} 毫秒`);
const when = (s: string) => new Date(s).toLocaleString('zh-CN', { timeZone: 'America/Los_Angeles', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
const color = (n: number, good: number, bad: number) => (n <= good ? '#3BA776' : n <= bad ? '#C9A567' : '#E0645A');

function first(s: Session, kind: string, name: string) { return s.marks.find((m) => m.kind === kind && m.name === name); }
function headline(s: Session) {
  const launch = first(s, 'wx', 'appLaunch');
  const paint = first(s, 'launch', 'home.cache') || first(s, 'launch', 'home.skeleton');
  const ready = first(s, 'launch', 'home.ready');
  const data = first(s, 'launch', 'home.data');
  const pages = s.marks.filter((m) => m.kind === 'page');
  const reqs = s.marks.filter((m) => m.kind === 'req');
  return { launch, paint, ready, data, pages, reqs };
}

export default function Speed() {
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState('');
  const [days, setDays] = useState(3);
  const [model, setModel] = useState('');
  const [open, setOpen] = useState<string>('');
  useEffect(() => {
    api<Data>(`/api/v1/staff/perf?days=${days}&limit=40&model=${encodeURIComponent(model)}`).then((r) => (r.ok ? setD(r.data) : setErr(r.message)));
  }, [days, model]);
  return (
    <StaffGate title="真机速度" role={['ops', 'admin']} wide>
      {() => (
        <>
          <p className={styles.lead}>体验版小程序在真手机上打开、点页面时自动记下的耗时（只在测试站收，正式版不带）。不带任何个人信息：每次打开一个随机会话号，只记机型和网络。</p>
          <p className={styles.small}>怎么看：每一行是一次打开。「首页能点」= 从微信开始启动到首页画出来能点；「首页新内容」= 首页最新数据到位；下面「进页面」= 从点下去到内容出来。绿 = 达标，黄 = 接近，红 = 慢。时间是洛杉矶时间。</p>
          <div className={styles.btnRow}>
            {[1, 3, 7, 30].map((x) => <button key={x} className={`${styles.btn} ${x === days ? '' : styles.btnQuiet}`} onClick={() => setDays(x)}>最近 {x} 天</button>)}
            {d && d.models.length > 1 && (
              <select value={model} onChange={(e) => setModel(e.target.value)} className={styles.input} style={{ maxWidth: 260 }}>
                <option value="">全部机型</option>
                {d.models.map((m) => <option key={m.model} value={m.model}>{m.model || '（未知）'} · {m.n} 次</option>)}
              </select>
            )}
          </div>
          {err && <p className={styles.error}>{err}</p>}
          {d && !d.enabled && <p className={styles.small}>正式站不收集真机计时（只有测试站收体验版的数据）。请到测试站后台看这一页。</p>}
          {d && d.enabled && !d.sessions.length && <p className={styles.small}>最近 {days} 天还没有数据。用体验版打开小程序、点几个页面，过半分钟刷新这一页。</p>}

          {d && d.sessions.length > 0 && (
            <>
              <h2 className={styles.h2}>最近打开（{d.sessions.length} 次）</h2>
              <div style={{ overflowX: 'auto' }}>
                <table className={styles.table}>
                  <thead><tr><th>时间</th><th>机型 · 网络</th><th>冷/热</th><th>微信启动</th><th>首页能点</th><th>首页新内容</th><th>进页面（最慢）</th><th>请求数</th><th></th></tr></thead>
                  <tbody>
                    {d.sessions.map((s) => {
                      const h = headline(s);
                      const slowPage = h.pages.reduce<Mark | null>((a, m) => (!a || m.ms > a.ms ? m : a), null);
                      const paintT = h.ready?.t ?? h.paint?.t ?? null;
                      return (
                        <tr key={s.sid}>
                          <td className={styles.small}>{when(s.first_at)}</td>
                          <td className={styles.small}>{s.model || '—'} · {s.platform} {s.system}<br />{s.net || '—'} · 微信 {s.wx_version} · 基础库 {s.sdk}{s.env === 'develop' ? ' · 开发版' : ''}</td>
                          <td className={styles.small}>{s.cold === false ? '热' : '冷'}{s.scene ? ` · ${s.scene}` : ''}</td>
                          <td className={styles.small}>{ms(h.launch?.ms)}</td>
                          <td className={styles.small} style={paintT != null ? { color: color(paintT, 1000, 2000) } : undefined}>{ms(paintT)}{h.paint ? (h.paint.name === 'home.cache' ? '（上次内容）' : '（骨架）') : ''}</td>
                          <td className={styles.small} style={h.data?.t != null ? { color: color(h.data.t, 1500, 3000) } : undefined}>{ms(h.data?.t)}</td>
                          <td className={styles.small} style={slowPage ? { color: color(slowPage.ms, 500, 1000) } : undefined}>{slowPage ? `${ms(slowPage.ms)} ${slowPage.name.replace(/^pages\//, '')}` : '—'}{h.pages.length ? `（共 ${h.pages.length} 次）` : ''}</td>
                          <td className={styles.small}>{h.reqs.length}</td>
                          <td><button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => setOpen(open === s.sid ? '' : s.sid)}>{open === s.sid ? '收起' : '分段'}</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {d.sessions.filter((s) => s.sid === open).map((s) => (
                <div key={s.sid} className={styles.card} style={{ marginTop: 12 }}>
                  <p className={styles.cardTitle}>{when(s.first_at)} · {s.model} · {s.net} · 全部分段（按发生时间）</p>
                  <div style={{ overflowX: 'auto' }}>
                    <table className={styles.table}>
                      <thead><tr><th>开始于</th><th>类别</th><th>哪一段</th><th>耗时</th><th>状态</th></tr></thead>
                      <tbody>
                        {s.marks.map((m, i) => (
                          <tr key={i}>
                            <td className={styles.small}>{ms(m.t)}</td>
                            <td className={styles.small}>{{ launch: '启动', page: '进页面', req: '请求', wx: '微信' }[m.kind] ?? m.kind}</td>
                            <td className={styles.small} style={{ wordBreak: 'break-all' }}>{STAGE[m.name] ? `${STAGE[m.name]}（${m.name}）` : m.name}{m.extra ? ` · ${m.extra}` : ''}</td>
                            <td className={styles.small} style={m.kind === 'page' ? { color: color(m.ms, 500, 1000) } : m.kind === 'req' ? { color: color(m.ms, 300, 800) } : undefined}>{ms(m.ms)}</td>
                            <td className={styles.small}>{m.status == null ? '' : m.status === 0 ? '网络不通' : m.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              <h2 className={styles.h2}>进页面排行（从点下去到内容出来，按 90% 分位从慢到快）</h2>
              <AggTable rows={d.pages} good={500} bad={1000} />
              <h2 className={styles.h2}>慢请求排行（按 90% 分位从慢到快）</h2>
              <AggTable rows={d.reqs} good={300} bad={800} />
            </>
          )}
        </>
      )}
    </StaffGate>
  );
}

function AggTable({ rows, good, bad }: { rows: Agg[]; good: number; bad: number }) {
  if (!rows.length) return <p className={styles.small}>暂无。</p>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className={styles.table}>
        <thead><tr><th>页面 / 接口</th><th>次数</th><th>一半以内</th><th>九成以内</th><th>最慢</th><th>失败</th><th>机型</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td className={styles.small} style={{ wordBreak: 'break-all' }}>{r.name}</td>
              <td className={styles.small}>{r.n}</td>
              <td className={styles.small} style={{ color: color(r.p50, good, bad) }}>{ms(r.p50)}</td>
              <td className={styles.small} style={{ color: color(r.p90, good, bad) }}>{ms(r.p90)}</td>
              <td className={styles.small}>{ms(r.max)}</td>
              <td className={styles.small}>{r.fails || ''}</td>
              <td className={styles.small}>{r.models.filter(Boolean).join('、')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
