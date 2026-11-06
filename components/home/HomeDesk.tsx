'use client';
/**
 * SAREC 1.2 网站首屏办事区（G）
 * - 电脑版：大图右侧叠“最近一场 · 一键报名”卡（带“我的报名与签到码”“加商会微信”）；登录过的人回来，卡上直接是他的报名和签到码。
 * - 手机版（≤ 768px）：状态卡 + 8 个入口 + 信息流 + 底部固定三栏（首页 / 活动 / 我的），和小程序一致。
 * - 网站访客直接报名，不要求先有微信（报名页用邮箱 / 短信验证码）。
 * 数据：GET /api/v1/home?client=web（与小程序同一后台、同一份报名记录）。
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import s from './desk.module.css';

export type HomeEvent = {
  slug: string; title: string; startsAt: string; endsAt: string | null; locationName: string | null; address: string | null;
  feeCents: number; seatsLeft: number | null; coverUrl: string | null; summary: string | null; registrationOpen: boolean; status: string;
};
type Status = {
  phase: 'none' | 'registered' | 'today' | 'ended';
  event: HomeEvent | null;
  registration?: { id: string; status: string; arrival: string };
  checkinQr?: string | null;
  albumPublished?: boolean;
};
export type HomeData = {
  me: { name: string | null; memberNo: number | null; isMember: boolean; tierName: string | null } | null;
  status: Status;
  upcoming: HomeEvent[];
  lastEvent: { slug: string; title: string; startsAt: string; recap: string | null; attended: number; photos: { thumb: string; url: string }[]; albumPublished: boolean } | null;
  albums: { slug: string; title: string; cover: string | null; n: number }[];
  wechatQr: string | null;
};
export type FeedItem = { title: string; href: string; image?: string | null; tag?: string };

const TZ = 'America/Los_Angeles';
const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
function parts(iso: string) {
  const d = new Date(iso);
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: TZ, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short' }).formatToParts(d).map((x) => [x.type, x.value]));
  const wd = new Date(d.toLocaleString('en-US', { timeZone: TZ })).getDay();
  return { m: p.month, d: p.day, hm: `${p.hour === '24' ? '00' : p.hour}:${p.minute}`, wd: WEEK[wd] };
}
export const dayLabel = (iso: string) => { const p = parts(iso); return `${p.m} 月 ${p.d} 日`; };
const timeRange = (e: HomeEvent) => { const a = parts(e.startsAt); return e.endsAt ? `${a.hm}–${parts(e.endsAt).hm}` : a.hm; };
const fee = (c: number) => (c > 0 ? `费用 $${(c / 100).toFixed(c % 100 ? 2 : 0)}` : '免费');
const seats = (e: HomeEvent) => (e.seatsLeft != null ? ` · 剩余 ${e.seatsLeft} 席` : '');

// ── 打点（网站）：匿名访客 id 存本机 ─────────────────────────────────────
function visitorId(): string {
  try {
    let v = localStorage.getItem('sarec_vid');
    if (!v) { v = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('sarec_vid', v); }
    return v;
  } catch { return ''; }
}
export function trackWeb(name: string, target?: string, extra: { channel?: string; ref?: string | null } = {}) {
  try {
    const body = JSON.stringify({ client: 'web', visitor: visitorId() || undefined, items: [{ name, target, ...extra }] });
    if (navigator.sendBeacon) navigator.sendBeacon('/api/v1/track', new Blob([body], { type: 'application/json' }));
    else fetch('/api/v1/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => undefined);
  } catch { /* 打点失败不影响使用 */ }
}

export function useHome() {
  const [d, setD] = useState<HomeData | null>(null);
  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/v1/home?client=web', { credentials: 'same-origin', cache: 'no-store' });
      const j = await r.json();
      if (j?.ok) setD(j);
    } catch { /* 静默：首屏用默认内容 */ }
  }, []);
  useEffect(() => {
    load();
    // 带推荐码进来的访问（?ref=会员编号）记一次
    const ref = new URLSearchParams(location.search).get('ref');
    if (ref) trackWeb('visit', 'home', { ref, channel: new URLSearchParams(location.search).get('channel') ?? 'web' });
  }, [load]);
  return d;
}

