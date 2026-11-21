'use client';
/**
 * 设置与团队 › 设置（后台综合优化 11/21，第二部分十）。
 * - 所有配置集中到这里：原「设置」页（管理员）+ 原「增长」页里的配置（企业微信、首页与邀请、名片模板库、视频号、邀请提醒、带朋友、贴图话题与服务号、专委会状态）。
 * - 分组；每项一行：名字 + 当前值 + 一句人话说明，点开才改（手机上一屏看得清，不用左右滑）。
 * - 最上面列“现在关着的功能”：只列出，不在这里替东哥打开。
 * - 「我的手机工作台绑定码」从后台首页挪到这里（三.5）；线上巡检、线上报错在「系统状态」。
 * - 谁能改什么不变：原「设置」页的项只有管理员能看能改；原「增长」页的配置运营也能改（接口没变）。
 * 读写还是原来的接口：/api/v1/staff/settings（管理员）、/api/v1/staff/growth（运营）、/api/v1/workbench/seats（确认时间线）。
 */
import Link from 'next/link';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import styles from '@/components/crm/crm.module.css';
import { Msg, StaffGate, can, type StaffInfo } from '@/components/crm/staff/StaffGate';
import { api } from '@/components/crm/client';
import { WechatQr } from '@/components/crm/staff/WechatQr';
import { MpBind } from '@/components/crm/staff/MpBind';

type S = {
  settings: { key: string; value: unknown; updated_by: string | null }[];
  rooms: { id: number; name: string; hourly_cents: number; is_active: boolean }[];
  offers: { id: string; merchant: string; category: string | null; offer: string; conditions: string | null; contact: string | null; valid_until: string | null; is_active: boolean }[];
};
type Committee = { key: string; name: string; status: 'active' | 'preparing' };
type G = {
  committees: { committee: string; n: number; names: string[] }[];
  settings: Record<string, unknown>;
  wecom?: { configured: boolean; callback: boolean; working: boolean; byPlacement: { placement: string | null; label: string; adds: number; matched: number }[] };
};
type Off = { key: string; name: string; now: string; ifOn: string; where: string; whereHref: string; admin: boolean };
type M = { ok: boolean; text: string } | null;

const TIERS: [string, string][] = [['none', '注册用户'], ['member', '普通会员'], ['board', '理事'], ['exec_board', '常务理事'], ['vp', '副会长'], ['strategic_partner', '战略伙伴']];
const PROMPTS: [string, string][] = [['enabled', '总开关'], ['afterRegister', '报名成功页一行“带位朋友一起来？”'], ['afterPhoto', '第一次保存合影 / 看照片时轻提示“把这张发给朋友”'], ['nextEvent', '看下一场相关活动时提示“邀请朋友同行”']];

/** 一项配置：名字 + 当前值 + 一句人话；点开才显示修改的地方 */
function Item({ id, title, now, desc, children }: { id: string; title: string; now: ReactNode; desc: string; children: ReactNode }) {
  return (
    <details id={id} className={styles.card} style={{ margin: '0 0 0.6rem', scrollMarginTop: 140 }}>
      <summary style={{ cursor: 'pointer', listStyle: 'revert', minHeight: 44 }}>
        <strong>{title}</strong>
        <span style={{ color: 'var(--gold-bright)' }}>　现在：{now}</span>
        <span className={styles.small} style={{ display: 'block', marginTop: 4 }}>{desc}</span>
      </summary>
      <div style={{ marginTop: '0.75rem' }}>{children}</div>
    </details>
  );
}
function Group({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section>
      <h2 className={styles.h2}>{title}</h2>
      {note && <p className={styles.small} style={{ marginTop: 0 }}>{note}</p>}
      {children}
    </section>
  );
}

