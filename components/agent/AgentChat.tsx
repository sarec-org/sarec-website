'use client';
/**
 * 商会 AI 助手 —— 对话框（客户端组件）。
 * ------------------------------------------------------------------
 *   variant="panel"：内嵌卡片（首页“近期活动”右侧，由首页挂载）。
 *   variant="launcher"：右下角小按钮，点开同一个对话框（文章页、活动页）；
 *     文章读到一半 / 活动页停留 30 秒，弹一次固定问候（不调模型），其余时间保持安静。
 * 报名 / 预约咨询 / 入会都只显示“确认卡片”，访客点击确认后才调用接口提交。
 * 对话记录存在本标签页 sessionStorage，切换页面不丢；不存任何密钥。
 */
import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import s from './AgentChat.module.css';

export type AgentContext = { page: 'home' | 'article' | 'event'; slug?: string; title?: string };

type Lead = { need?: string; region?: string; timeline?: string; wantsCall?: boolean | null; name?: string; phone?: string; email?: string; wechat?: string };
type Action =
  | { type: 'register'; slug: string; title: string; when: string; loggedIn: boolean }
  | { type: 'lead'; lead: Lead }
  | { type: 'join'; href: string; label: string };
type Msg = { id: string; role: 'user' | 'bot' | 'note'; text: string; actions?: Action[]; tier?: number | null };
type Stored = { conversationId: string | null; messages: Msg[] };

const STORE_KEY = 'sarec:agent:v1';
const OPENING = '您好，我是商会 AI 助手。想了解活动、入会，还是有项目想找商会聊？';
const GREET_ARTICLE = '读到这里，有没有想进一步聊的？文章里的问题，或者您手上的项目，都可以直接问我，中英文均可。';
const GREET_EVENT = '对这场活动有疑问吗？时间、地点、怎么报名，都可以问我；想报名的话我可以帮您填好，您确认后再提交。';
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

const uid = () => Math.random().toString(36).slice(2, 10);

function load(): Stored {
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    if (raw) {
      const j = JSON.parse(raw) as Stored;
      if (Array.isArray(j.messages)) return { conversationId: j.conversationId ?? null, messages: j.messages.slice(-60) };
    }
  } catch {
    /* 无痕模式等 */
  }
  return { conversationId: null, messages: [] };
}
function save(v: Stored) {
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify({ conversationId: v.conversationId, messages: v.messages.slice(-60) }));
  } catch {
    /* ignore */
  }
}

async function postJson<T>(path: string, body: unknown): Promise<{ status: number; data: (T & { ok?: boolean; error?: { code: string; message: string } }) | null }> {
  try {
    const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin', cache: 'no-store' });
    return { status: res.status, data: await res.json().catch(() => null) };
  } catch {
    return { status: 0, data: null };
  }
}
async function getJson<T>(path: string): Promise<(T & { ok?: boolean; error?: { code: string; message: string } }) | null> {
  try {
    const res = await fetch(path, { credentials: 'same-origin', cache: 'no-store' });
    return await res.json().catch(() => null);
  } catch {
    return null;
  }
}

