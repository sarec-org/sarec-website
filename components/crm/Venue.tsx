'use client';
/**
 * 会员权益与场地：会议室三步预约、会场月卡、电子屏申请、商家优惠。
 * 会员价未公布前显示“会员价即将公布”，按标准价下单（C.4）。
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, money, useDraft } from './client';
import { LoginBox } from './LoginBox';
import s from './crm.module.css';

const TZ = 'America/Los_Angeles';

type Rooms = {
  rooms: { id: number; name: string; hourly_cents: number; my_hourly_cents: number }[];
  busy: { room_id: number; starts_at: string; ends_at: string; mine: boolean }[];
  openHours: { from: number; to: number };
  pass: { standardCents: number; myCents: number; pricesPublished: boolean; mine: { month_start: string; status: string }[] };
  tier: string | null;
  notice: string;
};

function laOffsetMin(utcMs: number): number {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(utcMs));
  const g = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return (Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute')) - utcMs) / 60000;
}
/** 洛杉矶当地日期时间 → UTC 时间戳 */
function laToUtc(ymd: string, minutes: number): number {
  const [y, m, d] = ymd.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d, Math.floor(minutes / 60), minutes % 60);
  return guess - laOffsetMin(guess) * 60000;
}
function laToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
}
function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

function useLogin() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const check = useCallback(async () => setLoggedIn((await api('/api/v1/me')).ok), []);
  useEffect(() => { check(); }, [check]);
  return { loggedIn, check };
}