/** 最上面：现在关着的功能（只列出、不打开） */
function OffList({ admin }: { admin: boolean }) {
  const [items, setItems] = useState<Off[] | null>(null);
  useEffect(() => {
    api<{ items: Off[] }>('/api/v1/staff/off-features').then((r) => r.ok && setItems(r.data.items));
  }, []);
  if (!items) return null;
  return (
    <div className={styles.card} style={{ borderLeft: '4px solid var(--gold)' }}>
      <p className={styles.cardTitle}>现在关着的功能（{items.length} 项）</p>
      <p className={styles.small} style={{ marginTop: 0 }}>这里只列出来、说清开了会怎样，不替东哥打开。要开，请到后面写的地方改{admin ? '' : '（标“管理员”的要管理员改）'}。</p>
      {!items.length && <p style={{ margin: 0 }}>现在没有关着的功能。</p>}
      {items.map((x) => (
        <div key={x.key} style={{ padding: '0.55rem 0', borderTop: '1px solid var(--line-2)' }}>
          <strong>{x.name}</strong>
          <span className={styles.small}>　{x.now}</span>
          <div className={styles.small}>开了会怎样：{x.ifOn}</div>
          <div className={styles.small}>
            在哪改：{!x.whereHref ? x.where : x.whereHref.startsWith('/zh/staff/settings#') ? <a href={x.whereHref.replace('/zh/staff/settings', '')} style={{ color: 'var(--gold)' }}>{x.where}</a> : <Link href={x.whereHref} style={{ color: 'var(--gold)' }}>{x.where}</Link>}
            {x.admin ? '（管理员）' : ''}
          </div>
        </div>
      ))}
    </div>
  );
}

/** 原「设置」页（管理员）：收款与价格、确认时间线、邮件额度、会议室价、商家优惠 */
function useAdmin(enabled: boolean, setMsg: (m: M) => void) {
  const [d, setD] = useState<S | null>(null);
  const [tl, setTl] = useState<boolean | null>(null);
  const load = useCallback(async () => {
    if (!enabled) return;
    const r = await api<S>('/api/v1/staff/settings');
    if (!r.ok) return setMsg({ ok: false, text: r.message });
    setD(r.data);
    const t = await api<{ timelineEnabled: boolean }>('/api/v1/workbench/seats');
    setTl(t.ok ? !!t.data.timelineEnabled : null);
  }, [enabled, setMsg]);
  useEffect(() => {
    load();
  }, [load]);
  return { d, tl, load };
}
function useGrowth(enabled: boolean, setMsg: (m: M) => void) {
  const [g, setG] = useState<G | null>(null);
  const load = useCallback(async () => {
    if (!enabled) return;
    const r = await api<G>('/api/v1/staff/growth?only=settings');
    if (r.ok) setG(r.data);
    else setMsg({ ok: false, text: r.message });
  }, [enabled, setMsg]);
  useEffect(() => {
    load();
  }, [load]);
  return { g, load };
}