/** 文本里的站内路径 / 网址变成链接 */
function linkify(text: string): ReactNode[] {
  const parts = text.split(/(https?:\/\/[^\s，。、）)]+|\/zh\/[A-Za-z0-9\-_/?=#&.]*[A-Za-z0-9\-_/#=])/g);
  return parts.map((p, i) =>
    /^(https?:\/\/|\/zh\/)/.test(p) ? (
      <a key={i} href={p} target={p.startsWith('http') ? '_blank' : undefined} rel={p.startsWith('http') ? 'noopener noreferrer' : undefined}>
        {p}
      </a>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

// ── Cloudflare Turnstile（仅在服务端要求时加载）────────────────────────────
type TurnstileApi = { render: (el: HTMLElement, opts: Record<string, unknown>) => string; remove: (id: string) => void };
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}
let turnstileLoading: Promise<void> | null = null;
function loadTurnstile(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (!turnstileLoading) {
    turnstileLoading = new Promise((resolve, reject) => {
      const sc = document.createElement('script');
      sc.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      sc.async = true;
      sc.onload = () => resolve();
      sc.onerror = () => reject(new Error('turnstile load failed'));
      document.head.appendChild(sc);
    });
  }
  return turnstileLoading;
}

function Turnstile({ onToken }: { onToken: (t: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let id: string | null = null;
    let alive = true;
    loadTurnstile()
      .then(() => {
        if (!alive || !ref.current || !window.turnstile) return;
        id = window.turnstile.render(ref.current, { sitekey: TURNSTILE_SITE_KEY, theme: 'dark', callback: (t: string) => onToken(t), 'error-callback': () => setErr('人机验证加载失败，请刷新页面再试') });
      })
      .catch(() => setErr('人机验证加载失败，请刷新页面再试'));
    return () => {
      alive = false;
      if (id && window.turnstile) window.turnstile.remove(id);
    };
  }, [onToken]);
  return (
    <div className={s.card}>
      <p className={s.cardNote}>请完成人机验证后继续：</p>
      <div ref={ref} />
      {err && <p className={s.err}>{err}</p>}
    </div>
  );
}

// ── 主体 ─────────────────────────────────────────────────────────────

export function AgentChat({ variant, context }: { variant: 'panel' | 'launcher'; context?: AgentContext }) {
  if (variant === 'launcher') return <Launcher context={context} />;
  return <ChatPanel context={context} inline />;
}

export default AgentChat;

function Launcher({ context }: { context?: AgentContext }) {
  const [open, setOpen] = useState(false);
  const [greet, setGreet] = useState<string | null>(null);
  const [seed, setSeed] = useState<string | null>(null);
  const panelId = useId();
  const btnRef = useRef<HTMLButtonElement>(null);

  // 主动开口：文章读到一半 / 活动页 30 秒；每页每个标签页只弹一次；用户打开过对话就不再弹
  useEffect(() => {
    if (!context || (context.page !== 'article' && context.page !== 'event')) return;
    const key = `sarec:agent:greeted:${typeof location !== 'undefined' ? location.pathname : ''}`;
    try {
      if (sessionStorage.getItem(key)) return;
    } catch {
      /* ignore */
    }
    const fire = () => {
      try {
        sessionStorage.setItem(key, '1');
      } catch {
        /* ignore */
      }
      setGreet(context.page === 'article' ? GREET_ARTICLE : GREET_EVENT);
    };
    if (context.page === 'event') {
      const t = setTimeout(fire, 30_000);
      return () => clearTimeout(t);
    }
    let done = false;
    const onScroll = () => {
      if (done) return;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      if (h > 0 && window.scrollY / h >= 0.5) {
        done = true;
        fire();
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [context]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const openWith = (g: string | null) => {
    setSeed(g);
    setGreet(null);
    setOpen(true);
  };

  return (
    <div className={s.launcherWrap}>
      {open && (
        <div id={panelId} className={s.floating} role="dialog" aria-label="商会 AI 助手">
          <ChatPanel
            context={context}
            seedGreeting={seed}
            onClose={() => {
              setOpen(false);
              btnRef.current?.focus();
            }}
          />
        </div>
      )}
      {!open && greet && (
        <div style={{ position: 'relative' }}>
          <button type="button" className={s.bubble} onClick={() => openWith(greet)} aria-label={`商会 AI 助手：${greet} 点击开始对话`}>
            {greet}
          </button>
          <button type="button" className={s.bubbleClose} onClick={() => setGreet(null)} aria-label="关闭提示">
            ×
          </button>
        </div>
      )}
      {!open && (
        <button ref={btnRef} type="button" className={s.launcher} aria-expanded={open} aria-controls={panelId} onClick={() => openWith(null)}>
          商会 AI 助手
        </button>
      )}
    </div>
  );
}

function ChatPanel({ context, inline, onClose, seedGreeting }: { context?: AgentContext; inline?: boolean; onClose?: () => void; seedGreeting?: string | null }) {
  const [state, setState] = useState<Stored>({ conversationId: null, messages: [] });
  const [ready, setReady] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [waitUntil, setWaitUntil] = useState(0);
  const [, setTick] = useState(0);
  const [challenge, setChallenge] = useState<string | null>(null); // 等待人机验证后重发的消息
  const [hp, setHp] = useState('');
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const inputId = useId();

  useEffect(() => {
    const st = load();
    if (seedGreeting && !st.messages.some((m) => m.text === seedGreeting)) st.messages.push({ id: uid(), role: 'bot', text: seedGreeting });
    setState(st);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (ready) save(state);
  }, [state, ready]);
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [state.messages.length, busy, challenge]);
  useEffect(() => {
    if (!inline) inputRef.current?.focus();
  }, [inline]);
  useEffect(() => {
    if (waitUntil <= Date.now()) return;
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [waitUntil]);

  const push = useCallback((m: Omit<Msg, 'id'>) => setState((p) => ({ ...p, messages: [...p.messages, { ...m, id: uid() }] })), []);

  const send = useCallback(
    async (text: string, opts: { token?: string; echo?: boolean } = {}) => {
      const msg = text.trim();
      if (!msg || busy) return;
      if (opts.echo !== false) push({ role: 'user', text: msg });
      setBusy(true);
      const r = await postJson<{ reply?: string; tier?: number | null; actions?: Action[]; conversationId?: string; needTurnstile?: boolean; retryAfter?: number }>('/api/v1/agent/chat', {
        message: msg,
        conversationId: state.conversationId,
        context,
        turnstileToken: opts.token,
        website: hp
      });
      setBusy(false);
      const d = r.data;
      if (!d) return push({ role: 'note', text: '网络不稳定，没有发出去。请稍后再试。' });
      if (d.conversationId) setState((p) => ({ ...p, conversationId: d.conversationId as string }));
      if (r.status === 429) {
        if (d.needTurnstile && TURNSTILE_SITE_KEY) setChallenge(msg);
        if (d.retryAfter) setWaitUntil(Date.now() + d.retryAfter * 1000);
        return push({ role: 'note', text: d.reply || '请稍后再试。' });
      }
      if (!d.ok) return push({ role: 'note', text: d.error?.message || '暂时无法回答，请稍后再试。' });
      setChallenge(null);
      push({ role: 'bot', text: d.reply || '', actions: d.actions, tier: d.tier ?? null });
    },
    [busy, context, hp, push, state.conversationId]
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (waitUntil > Date.now() || challenge) return;
    const t = input;
    setInput('');
    void send(t);
  };
  const onToken = useCallback(
    (token: string) => {
      const m = challenge;
      if (m) void send(m, { token, echo: false });
    },
    [challenge, send]
  );

  const wait = Math.max(0, Math.ceil((waitUntil - Date.now()) / 1000));
  const messages: Msg[] = [{ id: 'opening', role: 'bot', text: OPENING }, ...state.messages];

  return (
    <section className={`${s.panel} ${inline ? s.inline : ''}`} aria-label="商会 AI 助手">
      <header className={s.header}>
        <div>
          <h2 className={s.title}>商会 AI 助手</h2>
          <p className={s.subline}>由 AI 回答，复杂问题转人工</p>
        </div>
        {onClose && (
          <button type="button" className={s.close} onClick={onClose} aria-label="关闭对话框">
            ×
          </button>
        )}
      </header>
      <div ref={logRef} className={s.log} role="log" aria-live="polite" aria-relevant="additions" aria-label="对话记录">
        {messages.map((m) =>
          m.role === 'note' ? (
            <p key={m.id} className={s.notice}>
              {m.text}
            </p>
          ) : (
            <div key={m.id} style={{ display: 'contents' }}>
              <div className={`${s.msg} ${m.role === 'user' ? s.user : s.bot}`}>
                <span className={s.srOnly}>{m.role === 'user' ? '您：' : '助手：'}</span>
                {linkify(m.text)}
              </div>
              {m.actions?.map((a, i) => (
                <ActionCard key={`${m.id}-${i}`} action={a} conversationId={state.conversationId} onNote={(t) => push({ role: 'note', text: t })} />
              ))}
            </div>
          )
        )}
        {busy && <p className={s.typing}>正在回答…</p>}
        {challenge && TURNSTILE_SITE_KEY && <Turnstile onToken={onToken} />}
      </div>
      <form className={s.form} onSubmit={onSubmit}>
        <label htmlFor={inputId} className={s.srOnly}>
          输入问题
        </label>
        <div className={s.hp} aria-hidden="true">
          <label>
            Website
            <input tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} name="website" />
          </label>
        </div>
        <textarea
          id={inputId}
          ref={inputRef}
          className={s.textarea}
          rows={1}
          maxLength={1500}
          placeholder="输入问题，中英文均可"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              onSubmit(e as unknown as FormEvent);
            }
          }}
        />
        <button type="submit" className={s.btn} disabled={busy || !input.trim() || wait > 0 || !!challenge}>
          {wait > 0 ? `${wait} 秒` : '发送'}
        </button>
      </form>
    </section>
  );
}

// ── 确认卡片 ─────────────────────────────────────────────────────────

function ActionCard({ action, conversationId, onNote }: { action: Action; conversationId: string | null; onNote: (t: string) => void }) {
  if (action.type === 'join')
    return (
      <div className={s.card}>
        <p className={s.cardTitle}>申请入会</p>
        <p className={s.cardNote}>在入会页选择档位、确认协议、在线付款，到账后生效。</p>
        <div className={s.row}>
          <a className={s.btn} href={action.href}>
            {action.label}
          </a>
          <a className={`${s.btn} ${s.btnQuiet}`} href="/zh/membership">
            先看各档权益
          </a>
        </div>
      </div>
    );
  if (action.type === 'lead') return <LeadCard lead={action.lead} conversationId={conversationId} onNote={onNote} />;
  return <RegisterCard action={action} conversationId={conversationId} onNote={onNote} />;
}

function Field({ label, children }: { label: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className={s.field}>
      <label className={s.label} htmlFor={id}>
        {label}
      </label>
      {children(id)}
    </div>
  );
}

function LeadCard({ lead, conversationId, onNote }: { lead: Lead; conversationId: string | null; onNote: (t: string) => void }) {
  const [f, setF] = useState<Lead>({ ...lead, wantsCall: lead.wantsCall ?? true });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');
  const [err, setErr] = useState('');
  const set = (k: keyof Lead) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  async function submit() {
    setErr('');
    if (!f.phone?.trim() && !f.email?.trim() && !f.wechat?.trim()) return setErr('请至少留一种联系方式（手机、邮箱或微信）');
    setBusy(true);
    const r = await postJson<{ message?: string }>('/api/v1/agent/action', { kind: 'lead', conversationId, ...f });
    setBusy(false);
    if (!r.data?.ok) return setErr(r.data?.error?.message || '没有提交成功，请稍后再试');
    setDone(r.data.message || '已提交');
    onNote(r.data.message || '已提交，同事会尽快联系您。');
  }
  if (done) return <div className={s.card}><p className={s.ok}>{done}</p></div>;
  return (
    <div className={s.card}>
      <p className={s.cardTitle}>请确认您的咨询信息</p>
      <p className={s.cardNote}>点击“确认提交”后，商会同事会联系您。我们不会替您联系任何第三方。</p>
      <Field label="需求">{(id) => <textarea id={id} className={s.textarea} value={f.need ?? ''} onChange={set('need')} />}</Field>
      <Field label="地区">{(id) => <input id={id} className={s.input} value={f.region ?? ''} onChange={set('region')} />}</Field>
      <Field label="时间安排">{(id) => <input id={id} className={s.input} value={f.timeline ?? ''} onChange={set('timeline')} />}</Field>
      <Field label="称呼">{(id) => <input id={id} className={s.input} autoComplete="name" value={f.name ?? ''} onChange={set('name')} />}</Field>
      <Field label="手机">{(id) => <input id={id} className={s.input} type="tel" autoComplete="tel" value={f.phone ?? ''} onChange={set('phone')} />}</Field>
      <Field label="邮箱">{(id) => <input id={id} className={s.input} type="email" autoComplete="email" value={f.email ?? ''} onChange={set('email')} />}</Field>
      <Field label="微信">{(id) => <input id={id} className={s.input} value={f.wechat ?? ''} onChange={set('wechat')} />}</Field>
      <label className={s.check}>
        <input type="checkbox" checked={f.wantsCall === true} onChange={(e) => setF({ ...f, wantsCall: e.target.checked })} />
        希望约创始人 15 分钟电话
      </label>
      {err && <p className={s.err} role="alert">{err}</p>}
      <div className={s.row}>
        <button type="button" className={s.btn} disabled={busy} onClick={submit}>
          {busy ? '提交中…' : '确认提交'}
        </button>
      </div>
    </div>
  );
}

type Preview = { loggedIn: boolean; firstTime: boolean; alreadyRegistered: boolean; name: string | null; identity: { email: string | null; phone: string | null } };
type Role = { key: string; label: string };

function RegisterCard({ action, conversationId, onNote }: { action: Extract<Action, { type: 'register' }>; conversationId: string | null; onNote: (t: string) => void }) {
  const [pv, setPv] = useState<Preview | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [f, setF] = useState({ name: '', phone: '', email: '', roleSub: '' });
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'loading' | 'form' | 'code' | 'done'>('loading');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [hint, setHint] = useState('');
  const [doneMsg, setDoneMsg] = useState('');
  const slug = encodeURIComponent(action.slug);

  const loadPreview = useCallback(async () => {
    const d = await getJson<Preview>(`/api/v1/events/${slug}`);
    if (!d?.ok) {
      setErr(d?.error?.message || '活动信息加载失败');
      setStep('form');
      return null;
    }
    setPv(d);
    setF((x) => ({ ...x, name: x.name || d.name || '', phone: x.phone || d.identity.phone || '', email: x.email || d.identity.email || '' }));
    setStep('form');
    return d as Preview;
  }, [slug]);

  useEffect(() => {
    void loadPreview();
    void getJson<{ quickRoles: Role[] }>('/api/v1/meta').then((m) => m?.quickRoles && setRoles(m.quickRoles));
  }, [loadPreview]);

  async function doRegister(p: Preview) {
    const body = p.firstTime ? { name: f.name.trim(), roleSub: f.roleSub, phone: f.phone.trim(), email: f.email.trim() } : { oneStep: true, ...(f.phone.trim() ? { phone: f.phone.trim() } : {}), ...(f.email.trim() ? { email: f.email.trim() } : {}) };
    const r = await postJson<{ message?: string; status?: string }>(`/api/v1/events/${slug}/register`, body);
    if (!r.data?.ok) {
      if (r.data?.error?.code === 'answers_required') {
        setErr('这场活动还需要回答几个报名问题，请到活动页完成报名。');
        return;
      }
      setErr(r.data?.error?.message || '报名没有成功，请稍后再试');
      return;
    }
    const msg = r.data.message || (r.data.status === 'waitlisted' ? '本场已满员，您已进入候补名单' : '报名成功，确认邮件已发出');
    setDoneMsg(msg);
    setStep('done');
    onNote(`「${action.title}」${msg}`);
    if (conversationId) void postJson('/api/v1/agent/action', { kind: 'registered', conversationId, slug: action.slug });
  }

  function validForm(needAll: boolean): boolean {
    if (!needAll) return true;
    let problem = '';
    if (!f.name.trim()) problem = '请填写姓名';
    else if (!f.phone.trim()) problem = '请填写手机号（含国家码，例如 +1 626 555 1234）';
    else if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) problem = '请填写正确的邮箱';
    else if (!f.roleSub) problem = '请选择您的主要行业';
    if (problem) setErr(problem);
    return !problem;
  }

  async function confirm() {
    setErr('');
    if (!pv) return;
    if (pv.loggedIn) {
      if (!validForm(pv.firstTime)) return;
      setBusy(true);
      await doRegister(pv);
      setBusy(false);
      return;
    }
    if (!validForm(true)) return;
    setBusy(true);
    const r = await postJson<{ devCode?: string }>('/api/v1/auth/code/send', { channel: 'email', target: f.email.trim() });
    setBusy(false);
    if (!r.data?.ok) return setErr(r.data?.error?.message || '验证码没有发出去，请稍后再试');
    setHint(r.data.devCode ? `测试环境验证码：${r.data.devCode}` : '验证码已发到您的邮箱，10 分钟内有效（没收到请看垃圾邮件）');
    setStep('code');
  }

  async function verify() {
    setErr('');
    setBusy(true);
    const r = await postJson('/api/v1/auth/code/verify', { channel: 'email', target: f.email.trim(), code, name: f.name.trim() });
    if (!r.data?.ok) {
      setBusy(false);
      return setErr(r.data?.error?.message || '验证码不对，请检查');
    }
    const p = await loadPreview();
    if (p?.alreadyRegistered) {
      setBusy(false);
      setDoneMsg('您已经报名过这场活动了');
      setStep('done');
      return;
    }
    if (p) await doRegister(p);
    setBusy(false);
  }

  if (step === 'done') return <div className={s.card}><p className={s.ok}>{doneMsg}</p></div>;
  return (
    <div className={s.card}>
      <p className={s.cardTitle}>确认报名「{action.title}」</p>
      <p className={s.cardNote}>{action.when}</p>
      {step === 'loading' && <p className={s.cardNote}>正在加载…</p>}
      {pv?.alreadyRegistered ? (
        <p className={s.ok}>您已经报名过这场活动了。</p>
      ) : (
        step !== 'loading' && (
          <>
            {pv && (!pv.loggedIn || pv.firstTime) && (
              <>
                <Field label="姓名">{(id) => <input id={id} className={s.input} autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} disabled={step === 'code'} />}</Field>
                <Field label="手机（含国家码）">{(id) => <input id={id} className={s.input} type="tel" autoComplete="tel" placeholder="+1 626 555 1234" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} disabled={step === 'code'} />}</Field>
                <Field label="邮箱">{(id) => <input id={id} className={s.input} type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} disabled={step === 'code' || (pv.loggedIn && !!pv.identity.email)} />}</Field>
                <Field label="行业">
                  {(id) => (
                    <select id={id} className={s.select} value={f.roleSub} onChange={(e) => setF({ ...f, roleSub: e.target.value })} disabled={step === 'code'}>
                      <option value="">请选择</option>
                      {roles.map((r) => (
                        <option key={r.key} value={r.key}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
              </>
            )}
            {pv?.loggedIn && !pv.firstTime && <p className={s.cardNote}>将使用您账户里的联系方式报名{pv.name ? `（${pv.name}）` : ''}。</p>}
            {step === 'code' && (
              <>
                {hint && <p className={s.cardNote}>{hint}</p>}
                <Field label="邮箱验证码">{(id) => <input id={id} className={s.input} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />}</Field>
              </>
            )}
            {err && <p className={s.err} role="alert">{err}</p>}
            <div className={s.row}>
              {step === 'code' ? (
                <button type="button" className={s.btn} disabled={busy || code.length !== 6} onClick={verify}>
                  {busy ? '处理中…' : '验证并确认报名'}
                </button>
              ) : (
                <button type="button" className={s.btn} disabled={busy || !pv} onClick={confirm}>
                  {busy ? '处理中…' : pv && !pv.loggedIn ? '获取邮箱验证码' : `确认报名`}
                </button>
              )}
              <a className={`${s.btn} ${s.btnQuiet}`} href={`/zh/e/${slug}`}>
                查看活动详情
              </a>
            </div>
          </>
        )
      )}
    </div>
  );
}
