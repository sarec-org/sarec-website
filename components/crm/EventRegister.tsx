'use client';
/**
 * 活动报名 /zh/e/[slug]
 * - 先看后填：活动信息不需要登录；点“报名”才填。
 * - 首次：姓名 + 联系方式（验证码）+ 主要角色，同一屏，约 30 秒。
 * - 再次：同一屏最多 3 道必答；资料齐全的老会员一键报名。
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { api, fmtDateTime, money, useDraft } from './client';
import { ContactCodeFields, useContactInput, useMeta, verifyCode } from './LoginBox';
import { EmailInput, PhoneInput, joinPhone, splitPhone, type ContactInfo } from './ContactInfo';
import { RolePicker, isAnswered, toValue, type AnswerDraft, type QuestionDTO } from './Questions';
import s from './crm.module.css';

type Preview = {
  event: { slug: string; title: string; summary: string | null; startsAt: string; endsAt: string | null; timezone: string; locationName: string | null; address: string | null; capacity: number | null; feeCents: number; registrationOpen: boolean; status: string };
  loggedIn: boolean;
  firstTime: boolean;
  alreadyRegistered: boolean;
  registrationStatus: string | null;
  required: QuestionDTO[];
  name: string | null;
  identity: { email: string | null; phone: string | null };
  contactInfo: ContactInfo | null;
  oneStepReady?: boolean;
};

export function EventEssentials({ e }: { e: Preview['event'] }) {
  return (
    <div className={s.card}>
      <div className={s.row}><span className={s.rowLabel}>时间</span><span className={s.rowValue}>{fmtDateTime(e.startsAt, e.timezone)}</span></div>
      {(e.locationName || e.address) && (
        <div className={s.row}><span className={s.rowLabel}>地点</span><span className={s.rowValue}>{[e.locationName, e.address].filter(Boolean).join(' · ')}</span></div>
      )}
      <div className={s.row}><span className={s.rowLabel}>费用</span><span className={s.rowValue}>{e.feeCents > 0 ? money(e.feeCents) : '免费'}</span></div>
    </div>
  );
}

export function EventRegister({ slug, refCode, channel }: { slug: string; refCode: string | null; channel: string | null }) {
  const router = useRouter();
  const meta = useMeta();
  const [p, setP] = useState<Preview | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [form, setForm, clearForm] = useDraft(`reg:${slug}`, { name: '', roleSub: '', roleOther: '', cc: '+1', phone: '', email: '', answers: {} as Record<string, AnswerDraft> });
  const c = useContactInput();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  const load = useCallback(async () => {
    const r = await api<Preview>(`/api/v1/events/${encodeURIComponent(slug)}`);
    if (!r.ok) return setLoadErr(r.message);
    setP(r.data);
    if (r.data.name) setForm((f) => (f.name ? f : { ...f, name: r.data.name! }));
    // 预填联系方式：当前记录 → 登录身份
    const ci = r.data.contactInfo;
    const ph = ci?.phone?.value ?? r.data.identity.phone;
    const em = ci?.email?.value ?? r.data.identity.email;
    setForm((f) => ({
      ...f,
      ...(f.phone || !ph ? {} : { cc: splitPhone(ph).cc || '+1', phone: splitPhone(ph).num }),
      ...(f.email || !em ? {} : { email: em })
    }));
  }, [slug, setForm]);

  useEffect(() => {
    load();
  }, [load]);

  if (loadErr) return <div className={s.page}><Link href="/zh/events" className={s.back}>‹ 返回活动</Link><p className={s.error}>{loadErr}</p></div>;
  if (!p) return <div className={s.page}><p className={s.small}>加载中…</p></div>;
  const e = p.event;
  const closed = e.status !== 'scheduled' || !e.registrationOpen;

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (busy || !p) return;
    setErr(null);
    setBusy(true);
    try {
      // 1.2 一步报名：新用户只填姓名、手机、行业（邮箱选填）；老用户资料齐全时一键报名
      const phone = !p.loggedIn && c.channel === 'sms' ? c.target : joinPhone(form.cc, form.phone);
      const email = !p.loggedIn && c.channel === 'email' ? c.email.trim() : form.email.trim();
      if (!phone && !p.oneStepReady) return setErr('请填写手机号');
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setErr('邮箱格式不对');
      if (!p.loggedIn) {
        if (!form.name.trim()) return setErr('请填写怎么称呼您');
        if (!form.roleSub) return setErr('请选择您的主要行业');
        if (code.length !== 6) return setErr('请先获取并填写 6 位验证码');
        const v = await verifyCode(c, code, form.name.trim());
        if (!v.ok) return setErr(v.message);
      }
      const r = await api<{ status: string; orderNo: string | null; taskId: string; message: string; notify: { phone: string | null; email: string | null } }>(`/api/v1/events/${encodeURIComponent(slug)}/register`, {
        body: { name: form.name, roleSub: form.roleSub, roleOther: form.roleOther, ref: refCode, channel: channel ?? 'web', phone: phone || undefined, email: email || undefined, oneStep: true }
      });
      if (!r.ok) {
        if (r.code === 'answers_required') {
          await load(); // 原来已有档案：改为显示本次必答题
          setStarted(true);
        }
        return setErr(r.message);
      }
      clearForm();
      router.push(`/zh/e/${encodeURIComponent(slug)}/done?task=${r.data.taskId}&msg=${encodeURIComponent(r.data.message)}`);
    } finally {
      setBusy(false);
    }
  }

  const needFirst = !p.loggedIn || p.firstTime;
  void isAnswered;
  void toValue;
  // 手机必填（用短信验证码登录的，手机就是那个号码）；邮箱选填
  const contactOk = p.oneStepReady || (p.loggedIn || c.channel !== 'sms' ? !!form.phone.trim() : true);
  const ready = (needFirst ? !!form.name.trim() && !!form.roleSub && (p.loggedIn || code.length === 6) : true) && contactOk;
  const contactFields = (
    <>
      {(p.loggedIn || c.channel !== 'sms') && <PhoneInput cc={form.cc} num={form.phone} setCc={(v) => setForm({ ...form, cc: v })} setNum={(v) => setForm({ ...form, phone: v })} />}
      {(p.loggedIn || c.channel !== 'email') && (
        <>
          <EmailInput value={form.email} setValue={(v) => setForm({ ...form, email: v })} />
          <p className={s.small} style={{ marginTop: '-0.5rem' }}>邮箱选填，填了可以收到报名确认邮件。</p>
        </>
      )}
      <p className={s.small}>活动通知会发到这里。</p>
    </>
  );

  return (
    <div className={s.page}>
      <Link href="/zh/events" className={s.back}>‹ 返回活动</Link>
      <p className={s.eyebrow}>EVENT · 活动报名</p>
      <h1 className={s.h1}>{e.title}</h1>
      {e.summary && <p className={s.lead}>{e.summary}</p>}
      <EventEssentials e={e} />

      {p.alreadyRegistered ? (
        <div className={`${s.card} ${s.cardGold}`}>
          <p className={s.cardTitle}>{p.registrationStatus === 'waitlisted' ? '您在候补名单中' : '您已报名这场活动'}</p>
          <Link className={`${s.btn} ${s.btnBlock}`} href={`/zh/e/${encodeURIComponent(slug)}/done`}>查看报名凭证</Link>
        </div>
      ) : closed ? (
        <p className={s.notice}>{e.status === 'cancelled' ? '本场活动已取消' : e.status === 'completed' ? '本场活动已结束' : '本场报名已截止'}。可以看看<Link href="/zh/events#open">其他活动</Link>。</p>
      ) : !started ? (
        <div className={s.bottomBar}>
          <div className={s.bottomInner}>
            {p.loggedIn && !p.firstTime && p.oneStepReady ? (
              <button className={s.btn} disabled={busy} onClick={submit}>{busy ? '处理中…' : e.feeCents > 0 ? `一键报名（费用 ${money(e.feeCents)}，报名后付款）` : '一键报名'}</button>
            ) : (
              <button className={s.btn} onClick={() => setStarted(true)}>报名</button>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={submit}>
          {needFirst ? (
            <>
              <h2 className={s.h2}>报名信息（约 30 秒）</h2>
              <div className={s.field}>
                <label className={s.label}>怎么称呼您？<span className={s.required}>*</span></label>
                <input className={s.input} autoComplete="name" placeholder="中文或英文名都可以" value={form.name} onChange={(x) => setForm({ ...form, name: x.target.value })} />
              </div>
              {p.loggedIn ? (
                <p className={s.small}>登录身份：{p.identity.email ?? p.identity.phone}（已验证）</p>
              ) : (
                <ContactCodeFields c={c} code={code} setCode={setCode} smsAvailable={!!meta?.smsAvailable} />
              )}
              {contactFields}
              <div className={s.field}>
                <label className={s.label}>您目前主要从事哪个行业？<span className={s.required}>*</span></label>
                <RolePicker meta={meta} value={form.roleSub} onChange={(k) => setForm({ ...form, roleSub: k })} other={form.roleOther} setOther={(v) => setForm({ ...form, roleOther: v })} />
              </div>
            </>
          ) : (
            <>
              <p className={s.notice}>补一个手机号就能报名，活动变动会通知您。</p>
              {contactFields}
            </>
          )}
          {err && <p className={s.error} role="alert">{err}</p>}
          <div className={s.bottomBar}>
            <div className={s.bottomInner}>
              <button className={s.btn} disabled={busy || !ready}>
                {busy ? '处理中…' : e.feeCents > 0 ? `完成报名（费用 ${money(e.feeCents)}）` : '完成报名'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