function Hub({ s }: { s: StaffInfo }) {
  const admin = can(s, 'admin');
  const ops = can(s, 'ops');
  const [msg, setMsg] = useState<M>(null);
  const [fromGrowth, setFromGrowth] = useState(false);
  const { d, tl, load: loadAdmin } = useAdmin(admin, setMsg);
  const { g, load: loadGrowth } = useGrowth(ops, setMsg);

  // 原「设置」页的输入框
  const [disc, setDisc] = useState<Record<string, string>>({});
  const [fee, setFee] = useState<Record<string, string>>({});
  const [ppd, setPpd] = useState('');
  const [pass, setPass] = useState('');
  const [offer, setOffer] = useState({ merchant: '', category: '', offer: '', conditions: '', contact: '', validUntil: '' });
  const [quota, setQuota] = useState({ monthly: '', daily: '' });
  // 原「增长」页的输入框
  const [channels, setChannels] = useState('');
  const [topic, setTopic] = useState('');
  const [oa, setOa] = useState('');
  const [compMax, setCompMax] = useState('2');
  const [prompts, setPrompts] = useState<Record<string, boolean>>({ enabled: true, afterRegister: true, afterPhoto: true, nextEvent: true });
  const [comms, setComms] = useState<Committee[]>([]);
  const [wecomUsers, setWecomUsers] = useState('');
  const [recapDays, setRecapDays] = useState('7');
  const [inviteText, setInviteText] = useState<Record<string, string>>({ title: '', intro: '' });

  const val = (k: string) => d?.settings.find((x) => x.key === k)?.value;
  useEffect(() => {
    if (!d) return;
    const v = (k: string) => d.settings.find((x) => x.key === k)?.value;
    const dd = (v('room_discount') ?? {}) as Record<string, number>;
    setDisc(Object.fromEntries(Object.entries(dd).map(([k, x]) => [k, String(x)])));
    const ff = (v('screen_fee_cents') ?? {}) as Record<string, number>;
    setFee(Object.fromEntries(Object.entries(ff).map(([k, x]) => [k, String(x / 100)])));
    setPpd(String(v('points_per_dollar') ?? 10));
    setPass(String(Number(v('room_pass_cents') ?? 29900) / 100));
    // 没设过时显示代码里的默认值（lib/crm/newsletter.ts quotaState：每月 3000、每天 100）
    setQuota({ monthly: String(v('resend_monthly_quota') ?? 3000), daily: String(v('resend_daily_quota') ?? 100) });
  }, [d]);
  useEffect(() => {
    if (!g) return;
    const st = g.settings;
    setChannels(String(st.channels_finder_id ?? ''));
    setTopic(String(st.photo_topic ?? ''));
    setOa(String(st.oa_username ?? ''));
    setCompMax(String(st.companions_max ?? 2));
    if (st.invite_prompts) setPrompts(st.invite_prompts as Record<string, boolean>);
    setComms((st.committees as Committee[]) ?? []);
    setWecomUsers(String(st.wecom_userids ?? ''));
    setRecapDays(String(st.home_recap_days ?? 7));
    setInviteText({ title: '', intro: '', ...((st.invite_card_text as Record<string, string>) ?? {}) });
  }, [g]);

  // 从旧网址 /zh/staff/growth 跳来时说一句；带 #某项 打开时自动展开那一项
  useEffect(() => {
    setFromGrowth(new URLSearchParams(location.search).get('from') === 'growth');
  }, []);
  useEffect(() => {
    const open = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      const el = id ? document.getElementById(id) : null;
      if (el && el.tagName === 'DETAILS') (el as HTMLDetailsElement).open = true;
      if (el) el.scrollIntoView({ block: 'start' });
    };
    open();
    window.addEventListener('hashchange', open);
    return () => window.removeEventListener('hashchange', open);
  }, [d, g]);

  async function post(body: Record<string, unknown>, ok: string) {
    const r = await api('/api/v1/staff/settings', { body });
    setMsg(r.ok ? { ok: true, text: ok } : { ok: false, text: r.message });
    loadAdmin();
  }
  async function save(key: string, value: unknown, ok = '已保存') {
    const r = await api('/api/v1/staff/growth', { body: { key, value } });
    setMsg(r.ok ? { ok: true, text: ok } : { ok: false, text: r.message });
    loadGrowth();
  }
  /** 1.3.1 B：确认时间线开关（走名额接口，留操作记录） */
  async function toggleTimeline() {
    const r = await api<{ on: boolean }>('/api/v1/workbench/seats', { body: { action: 'timeline', on: !tl } });
    setMsg(r.ok ? { ok: true, text: !tl ? '确认时间线已打开：报了名的人会在活动前收到确认消息，名额按候补顺序递补' : '确认时间线已关闭：不再发确认消息，也不再自动转人' } : { ok: false, text: r.message });
    loadAdmin();
  }
  async function saveOffer() {
    const r = await api('/api/v1/staff/offers', { body: offer });
    setMsg(r.ok ? { ok: true, text: '商家优惠已添加' } : { ok: false, text: r.message });
    if (r.ok) setOffer({ merchant: '', category: '', offer: '', conditions: '', contact: '', validUntil: '' });
    loadAdmin();
  }
  async function toggleOffer(o: S['offers'][number], del = false) {
    const r = await api('/api/v1/staff/offers', { body: { ...o, validUntil: o.valid_until, isActive: !o.is_active, delete: del } });
    setMsg(r.ok ? { ok: true, text: del ? '已删除' : '已更新' } : { ok: false, text: r.message });
    loadAdmin();
  }

  const published = val('member_prices_published') === true;
  const zelleOn = val('zelle_enabled') === true;
  const st = g?.settings ?? {};
  const wecomOff = st.wecom_enabled === false;
  const tierText = (m: Record<string, string>, unit: (v: string) => string) => {
    const parts = TIERS.filter(([k]) => m[k]).map(([k, l]) => `${l} ${unit(m[k])}`);
    return parts.length ? parts.join('、') : '没设';
  };
  const activeOffers = d?.offers.filter((o) => o.is_active).length ?? 0;

  return (
    <>
      {fromGrowth && (
        <div className={styles.notice}>
          原来的「增长」页拆开了：各项配置在本页下面；点击统计、推荐排行在<Link href="/zh/staff/data" style={{ color: 'var(--gold)' }}>「数据」</Link>；文章显示范围在<Link href="/zh/staff/content-visibility" style={{ color: 'var(--gold)' }}>「内容 › 文章显示范围」</Link>。
        </div>
      )}
      <Msg m={msg} />
      <OffList admin={admin} />

      <div className={styles.grid2} style={{ margin: '1rem 0' }}>
        {admin && (
          <Link href="/zh/staff/team" className={`${styles.card} ${styles.cardGold}`} style={{ textDecoration: 'none', color: 'inherit', margin: 0 }}>
            <p className={styles.cardTitle}>团队 ›</p>
            <p className={styles.muted} style={{ margin: 0 }}>加人、给同事出码开通手机工作台、改角色、停用、网站登录邮箱</p>
          </Link>
        )}
        {ops && (
          <Link href="/zh/staff/system" className={`${styles.card} ${styles.cardGold}`} style={{ textDecoration: 'none', color: 'inherit', margin: 0 }}>
            <p className={styles.cardTitle}>系统状态 ›</p>
            <p className={styles.muted} style={{ margin: 0 }}>线上巡检、线上报错（新报错交给开发处理，不进待办）</p>
          </Link>
        )}
      </div>

      <h2 className={styles.h2} id="mp-bind">我的手机工作台</h2>
      <MpBind admin={admin} />

      {admin && d && (
        <Group title="收款与价格" note="只有管理员能看、能改。">
          <Item id="zelle" title="Zelle 付款" now={zelleOn ? '开着' : '关着'} desc="付款页是否显示 Zelle 收款信息；关着时只显示银行卡，已提交待核对的照常在「核款」处理。">
            <button className={styles.btn} onClick={() => post({ kind: 'setting', key: 'zelle_enabled', value: !zelleOn }, zelleOn ? 'Zelle 付款已关闭' : 'Zelle 付款已打开')}>
              {zelleOn ? '关闭 Zelle 付款' : '打开 Zelle 付款'}
            </button>
          </Item>
          <Item id="member-prices" title="会员价是否对外公布" now={published ? '已公布（按等级折扣收费）' : '未公布（按标准价收费）'} desc="没公布时页面显示“会员价即将公布”。">
            <button className={styles.btn} onClick={() => post({ kind: 'setting', key: 'member_prices_published', value: !published }, published ? '已改为未公布' : '会员价已公布')}>
              {published ? '改为未公布' : '公布会员价'}
            </button>
          </Item>
          <Item id="discount" title="会议室及月卡折扣" now={tierText(disc, (v) => `${v}`)} desc="按会员等级打折，0.9 = 9 折；会员价公布后才生效。">
            {TIERS.filter(([k]) => k !== 'none').map(([k, l]) => (
              <div className={styles.row} key={k}>
                <span className={styles.rowLabel}>{l}</span>
                <input className={styles.input} style={{ maxWidth: 120 }} inputMode="decimal" aria-label={`${l}折扣`} value={disc[k] ?? ''} onChange={(e) => setDisc({ ...disc, [k]: e.target.value })} />
              </div>
            ))}
            <button className={styles.btn} onClick={() => post({ kind: 'setting', key: 'room_discount', value: Object.fromEntries(Object.entries(disc).filter(([, v]) => v).map(([k, v]) => [k, Number(v)])) }, '折扣已保存')}>保存折扣</button>
          </Item>
          <Item id="screen-fee" title="电子屏月费" now={tierText(fee, (v) => `$${v}`)} desc="各等级每月的电子屏广告费（美元）。">
            {TIERS.map(([k, l]) => (
              <div className={styles.row} key={k}>
                <span className={styles.rowLabel}>{l}</span>
                <input className={styles.input} style={{ maxWidth: 120 }} inputMode="decimal" aria-label={`${l}月费`} value={fee[k] ?? ''} onChange={(e) => setFee({ ...fee, [k]: e.target.value })} />
              </div>
            ))}
            <button className={styles.btn} onClick={() => post({ kind: 'setting', key: 'screen_fee_cents', value: Object.fromEntries(Object.entries(fee).filter(([, v]) => v !== '').map(([k, v]) => [k, Math.round(Number(v) * 100)])) }, '屏幕月费已保存')}>保存月费</button>
          </Item>
          <Item id="points" title="积分与月卡" now={`${String(val('points_per_dollar') ?? 10)} 积分抵 1 美元；月卡 $${Number(val('room_pass_cents') ?? 29900) / 100}`} desc="积分续费最多抵一半；月卡是会场月卡的标准价。">
            <div className={styles.row}><span className={styles.rowLabel}>多少积分抵 1 美元</span><input className={styles.input} style={{ maxWidth: 120 }} inputMode="numeric" aria-label="多少积分抵 1 美元" value={ppd} onChange={(e) => setPpd(e.target.value)} /></div>
            <div className={styles.row}><span className={styles.rowLabel}>会场月卡标准价（美元）</span><input className={styles.input} style={{ maxWidth: 120 }} inputMode="decimal" aria-label="会场月卡标准价" value={pass} onChange={(e) => setPass(e.target.value)} /></div>
            <div className={styles.btnRow}>
              <button className={styles.btn} onClick={() => post({ kind: 'setting', key: 'points_per_dollar', value: Number(ppd) }, '积分比例已保存')}>保存积分比例</button>
              <button className={styles.btn} onClick={() => post({ kind: 'setting', key: 'room_pass_cents', value: Math.round(Number(pass) * 100) }, '月卡价格已保存')}>保存月卡价</button>
            </div>
          </Item>
          <Item id="rooms" title="会议室标准价" now={d.rooms.filter((r) => r.is_active).map((r) => `${r.name} $${r.hourly_cents / 100}/小时`).join('、') || '还没有会议室'} desc="每间会议室每小时的标准价；停用的不能再预约。">
            {d.rooms.map((r) => (
              <RoomRow key={r.id} r={r} onSave={(body) => post({ kind: 'room', ...body }, '会议室已保存')} />
            ))}
            <RoomRow r={{ id: 0, name: '', hourly_cents: 5000, is_active: true }} onSave={(body) => post({ kind: 'room', ...body, id: undefined }, '会议室已添加')} />
          </Item>
          <Item id="offers" title="商家优惠" now={`上架 ${activeOffers} 条，共 ${d.offers.length} 条`} desc="会员能看到的合作商家优惠：上架、下架、新增。">
            {d.offers.map((o) => (
              <div key={o.id} className={styles.card} style={o.is_active ? undefined : { opacity: 0.6 }}>
                <p className={styles.cardTitle}>{o.merchant} <span className={styles.small}>{o.category}</span></p>
                <p style={{ margin: 0 }}>{o.offer}</p>
                <p className={styles.small}>{[o.conditions, o.contact, o.valid_until && `至 ${o.valid_until}`].filter(Boolean).join(' · ')}</p>
                <div className={styles.btnRow}>
                  <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => toggleOffer(o)}>{o.is_active ? '下架' : '上架'}</button>
                  <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => toggleOffer(o, true)}>删除</button>
                </div>
              </div>
            ))}
            <div className={styles.card}>
              <p className={styles.cardTitle}>新增优惠</p>
              {(['merchant', 'category', 'offer', 'conditions', 'contact'] as const).map((k) => (
                <div className={styles.field} key={k}>
                  <label className={styles.label} htmlFor={`of-${k}`}>{{ merchant: '商家 *', category: '类别', offer: '优惠内容 *', conditions: '使用条件', contact: '联系方式' }[k]}</label>
                  <input id={`of-${k}`} className={styles.input} value={offer[k]} onChange={(e) => setOffer({ ...offer, [k]: e.target.value })} />
                </div>
              ))}
              <div className={styles.field}>
                <label className={styles.label} htmlFor="of-until">有效期至</label>
                <input id="of-until" type="date" className={styles.input} value={offer.validUntil} onChange={(e) => setOffer({ ...offer, validUntil: e.target.value })} />
              </div>
              <button className={styles.btn} onClick={saveOffer}>添加</button>
            </div>
          </Item>
        </Group>
      )}

      {(admin || ops) && (
        <Group title="活动">
          {admin && (
            <Item id="timeline" title="活动确认时间线" now={tl === null ? '读不到，请刷新' : tl ? '开着' : '关着（一条确认消息都不发、一个人都不自动转）'} desc="打开后，活动前按设定时间请报名的人确认出席；没确认的名额按候补顺序递补。随时可以关。（管理员）">
              {tl !== null && (
                <button className={styles.btn} onClick={toggleTimeline}>
                  {tl ? '关闭确认时间线' : '打开确认时间线'}
                </button>
              )}
            </Item>
          )}
          {g && (
            <>
              <Item id="invite-prompts" title="邀请提醒" now={prompts.enabled === false ? '总开关关着' : `开着（${PROMPTS.slice(1).filter(([k]) => prompts[k] !== false).length} 处）`} desc="只在三处轻提示“带朋友来”，每场活动最多一次；签到、填资料、出错时绝不弹。改完小程序立即生效。">
                {PROMPTS.map(([k, label]) => (
                  <label key={k} className={styles.row} style={{ cursor: 'pointer' }}>
                    <span className={styles.rowValue} style={{ textAlign: 'left' }}>{label}</span>
                    <input type="checkbox" checked={prompts[k] !== false} onChange={(e) => setPrompts({ ...prompts, [k]: e.target.checked })} />
                  </label>
                ))}
                <button className={styles.btn} onClick={() => save('invite_prompts', prompts, '邀请提醒已保存')}>保存</button>
              </Item>
              <Item id="companions" title="带一位朋友" now={Number(st.companions_max ?? 2) === 0 ? '关着' : `每份报名最多带 ${Number(st.companions_max ?? 2)} 位`} desc="报名时能顺手替几位朋友报名（0 = 关掉这个功能）。">
                <div className={styles.inputRow}>
                  <input className={styles.input} type="number" min={0} max={5} value={compMax} onChange={(e) => setCompMax(e.target.value)} aria-label="每人最多带几位朋友" />
                  <button className={styles.btn} onClick={() => save('companions_max', Number(compMax), `已改为每份报名最多带 ${compMax} 位`)}>保存</button>
                </div>
              </Item>
              <Item id="recap-days" title="首页显示“上一场回顾”几天" now={`${Number(st.home_recap_days ?? 7)} 天`} desc="活动结束后，小程序首页显示上一场回顾的天数，过了就显示品牌大图。">
                <div className={styles.inputRow}>
                  <input className={styles.input} type="number" min={0} max={60} value={recapDays} onChange={(e) => setRecapDays(e.target.value)} style={{ maxWidth: 100 }} aria-label="回顾天数" />
                  <button className={styles.btn} onClick={() => save('home_recap_days', Math.round(Number(recapDays) || 0), `已改为 ${Math.round(Number(recapDays) || 0)} 天`)}>保存</button>
                </div>
              </Item>
            </>
          )}
        </Group>
      )}

      {(admin || g) && (
        <Group title="小程序与微信">
          {admin && (
            <Item id="wechat-qr" title="商会微信二维码" now={!g ? '—' : st.wechat_qr_url ? '已上传' : '还没上传'} desc="小程序和网站里所有“加商会微信”的码（企业微信没开时用这个），手机上也能直接换图。（管理员）">
              <WechatQr />
            </Item>
          )}
          {g && (
            <>
              <Item
                id="wecom"
                title="企业微信“联系我”码"
                now={!g.wecom?.configured ? '还没配好（显示个人微信二维码）' : wecomOff ? '关着（显示个人微信二维码）' : g.wecom.working ? '开着，接口可用' : '开着，但接口暂时调不通（显示个人微信二维码）'}
                desc="配好并打开后，所有“加商会微信”的码换成企业微信码，登录的人每人一个，加好友后自动关联到会员档案。"
              >
                <p className={styles.small} style={{ marginTop: 0 }}>
                  {g.wecom?.configured ? (g.wecom.callback ? '加好友回调已配置。' : '加好友回调还没配置（加了好友也关联不到会员档案）。') : '企业微信的密钥要开发在服务器上配，配好后这里会显示“接口可用”。'}
                </p>
                <label className={styles.label}>接待的企业微信成员账号（多个用逗号分开）</label>
                <div className={styles.inputRow}>
                  <input className={styles.input} value={wecomUsers} onChange={(e) => setWecomUsers(e.target.value)} placeholder="例如 DongGe" aria-label="企业微信成员账号" />
                  <button className={styles.btn} onClick={() => save('wecom_userids', wecomUsers.trim())}>保存</button>
                  <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => save('wecom_enabled', wecomOff, wecomOff ? '企业微信码已打开' : '已关掉企业微信码，改用个人微信码')}>{wecomOff ? '打开企业微信码' : '先关掉，用个人微信码'}</button>
                </div>
                {!!g.wecom?.byPlacement.length && (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead><tr><th>入口</th><th>加好友</th><th>已关联会员档案</th></tr></thead>
                      <tbody>{g.wecom.byPlacement.map((r) => <tr key={String(r.placement)}><td>{r.label}</td><td>{r.adds}</td><td>{r.matched}</td></tr>)}</tbody>
                    </table>
                  </div>
                )}
              </Item>
              <Item id="invite-card" title="“认识商会”邀请卡文案" now={inviteText.title ? `标题「${String((st.invite_card_text as Record<string, string> | null)?.title || '默认')}」` : '用默认文案'} desc="小程序里邀请卡上的标题和介绍；不能写金额。">
                <input className={styles.input} value={inviteText.title} onChange={(e) => setInviteText({ ...inviteText, title: e.target.value })} placeholder="标题，默认：邀请你认识中美房地产商会" aria-label="邀请卡标题" />
                <textarea className={styles.input} style={{ minHeight: 80, marginTop: 6 }} value={inviteText.intro} onChange={(e) => setInviteText({ ...inviteText, intro: e.target.value })} placeholder="一段介绍，默认用商会简介" aria-label="邀请卡介绍" />
                <button className={styles.btn} style={{ marginTop: 6 }} onClick={() => save('invite_card_text', inviteText, '邀请卡文案已保存')}>保存</button>
              </Item>
              <Item id="card-tpl" title="电子名片模板库" now={st.card_tpl_batches === 2 ? '全部 105 款' : '第一批 39 款'} desc="会员在“我的名片”里只能选已开放的模板。">
                <button className={`${styles.btn} ${st.card_tpl_batches === 2 ? styles.btnQuiet : ''}`} onClick={() => save('card_tpl_batches', st.card_tpl_batches === 2 ? 1 : 2, st.card_tpl_batches === 2 ? '已收回第二批' : '已开放全部 105 款')}>
                  {st.card_tpl_batches === 2 ? '收回第二批，只开放第一批' : '开放第二批（1–66），共 105 款'}
                </button>
              </Item>
              <Item id="channels" title="视频号" now={String(st.channels_finder_id ?? '') ? '已填' : '没填（小程序不显示视频号入口）'} desc="视频号要和小程序同一主体或已关联，才能从小程序跳转；还没关联时请留空。">
                <div className={styles.inputRow}>
                  <input className={styles.input} value={channels} onChange={(e) => setChannels(e.target.value)} placeholder="视频号 ID，sph 开头；留空 = 不显示入口" aria-label="视频号 ID" />
                  <button className={styles.btn} onClick={() => save('channels_finder_id', channels.trim())}>保存</button>
                </div>
              </Item>
              <Item id="topic" title="贴图话题、服务号" now={`话题${String(st.photo_topic ?? '') ? `「${String(st.photo_topic)}」` : '没填'}；服务号${String(st.oa_username ?? '') ? '已填' : '没填'}`} desc="照片分享页“发到微信贴图话题”用这个话题；服务号用于关注组件不显示时的替代入口。">
                <div className={styles.inputRow}>
                  <input className={styles.input} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="贴图话题名，例如 SAREC活动现场；留空 = 不显示入口" aria-label="贴图话题" />
                  <button className={styles.btn} onClick={() => save('photo_topic', topic.trim())}>保存</button>
                </div>
                <p className={styles.small}>不承诺微信推荐，话题里的照片也不会自动回到商会相册。</p>
                <div className={styles.inputRow}>
                  <input className={styles.input} value={oa} onChange={(e) => setOa(e.target.value)} placeholder="服务号原始 ID，gh_ 开头；留空 = 不显示" aria-label="服务号原始 ID" />
                  <button className={styles.btn} onClick={() => save('oa_username', oa.trim())}>保存</button>
                </div>
                <p className={styles.small}>签到成功页、相册页的“关注服务号”组件在部分进入方式（群卡片、朋友圈、搜索）不显示时，改显示去服务号主页的入口。</p>
              </Item>
              <Item id="committees" title="专委会与俱乐部状态" now={comms.length ? `${comms.filter((c) => c.status === 'active').length} 个已成立、${comms.filter((c) => c.status !== 'active').length} 个筹备中` : '没有'} desc="小程序里每个专委会显示“已成立”还是“筹备中”；括号里是表达意向的人数。">
                {comms.map((c, i) => {
                  const x = g.committees.find((y) => y.committee === c.key);
                  return (
                    <div key={c.key} className={styles.row}>
                      <span>{c.name} <span className={styles.small}>（意向 {x?.n ?? 0} 人{x?.names?.length ? `：${x.names.slice(0, 8).join('、')}` : ''}）</span></span>
                      <select className={styles.select} style={{ width: 120 }} aria-label={`${c.name}状态`} value={c.status} onChange={(e) => {
                        const next = comms.map((y, j) => (j === i ? { ...y, status: e.target.value as Committee['status'] } : y));
                        setComms(next);
                        save('committees', next, `${c.name}已改为${e.target.value === 'active' ? '已成立' : '筹备中'}`);
                      }}>
                        <option value="preparing">筹备中</option><option value="active">已成立</option>
                      </select>
                    </div>
                  );
                })}
              </Item>
            </>
          )}
        </Group>
      )}

      {admin && d && (
        <Group title="邮件">
          <Item id="email-quota" title="邮件通讯发信额度" now={`每月 ${String(val('resend_monthly_quota') ?? 3000)} 封、每天 ${String(val('resend_daily_quota') ?? 100)} 封`} desc="按邮件服务套餐填。当天额度用完，剩下的第二天接着发；本月剩余不够会拦下并提醒。（管理员）">
            <div className={styles.row}><span className={styles.rowLabel}>每月最多发（封）</span><input className={styles.input} style={{ maxWidth: 140 }} inputMode="numeric" aria-label="每月最多发多少封" value={quota.monthly} onChange={(e) => setQuota({ ...quota, monthly: e.target.value })} /></div>
            <div className={styles.row}><span className={styles.rowLabel}>每天最多发（封）</span><input className={styles.input} style={{ maxWidth: 140 }} inputMode="numeric" aria-label="每天最多发多少封" value={quota.daily} onChange={(e) => setQuota({ ...quota, daily: e.target.value })} /></div>
            <div className={styles.btnRow}>
              <button className={styles.btn} onClick={() => post({ kind: 'setting', key: 'resend_monthly_quota', value: Number(quota.monthly) }, `每月发信额度已改为 ${quota.monthly} 封`)}>保存每月额度</button>
              <button className={styles.btn} onClick={() => post({ kind: 'setting', key: 'resend_daily_quota', value: Number(quota.daily) }, `每天发信额度已改为 ${quota.daily} 封`)}>保存每天额度</button>
            </div>
          </Item>
        </Group>
      )}

      {!admin && (
        <p className={styles.small} style={{ marginTop: '1.5rem' }}>价格、收款、确认时间线、邮件额度、团队只有管理员能看能改。</p>
      )}
    </>
  );
}