export function RoomsPage() {
  const router = useRouter();
  const { loggedIn, check } = useLogin();
  const [day, setDay] = useState(laToday());
  const [data, setData] = useState<Rooms | null>(null);
  const [roomId, setRoomId] = useState<number | null>(null);
  const [sel, setSel] = useState<{ a: number; b: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(laToday(), i)), []);

  const load = useCallback(async () => {
    const r = await api<Rooms>(`/api/v1/rooms?from=${new Date(laToUtc(day, 0)).toISOString()}&days=1`);
    if (!r.ok) return setErr(r.message);
    setData(r.data);
    setRoomId((x) => x ?? r.data.rooms[0]?.id ?? null);
  }, [day]);
  useEffect(() => { setSel(null); load(); }, [load]);

  if (!data) return <div className={s.page}><p className={s.small}>{err ?? '加载中…'}</p></div>;
  const room = data.rooms.find((r) => r.id === roomId) ?? data.rooms[0];
  const slots: number[] = [];
  for (let m = data.openHours.from * 60; m < data.openHours.to * 60; m += 30) slots.push(m);
  const isBusy = (m: number) => {
    const t = laToUtc(day, m);
    return t < Date.now() || data.busy.some((b) => b.room_id === room?.id && new Date(b.starts_at).getTime() < t + 30 * 60000 && new Date(b.ends_at).getTime() > t);
  };
  function tap(m: number) {
    setErr(null);
    setOk(null);
    if (isBusy(m)) return;
    if (!sel || sel.b !== sel.a + 30 || m < sel.a) return setSel({ a: m, b: m + 30 });
    // 第二次点：扩展为区间（中间不能有占用）
    for (let x = sel.a; x <= m; x += 30) if (isBusy(x)) return setSel({ a: m, b: m + 30 });
    setSel({ a: sel.a, b: m + 30 });
  }
  const hours = sel ? (sel.b - sel.a) / 60 : 0;
  const passThisMonth = data.pass.mine.some((p) => p.month_start.slice(0, 7) === day.slice(0, 7) && p.status === 'active');

  async function book() {
    if (!sel || !room) return;
    setBusy(true);
    setErr(null);
    const r = await api<{ booking: { kind: string; orderNo?: string } }>('/api/v1/rooms/book', {
      body: { roomId: room.id, startsAt: new Date(laToUtc(day, sel.a)).toISOString(), endsAt: new Date(laToUtc(day, sel.b)).toISOString() }
    });
    setBusy(false);
    if (!r.ok) {
      setErr(r.message);
      load();
      return;
    }
    if (r.data.booking.kind === 'confirmed') {
      setOk('预约成功（会场月卡，无需付款）');
      setSel(null);
      load();
    } else if (r.data.booking.orderNo) router.push(`/zh/pay/${r.data.booking.orderNo}`);
  }

  return (
    <div className={s.page}>
      <Link href="/zh/benefits" className={s.back}>‹ 会员权益</Link>
      <p className={s.eyebrow}>MEETING ROOM · 会议室</p>
      <h1 className={s.h1}>预约会议室</h1>
      <p className={s.muted}>① 选日期和时段 → ② 确认您的价格 → ③ 付款。先定先得，可随时自助取消。</p>
      {data.rooms.length > 1 && (
        <div className={s.chips} style={{ marginBottom: '1rem' }}>
          {data.rooms.map((r) => <button key={r.id} className={`${s.chip} ${r.id === room?.id ? s.chipOn : ''}`} onClick={() => { setRoomId(r.id); setSel(null); }}>{r.name}</button>)}
        </div>
      )}
      <div className={s.tabs}>
        {days.map((d) => {
          const dt = new Date(laToUtc(d, 12 * 60));
          return (
            <button key={d} className={`${s.tab} ${d === day ? s.tabOn : ''}`} onClick={() => setDay(d)}>
              {new Intl.DateTimeFormat('zh-CN', { timeZone: TZ, month: 'numeric', day: 'numeric', weekday: 'short' }).format(dt)}
            </button>
          );
        })}
      </div>
      <p className={s.small}>点一个时段开始，再点后面的时段延长。灰色划线 = 已被预约或已过去。</p>
      <div className={s.slots}>
        {slots.map((m) => {
          const b = isBusy(m);
          const on = sel && m >= sel.a && m < sel.b;
          return <button key={m} className={`${s.slot} ${b ? s.slotBusy : ''} ${on ? s.slotOn : ''}`} disabled={b} onClick={() => tap(m)} aria-pressed={!!on}>{hhmm(m)}</button>;
        })}
      </div>
      {ok && <p className={s.success} style={{ marginTop: '1rem' }}>{ok}</p>}
      {err && <p className={s.error} style={{ marginTop: '1rem' }} role="alert">{err}</p>}

      {sel && room && (
        <div className={`${s.card} ${s.cardGold}`} style={{ marginTop: '1rem' }}>
          <p className={s.cardTitle}>{room.name} · {day} {hhmm(sel.a)}–{hhmm(sel.b)}（{hours} 小时）</p>
          {passThisMonth ? (
            <p>您有本月会场月卡：<b>免费</b>，直接确认。</p>
          ) : (
            <p>
              您的价格：<b style={{ color: 'var(--gold-bright)' }}>{money(Math.round(room.my_hourly_cents * hours))}</b>
              <span className={s.small}>（标准价 {money(room.hourly_cents)}/小时{data.pass.pricesPublished ? '' : '；会员价即将公布'}）</span>
            </p>
          )}
          {loggedIn === false ? (
            <LoginBox onDone={check} />
          ) : (
            <button className={`${s.btn} ${s.btnBlock}`} disabled={busy} onClick={book}>{busy ? '处理中…' : passThisMonth ? '确认预约' : '确认，去付款'}</button>
          )}
        </div>
      )}
      <RoomPass data={data} loggedIn={loggedIn} check={check} />
    </div>
  );
}