// ── 商会微信二维码弹层（页面内，不用系统对话框）─────────────────────────────
export function WechatSheet({ qr, onClose }: { qr: string | null; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className={s.sheetMask} onClick={onClose} role="presentation">
      <div className={s.sheet} role="dialog" aria-modal="true" aria-label="加商会微信" onClick={(e) => e.stopPropagation()}>
        <p className={s.serif} style={{ fontSize: 17, color: 'var(--ivory)' }}>加商会微信</p>
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt="商会微信二维码" className={`${s.qr} ${s.qrBig}`} />
        ) : (
          <p>二维码更新中，请发邮件到 info@sinoamericanrec.org 或致电商会。</p>
        )}
        <p>用微信扫一扫添加。活动变动第一时间通知，有项目也可以直接聊。</p>
        <button className={s.ghost} onClick={onClose}>关闭</button>
      </div>
    </div>
  );
}

// ── 线条图标（金色细线，不用彩色图标）───────────────────────────────────────
const ICONS: Record<string, ReactNode> = {
  events: <><rect x="3" y="5" width="18" height="16" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  mine: <path d="M5 4h14v17l-7-4-7 4z" />,
  checkin: <><rect x="4" y="4" width="6" height="6" /><rect x="14" y="4" width="6" height="6" /><rect x="4" y="14" width="6" height="6" /><path d="M14 14h3v3M20 14v6h-6" /></>,
  invite: <><circle cx="9" cy="8" r="3.5" /><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M17 9h4M19 7v4" /></>,
  card: <><rect x="3" y="6" width="18" height="12" /><path d="M7 10h6M7 14h4" /></>,
  benefits: <path d="M12 3l2.5 5.5 6 .7-4.5 4 1.3 6L12 16l-5.3 3.2 1.3-6-4.5-4 6-.7z" />,
  rooms: <path d="M3 20V9l9-5 9 5v11M3 20h18M9 20v-6h6v6" />,
  contact: <path d="M4 5h16v11H9l-5 4z" />
};
export function LineIcon({ name, size = 26 }: { name: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.3" aria-hidden="true">{ICONS[name]}</svg>;
}

async function shareInvite(d: HomeData | null, ev?: HomeEvent | null) {
  const no = d?.me?.memberNo;
  const url = `${location.origin}${ev ? `/zh/e/${encodeURIComponent(ev.slug)}` : '/zh'}${no ? `?ref=${no}&channel=web` : ''}`;
  const title = ev ? `${ev.title} · SAREC 中美房地产商会` : 'SAREC 中美房地产商会';
  trackWeb('share', ev?.slug ?? 'home');
  try {
    if (navigator.share) { await navigator.share({ title, url }); return; }
  } catch { return; }
  try { await navigator.clipboard.writeText(url); alertInline('链接已复制，可以发给朋友'); } catch { alertInline(url); }
}
function alertInline(msg: string) {
  const el = document.createElement('div');
  el.textContent = msg;
  el.setAttribute('role', 'status');
  Object.assign(el.style, { position: 'fixed', left: '50%', bottom: '96px', transform: 'translateX(-50%)', zIndex: '90', background: 'rgba(6,17,30,0.95)', color: 'var(--ivory)', border: '1px solid var(--gold-dim)', padding: '10px 16px', fontSize: '13px', maxWidth: '90vw' });
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

// ── 状态卡（电脑版大图卡、手机版共用内容）─────────────────────────────────────
function StatusBody({ d, onWechat, compact }: { d: HomeData | null; onWechat: () => void; compact?: boolean }) {
  const st = d?.status;
  const ev = st?.event ?? null;
  if (!ev) {
    return (
      <>
        <div className={s.eyebrow}>近期活动</div>
        <p className={s.title}>新的活动即将公布</p>
        <p className={s.meta}>加商会微信，活动开放报名第一时间通知您。</p>
        <button className={s.primary} onClick={onWechat}>加商会微信</button>
      </>
    );
  }
  const href = `/zh/e/${encodeURIComponent(ev.slug)}`;
  if (st?.phase === 'registered' || st?.phase === 'today') {
    const today = st.phase === 'today';
    return (
      <>
        <div className={s.cardHead}>
          <div className={s.eyebrow}>{today ? '今天 · 我的活动' : '我的下一场'}</div>
          <div className={s.badge}>{st.registration?.status === 'waitlisted' ? '候补中' : st.registration?.arrival === 'checked_in' ? '已签到' : '已报名'}</div>
        </div>
        <p className={s.title}>{ev.title}</p>
        <p className={s.meta}>{dayLabel(ev.startsAt)}（{parts(ev.startsAt).wd}）{timeRange(ev)}<br />{[ev.locationName, ev.address].filter(Boolean).join(' · ')}</p>
        {st.checkinQr && (
          <div className={s.qrRow} style={today ? { flexDirection: 'column', alignItems: 'center' } : undefined}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={st.checkinQr} alt="我的签到码" className={s.qr} style={today ? { width: 200, height: 200 } : undefined} />
            <div>
              <div className={s.eyebrow} style={{ letterSpacing: 0, fontSize: 12 }}>我的签到码</div>
              <p className={s.meta} style={{ fontSize: 12 }}>到场出示给工作人员，或在门口用微信扫活动码</p>
            </div>
          </div>
        )}
        <div className={s.row2}>
          {today ? (
            <a className={s.primary} href={href + '/done'} onClick={() => trackWeb('status_action', 'checkin_code')}>出示签到码</a>
          ) : (
            <a className={s.primary} href={`${href}/done`} onClick={() => trackWeb('status_action', 'schedule')}>查看安排 · 导航</a>
          )}
          <button className={s.ghost} onClick={() => shareInvite(d, ev)}>邀请好友</button>
        </div>
      </>
    );
  }
  if (st?.phase === 'ended') {
    return (
      <>
        <div className={s.eyebrow}>活动已结束 · 感谢参加</div>
        <p className={s.title}>{ev.title}</p>
        <p className={s.meta}>{st.albumPublished ? '现场照片已上传，可以查看资料和相册。' : '现场照片整理中，上传后会通知您。'}</p>
        <a className={s.primary} href={`/zh/album/${encodeURIComponent(ev.slug)}`} onClick={() => trackWeb('status_action', 'album')}>查看资料和相册</a>
      </>
    );
  }
  return (
    <>
      <div className={s.cardHead}>
        <div className={s.eyebrow}>最近一场{compact ? '' : ''}</div>
        <div className={s.dim}>{dayLabel(ev.startsAt)} · {parts(ev.startsAt).wd}</div>
      </div>
      <p className={s.title}>{ev.title}</p>
      <p className={s.meta}>{timeRange(ev)} · {ev.locationName || '地点待定'} · {fee(ev.feeCents)}{seats(ev)}</p>
      <a className={s.primary} href={href} onClick={() => trackWeb('status_action', 'register')}>一键报名</a>
      <p className={s.hint}>只需姓名、手机、行业三项，不用先加微信</p>
    </>
  );
}

/** 电脑版：大图右侧叠卡 */
export function HeroDeskCard() {
  const d = useHome();
  const [wechat, setWechat] = useState(false);
  return (
    <aside className={s.heroCard} aria-label="最近一场活动">
      <StatusBody d={d} onWechat={() => setWechat(true)} />
      <div className={s.links}>
        <Link href="/zh/me" onClick={() => trackWeb('home_entry', 'mine')}>我的报名与签到码</Link>
        <button onClick={() => { setWechat(true); trackWeb('wechat_qr', 'hero'); }}>加商会微信</button>
      </div>
      {wechat && <WechatSheet qr={d?.wechatQr ?? null} onClose={() => setWechat(false)} />}
    </aside>
  );
}

function EvCard({ e, d }: { e: HomeEvent; d: HomeData | null }) {
  return (
    <div className={s.evCard}>
      <Link href={`/zh/e/${encodeURIComponent(e.slug)}`} className={s.evImg} aria-label={e.title}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={e.coverUrl ? `/_next/image?url=${encodeURIComponent(e.coverUrl)}&w=750&q=75` : '/images/home/los-angeles-hero.jpg'} alt="" loading="lazy" />
      </Link>
      <div className={s.evBody}>
        <div className={s.eyebrow}>{dayLabel(e.startsAt)} · {parts(e.startsAt).wd}</div>
        <Link href={`/zh/e/${encodeURIComponent(e.slug)}`} style={{ color: 'inherit', textDecoration: 'none' }}><p className={s.evTitle}>{e.title}</p></Link>
        <p className={s.meta} style={{ fontSize: 12 }}>{fee(e.feeCents)} · {e.locationName || '地点待定'}{seats(e)}</p>
        <div className={s.evActions}>
          {e.registrationOpen ? <a className={s.primary} href={`/zh/e/${encodeURIComponent(e.slug)}`}>报名</a> : <span className={s.dim}>报名已截止</span>}
          <button className={s.ghost} onClick={() => shareInvite(d, e)}>分享</button>
        </div>
      </div>
    </div>
  );
}

/** 电脑版：大图下方“近期活动 + 商会 AI 助手” */
export function HomeEventsAndAgent({ agent }: { agent?: ReactNode }) {
  const d = useHome();
  const list = d?.upcoming ?? [];
  return (
    <section className={`${s.wrap} ${s.section} ${s.desktopOnly}`} aria-labelledby="home-events">
      <div className={s.split}>
        <div className={s.splitMain}>
          <div className={s.sectionHead}>
            <h2 id="home-events" className={s.sectionTitle}>近期活动</h2>
            <Link href="/zh/events#open" className={s.more}>全部活动</Link>
          </div>
          {d && !list.length ? <p className={s.empty}>新的活动即将公布。</p> : (
            <div className={s.cards}>{list.slice(0, 2).map((e) => <EvCard key={e.slug} e={e} d={d} />)}</div>
          )}
        </div>
        {agent && <div className={s.splitSide}>{agent}</div>}
      </div>
    </section>
  );
}

const ENTRIES: { key: string; label: string; href?: string; action?: 'invite' | 'checkin' }[] = [
  { key: 'events', label: '活动报名', href: '/zh/events#open' },
  { key: 'mine', label: '我的报名', href: '/zh/me' },
  { key: 'checkin', label: '现场签到', action: 'checkin' },
  { key: 'invite', label: '邀请好友', action: 'invite' },
  { key: 'card', label: '我的名片', href: '/zh/me/card' },
  { key: 'benefits', label: '会员权益', href: '/zh/benefits' },
  { key: 'rooms', label: '会议室', href: '/zh/rooms' },
  { key: 'contact', label: '联系商会', href: '/zh/contact' }
];

/** 活动页顶部：数据库里可报名的近期活动（电脑、手机都显示） */
export function OpenEventsSection() {
  const d = useHome();
  const list = d?.upcoming ?? [];
  return (
    <section id="open" className={`${s.wrap} ${s.section} ${s.openSection}`} aria-labelledby="open-events">
      <div className={s.sectionHead}>
        <h2 id="open-events" className={s.sectionTitle}>近期活动 · 在线报名</h2>
      </div>
      {!d ? <p className={s.empty}>正在加载…</p> : !list.length ? <p className={s.empty}>新的活动即将公布。也可以添加商会微信，第一时间收到通知。</p> : (
        <div className={`${s.cards} ${s.cardsResp}`}>{list.map((e) => <EvCard key={e.slug} e={e} d={d} />)}</div>
      )}
    </section>
  );
}

/** 手机版服务台（≤ 768px） */
export function MobileDesk({ feed }: { feed: FeedItem[] }) {
  const d = useHome();
  const [wechat, setWechat] = useState(false);
  const [checkinHelp, setCheckinHelp] = useState(false);
  const fresh = !d?.me; // 新访客：天际线大图 + 品牌标语，再接状态卡
  return (
    <div className={s.mobile}>
      {fresh ? (
        <div className={s.mHero}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/home/los-angeles-hero.jpg" alt="洛杉矶天际线" />
          <div className={s.mHeroText}>
            <div className={s.eyebrow} style={{ letterSpacing: 3, marginBottom: 10 }}>SINO-AMERICAN REAL ESTATE CHAMBER</div>
            <div className={s.serif} style={{ fontSize: 26, lineHeight: 1.3, fontWeight: 600 }}>中美房地产商会</div>
            <p className={s.meta} style={{ marginTop: 8 }}>连接中美资本，重构房地产项目协作 · 洛杉矶</p>
          </div>
        </div>
      ) : (
        <div className={s.mWordmark}><b>SAREC</b><span>中美房地产商会</span></div>
      )}
      <div className={`${s.status} ${fresh ? s.first : ''}`}>
        <StatusBody d={d} onWechat={() => setWechat(true)} compact />
      </div>
      <div className={s.wechatRow}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>加商会微信</div>
          <div className={s.dim}>活动变动第一时间通知</div>
        </div>
        <button className={s.ghost} style={{ height: 36, fontSize: 12 }} onClick={() => { setWechat(true); trackWeb('wechat_qr', 'home'); }}>添加</button>
      </div>

      <nav className={s.entries} aria-label="常用功能">
        {ENTRIES.map((x) =>
          x.href ? (
            <Link key={x.key} href={x.href} className={s.entry} onClick={() => trackWeb('home_entry', x.key)}><LineIcon name={x.key} /><span>{x.label}</span></Link>
          ) : (
            <button key={x.key} className={s.entry} onClick={() => {
              trackWeb('home_entry', x.key);
              if (x.action === 'invite') shareInvite(d, d?.status.event ?? null);
              else setCheckinHelp(true);
            }}><LineIcon name={x.key} /><span>{x.label}</span></button>
          )
        )}
      </nav>
      {checkinHelp && (
        <div className={s.sheetMask} onClick={() => setCheckinHelp(false)} role="presentation">
          <div className={s.sheet} role="dialog" aria-modal="true" aria-label="现场签到" onClick={(e) => e.stopPropagation()}>
            <p className={s.serif} style={{ fontSize: 17, color: 'var(--ivory)' }}>现场签到</p>
            <p>到场后用微信“扫一扫”扫门口的活动码即可签到；或打开“我的报名”出示个人签到码，由工作人员核验。</p>
            <Link href="/zh/me" className={s.primary} style={{ width: '100%' }}>我的报名与签到码</Link>
            <button className={s.ghost} onClick={() => setCheckinHelp(false)}>关闭</button>
          </div>
        </div>
      )}

      {(d?.upcoming?.length ?? 0) > 0 && (
        <>
          <div className={s.mHead}><h2>近期活动</h2><Link href="/zh/events#open">全部</Link></div>
          {d!.upcoming.slice(0, 3).map((e) => (
            <div key={e.slug} className={s.mEv}>
              <Link href={`/zh/e/${encodeURIComponent(e.slug)}`} className={s.mEvImg}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={e.coverUrl ? `/_next/image?url=${encodeURIComponent(e.coverUrl)}&w=750&q=75` : '/images/home/los-angeles-hero.jpg'} alt="" loading="lazy" />
                <span>{dayLabel(e.startsAt)}</span>
              </Link>
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p className={s.evTitle} style={{ fontSize: 16 }}>{e.title}</p>
                <p className={s.meta} style={{ fontSize: 12 }}>{fee(e.feeCents)} · {e.locationName || '地点待定'}{seats(e)}</p>
                <div className={s.evActions}>
                  {e.registrationOpen && <a className={s.primary} href={`/zh/e/${encodeURIComponent(e.slug)}`}>报名</a>}
                  <button className={s.ghost} onClick={() => shareInvite(d, e)}>分享</button>
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {d?.lastEvent && d.lastEvent.photos.length > 0 && (
        <>
          <div className={s.mHead}><h2>上一场回顾</h2><Link href={`/zh/album/${encodeURIComponent(d.lastEvent.slug)}`} onClick={() => trackWeb('album_open', d.lastEvent!.slug)}>相册</Link></div>
          <div className={s.photos}>
            {d.lastEvent.photos.map((p, i) => (
              <Link key={i} href={`/zh/album/${encodeURIComponent(d.lastEvent!.slug)}`} aria-label="打开相册">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.thumb} alt="活动现场" loading="lazy" />
              </Link>
            ))}
          </div>
          <p className={s.caption}>{d.lastEvent.recap || `${d.lastEvent.title} · ${dayLabel(d.lastEvent.startsAt)}`}</p>
        </>
      )}

      {feed.length > 0 && (
        <>
          <div className={s.mHead}><h2>研究与动态</h2><Link href="/zh/research">全部</Link></div>
          <div className={s.feed}>
            {feed.map((f) => (
              <Link key={f.href} href={f.href} className={s.feedItem}>
                <div className={s.feedImg}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {f.image && <img src={f.image} alt="" loading="lazy" />}
                </div>
                <div>
                  <p className={s.feedTitle}>{f.title}</p>
                  <div className={s.dim}>{f.tag ?? '研究'}</div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      <Link href="/zh/about" className={s.about}>
        <span>关于商会 · 服务 · 联系</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
      </Link>
      {wechat && <WechatSheet qr={d?.wechatQr ?? null} onClose={() => setWechat(false)} />}
    </div>
  );
}

/** 手机版底部固定三栏：首页 / 活动 / 我的（和小程序一致；电脑版不显示） */
export function MobileTabBar() {
  const path = usePathname() || '';
  // 只在三个栏目页显示（报名页、付款页等有自己的底部按钮，不叠加）
  const show = path === '/zh' || path === '/zh/' || path === '/zh/events' || path === '/zh/events/' || path === '/zh/me' || path === '/zh/me/';
  if (!show) return null;
  const on = (k: string) => (k === 'home' ? path === '/zh' || path === '/zh/' : k === 'events' ? path.startsWith('/zh/events') : path.startsWith('/zh/me'));
  const tab = (k: string, href: string, label: string, icon: ReactNode) => (
    <Link href={href} className={`${s.tab} ${on(k) ? s.tabOn : ''}`} aria-current={on(k) ? 'page' : undefined}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">{icon}</svg>
      <span>{label}</span>
    </Link>
  );
  return (
    <>
      <div className={s.tabSpacer} aria-hidden="true" />
      <nav className={s.tabbar} aria-label="底部导航">
        {tab('home', '/zh', '首页', <path d="M3 11l9-7 9 7v9H3z" />)}
        {tab('events', '/zh/events#open', '活动', <><rect x="3" y="5" width="18" height="16" /><path d="M3 10h18" /></>)}
        {tab('me', '/zh/me', '我的', <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></>)}
      </nav>
    </>
  );
}