export default function StaffSettings() {
  return (
    <StaffGate title="设置">
      {(s) => <Hub s={s} />}
    </StaffGate>
  );
}

function RoomRow({ r, onSave }: { r: { id: number; name: string; hourly_cents: number; is_active: boolean }; onSave: (b: Record<string, unknown>) => void }) {
  const [name, setName] = useState(r.name);
  const [price, setPrice] = useState(String(r.hourly_cents / 100));
  return (
    <div className={styles.card}>
      <div className={styles.inputRow}>
        <input className={styles.input} placeholder={r.id ? '' : '新会议室名称'} value={name} onChange={(e) => setName(e.target.value)} aria-label="会议室名称" />
        <input className={styles.input} style={{ maxWidth: 120 }} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} aria-label="每小时标准价（美元）" />
      </div>
      <p className={styles.small}>每小时标准价（美元）</p>
      <div className={styles.btnRow}>
        <button className={styles.btn} onClick={() => onSave({ id: r.id || undefined, name, hourlyCents: Math.round(Number(price) * 100), isActive: r.is_active })}>{r.id ? '保存' : '添加会议室'}</button>
        {r.id > 0 && <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => onSave({ id: r.id, name, hourlyCents: Math.round(Number(price) * 100), isActive: !r.is_active })}>{r.is_active ? '停用' : '启用'}</button>}
      </div>
    </div>
  );
}