function RoomPass({ data, loggedIn, check }: { data: Rooms; loggedIn: boolean | null; check: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const today = laToday();
  const months = [today.slice(0, 7), addDays(today.slice(0, 7) + '-01', 32).slice(0, 7)];
  async function buy(month: string) {
    setBusy(true);
    setErr(null);
    const r = await api<{ orderNo: string | null; status: string }>('/api/v1/rooms/pass', { body: { month } });
    setBusy(false);
    if (!r.ok) return setErr(r.message);
    if (r.data.status === 'active') return setErr('这个月的月卡已经生效了');
    if (r.data.orderNo) router.push(`/zh/pay/${r.data.orderNo}`);
  }
  return (
    <div className={s.card} style={{ marginTop: '2rem' }}>
      <p className={s.cardTitle}>会场月卡 {money(data.pass.standardCents)}/月</p>
      <p className={s.muted}>开放时段内不限小时、不限时段，在线预约，先定先得。{data.pass.pricesPublished ? `您的价格 ${money(data.pass.myCents)}/月。` : '会员价即将公布，现按标准价办理。'}</p>
      <p className={s.small}>{data.notice}</p>
      {err && <p className={s.error}>{err}</p>}
      {loggedIn === false ? (
        <LoginBox onDone={check} />
      ) : (
        <div className={s.btnRow}>
          {months.map((m) => {
            const mine = data.pass.mine.find((p) => p.month_start.slice(0, 7) === m);
            return (
              <button key={m} className={`${s.btn} ${mine ? s.btnQuiet : s.btnGhost}`} disabled={busy || mine?.status === 'active'} onClick={() => buy(m)}>
                {m} {mine?.status === 'active' ? '已生效' : mine?.status === 'pending' ? '继续付款' : '办理'}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

type Offer = { id: string; merchant: string; category: string | null; offer: string; conditions: string | null; contact: string | null; valid_until: string | null };

export function BenefitsPage() {
  const [offers, setOffers] = useState<Offer[] | null>(null);
  useEffect(() => { api<{ offers: Offer[] }>('/api/v1/offers').then((r) => setOffers(r.ok ? r.data.offers : [])); }, []);
  return (
    <div className={s.page}>
      <Link href="/zh/me" className={s.back}>‹ 我的</Link>
      <p className={s.eyebrow}>BENEFITS · 会员权益</p>
      <h1 className={s.h1}>会员权益与场地服务</h1>
      <div className={s.card}>
        <p className={s.cardTitle}>随时到访</p>
        <p className={s.muted}>缴费会员在办公室开放期间随时来喝茶、交流项目，可带朋友和客户；不限次数、不扣积分、不用领券。</p>
      </div>
      <div className={s.card}>
        <p className={s.cardTitle}>专委会与俱乐部</p>
        <p className={s.muted}>陆续成立投资委员会、开发建设专委会、设计联盟及兴趣俱乐部等；活动不承诺固定场次，统一在活动日历发布。棋牌类活动只做娱乐联谊，不涉及金钱输赢，商会不抽水。</p>
      </div>
      <div className={s.grid2}>
        <Link href="/zh/rooms" className={`${s.card} ${s.cardGold}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          <p className={s.cardTitle}>预约会议室 ›</p>
          <p className={s.small}>按会员等级优惠（会员价即将公布）；会场月卡 $299/月</p>
        </Link>
        <Link href="/zh/screen" className={`${s.card} ${s.cardGold}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          <p className={s.cardTitle}>电子屏展示申请 ›</p>
          <p className={s.small}>副会长、战略伙伴单位免费轮播</p>
        </Link>
      </div>
      <h2 className={s.h2}>商家优惠</h2>
      {offers === null ? <p className={s.small}>加载中…</p> : offers.length === 0 ? <p className={s.muted}>合作商家优惠正在洽谈，谈妥后会在这里公布。</p> : (
        <ul className={s.list}>
          {offers.map((o) => (
            <li key={o.id} className={s.listItem}>
              <b>{o.merchant}</b>{o.category && <span className={`${s.badge} ${s.badgeMuted}`}>{o.category}</span>}
              <div>{o.offer}</div>
              <div className={s.small}>{[o.conditions, o.contact, o.valid_until ? `有效期至 ${o.valid_until}` : null].filter(Boolean).join(' · ')}</div>
            </li>
          ))}
        </ul>
      )}
      <p className={s.small} style={{ marginTop: '1rem' }}>到店出示“我的”页面的会员身份即可享受。</p>
    </div>
  );
}

export function ScreenApply() {
  const { loggedIn, check } = useLogin();
  const [info, setInfo] = useState<{ free: boolean; tier: string | null; pricesPublished: boolean; mine: { id: string; org_name: string; status: string; order_no: string | null; order_status: string | null; staff_note: string | null }[] } | null>(null);
  const [f, setF, clear] = useDraft('screen', { orgName: '', intro: '', serviceArea: '', qrUrl: '', assetUrl: '', months: 1 });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const load = useCallback(async () => { const r = await api<NonNullable<typeof info>>('/api/v1/screen-ads'); if (r.ok) setInfo(r.data); }, []);
  useEffect(() => { load(); }, [load, loggedIn]);

  function pick(key: 'qrUrl' | 'assetUrl', file: File | undefined) {
    if (!file) return;
    if (file.size > 1_000_000) return setMsg({ ok: false, text: '图片太大，请换一张小于 1MB 的图片' });
    const rd = new FileReader();
    rd.onload = () => setF({ ...f, [key]: String(rd.result) });
    rd.readAsDataURL(file);
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const r = await api<{ message: string }>('/api/v1/screen-ads', { body: f });
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, text: r.message });
    clear();
    setF({ orgName: '', intro: '', serviceArea: '', qrUrl: '', assetUrl: '', months: 1 });
    setMsg({ ok: true, text: r.data.message });
    load();
  }
  return (
    <div className={s.page}>
      <Link href="/zh/benefits" className={s.back}>‹ 会员权益</Link>
      <p className={s.eyebrow}>DISPLAY · 电子屏</p>
      <h1 className={s.h1}>电子屏展示申请</h1>
      <p className={s.muted}>展示单位名称、业务介绍、服务区域及联系二维码，统一素材规格和轮播时长。{info?.free ? '您的单位等级可免费轮播。' : '副会长、战略伙伴单位免费；其他单位按等级收费（价格即将公布），审核排期后在“我的订单”里显示应付金额。'}</p>
      {loggedIn === false ? <LoginBox onDone={check} /> : (
        <form onSubmit={submit}>
          <div className={s.field}><label className={s.label}>单位名称<span className={s.required}>*</span></label><input className={s.input} value={f.orgName} onChange={(e) => setF({ ...f, orgName: e.target.value })} /></div>
          <div className={s.field}><label className={s.label}>业务介绍<span className={s.required}>*</span></label><textarea className={s.textarea} value={f.intro} onChange={(e) => setF({ ...f, intro: e.target.value })} placeholder="一两句话，展示在屏幕上" /></div>
          <div className={s.field}><label className={s.label}>服务区域</label><input className={s.input} value={f.serviceArea} onChange={(e) => setF({ ...f, serviceArea: e.target.value })} placeholder="例如：洛杉矶县、橙县" /></div>
          <div className={s.field}><label className={s.label}>联系二维码（图片）</label><input className={s.input} type="file" accept="image/*" onChange={(e) => pick('qrUrl', e.target.files?.[0])} />{f.qrUrl && <span className={s.small}>已选择 ✓</span>}</div>
          <div className={s.field}><label className={s.label}>展示素材（图片，可选）</label><input className={s.input} type="file" accept="image/*" onChange={(e) => pick('assetUrl', e.target.files?.[0])} />{f.assetUrl && <span className={s.small}>已选择 ✓</span>}</div>
          <div className={s.field}><label className={s.label}>展示几个月</label>
            <div className={s.chips}>{[1, 3, 6, 12].map((m) => <button type="button" key={m} className={`${s.chip} ${f.months === m ? s.chipOn : ''}`} onClick={() => setF({ ...f, months: m })}>{m} 个月</button>)}</div>
          </div>
          {msg && <p className={msg.ok ? s.success : s.error}>{msg.text}</p>}
          <button className={`${s.btn} ${s.btnBlock}`} disabled={busy || !f.orgName.trim() || !f.intro.trim()}>{busy ? '处理中…' : '提交申请'}</button>
        </form>
      )}
      {info && info.mine.length > 0 && (
        <>
          <h2 className={s.h2}>我的申请</h2>
          <ul className={s.list}>
            {info.mine.map((a) => (
              <li key={a.id} className={s.listItem}>
                <b>{a.org_name}</b> <span className={s.badge}>{({ submitted: '审核中', approved: '已通过', scheduled: '已排期', rejected: '未通过', cancelled: '已取消' } as Record<string, string>)[a.status]}</span>
                {a.staff_note && <div className={s.small}>{a.staff_note}</div>}
                {a.order_no && a.order_status === 'pending_payment' && <Link href={`/zh/pay/${a.order_no}`} style={{ color: 'var(--gold)' }}>去付款 ›</Link>}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
