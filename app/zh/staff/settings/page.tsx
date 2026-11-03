'use client';
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { Msg, StaffGate } from '@/components/crm/staff/StaffGate';
import { api } from '@/components/crm/client';

type S = {
  settings: { key: string; value: unknown; updated_by: string | null }[];
  rooms: { id: number; name: string; hourly_cents: number; is_active: boolean }[];
  offers: { id: string; merchant: string; category: string | null; offer: string; conditions: string | null; contact: string | null; valid_until: string | null; is_active: boolean }[];
  staff: { email: string; name: string; roles: string[]; is_active: boolean }[];
};
const TIERS: [string, string][] = [['none', '注册用户'], ['member', '普通会员'], ['board', '理事'], ['exec_board', '常务理事'], ['vp', '副会长'], ['strategic_partner', '战略伙伴']];
const ROLES: [string, string][] = [['checkin', '现场签到'], ['finance', '财务核款'], ['ops', '运营'], ['admin', '管理员']];

export default function StaffSettings() {
  const [d, setD] = useState<S | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [disc, setDisc] = useState<Record<string, string>>({});
  const [fee, setFee] = useState<Record<string, string>>({});
  const [ppd, setPpd] = useState('');
  const [pass, setPass] = useState('');
  const [offer, setOffer] = useState({ merchant: '', category: '', offer: '', conditions: '', contact: '', validUntil: '' });
  const [st, setSt] = useState({ email: '', name: '', roles: [] as string[] });

  const val = (data: S, k: string) => data.settings.find((x) => x.key === k)?.value;
  const load = useCallback(async () => {
    const r = await api<S>('/api/v1/staff/settings');
    if (!r.ok) return setMsg({ ok: false, text: r.message });
    setD(r.data);
    const dd = (val(r.data, 'room_discount') ?? {}) as Record<string, number>;
    setDisc(Object.fromEntries(Object.entries(dd).map(([k, v]) => [k, String(v)])));
    const ff = (val(r.data, 'screen_fee_cents') ?? {}) as Record<string, number>;
    setFee(Object.fromEntries(Object.entries(ff).map(([k, v]) => [k, String(v / 100)])));
    setPpd(String(val(r.data, 'points_per_dollar') ?? 10));
    setPass(String(Number(val(r.data, 'room_pass_cents') ?? 29900) / 100));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function post(body: Record<string, unknown>, ok: string) {
    const r = await api('/api/v1/staff/settings', { body });
    setMsg(r.ok ? { ok: true, text: ok } : { ok: false, text: r.message });
    load();
  }
  async function saveOffer() {
    const r = await api('/api/v1/staff/offers', { body: offer });
    setMsg(r.ok ? { ok: true, text: '商家优惠已添加' } : { ok: false, text: r.message });
    if (r.ok) setOffer({ merchant: '', category: '', offer: '', conditions: '', contact: '', validUntil: '' });
    load();
  }
  async function toggleOffer(o: S['offers'][number], del = false) {
    const r = await api('/api/v1/staff/offers', { body: { ...o, validUntil: o.valid_until, isActive: !o.is_active, delete: del } });
    setMsg(r.ok ? { ok: true, text: del ? '已删除' : '已更新' } : { ok: false, text: r.message });
    load();
  }

  const published = d ? val(d, 'member_prices_published') === true : false;
  return (
    <StaffGate title="设置" role="admin">
      {() =>
        d && (
          <>
            <Msg m={msg} />
            <h2 className={styles.h2}>会员价是否对外公布</h2>
            <div className={styles.card}>
              <p>当前：<strong>{published ? '已公布（按等级折扣收费）' : '未公布（页面显示“会员价即将公布”，按标准价收费）'}</strong></p>
              <button className={styles.btn} onClick={() => post({ kind: 'setting', key: 'member_prices_published', value: !published }, published ? '已改为未公布' : '会员价已公布')}>
                {published ? '改为未公布' : '公布会员价'}
              </button>
            </div>

            <h2 className={styles.h2}>会议室及月卡折扣（0.9 = 9 折）</h2>
            <div className={styles.card}>
              {TIERS.filter(([k]) => k !== 'none').map(([k, l]) => (
                <div className={styles.row} key={k}>
                  <span className={styles.rowLabel}>{l}</span>
                  <input className={styles.input} style={{ maxWidth: 120 }} inputMode="decimal" value={disc[k] ?? ''} onChange={(e) => setDisc({ ...disc, [k]: e.target.value })} />
                </div>
              ))}
              <button className={styles.btn} onClick={() => post({ kind: 'setting', key: 'room_discount', value: Object.fromEntries(Object.entries(disc).filter(([, v]) => v).map(([k, v]) => [k, Number(v)])) }, '折扣已保存')}>保存折扣</button>
            </div>

            <h2 className={styles.h2}>电子屏月费（美元/月）</h2>
            <div className={styles.card}>
              {TIERS.map(([k, l]) => (
                <div className={styles.row} key={k}>
                  <span className={styles.rowLabel}>{l}</span>
                  <input className={styles.input} style={{ maxWidth: 120 }} inputMode="decimal" value={fee[k] ?? ''} onChange={(e) => setFee({ ...fee, [k]: e.target.value })} />
                </div>
              ))}
              <button className={styles.btn} onClick={() => post({ kind: 'setting', key: 'screen_fee_cents', value: Object.fromEntries(Object.entries(fee).filter(([, v]) => v !== '').map(([k, v]) => [k, Math.round(Number(v) * 100)])) }, '屏幕月费已保存')}>保存月费</button>
            </div>

            <h2 className={styles.h2}>积分与月卡</h2>
            <div className={styles.card}>
              <div className={styles.row}><span className={styles.rowLabel}>多少积分抵 1 美元（续费最多抵一半）</span><input className={styles.input} style={{ maxWidth: 120 }} inputMode="numeric" value={ppd} onChange={(e) => setPpd(e.target.value)} /></div>
              <div className={styles.row}><span className={styles.rowLabel}>会场月卡标准价（美元）</span><input className={styles.input} style={{ maxWidth: 120 }} inputMode="decimal" value={pass} onChange={(e) => setPass(e.target.value)} /></div>
              <div className={styles.btnRow}>
                <button className={styles.btn} onClick={() => post({ kind: 'setting', key: 'points_per_dollar', value: Number(ppd) }, '积分比例已保存')}>保存积分比例</button>
                <button className={styles.btn} onClick={() => post({ kind: 'setting', key: 'room_pass_cents', value: Math.round(Number(pass) * 100) }, '月卡价格已保存')}>保存月卡价</button>
              </div>
            </div>

            <h2 className={styles.h2}>会议室标准价</h2>
            {d.rooms.map((r) => (
              <RoomRow key={r.id} r={r} onSave={(body) => post({ kind: 'room', ...body }, '会议室已保存')} />
            ))}
            <RoomRow r={{ id: 0, name: '', hourly_cents: 5000, is_active: true }} onSave={(body) => post({ kind: 'room', ...body, id: undefined }, '会议室已添加')} />

            <h2 className={styles.h2}>商家优惠</h2>
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

            <h2 className={styles.h2}>工作人员与权限</h2>
            <div style={{ overflowX: 'auto' }}>
              <table className={styles.table}>
                <thead><tr><th>姓名</th><th>邮箱</th><th>权限</th><th /></tr></thead>
                <tbody>
                  {d.staff.map((x) => (
                    <tr key={x.email} style={x.is_active ? undefined : { opacity: 0.5 }}>
                      <td>{x.name}</td>
                      <td className={styles.small}>{x.email}</td>
                      <td className={styles.small}>{x.roles.map((r) => ROLES.find(([k]) => k === r)?.[1] ?? r).join('、')}</td>
                      <td>
                        <button className={styles.copyBtn} onClick={() => setSt({ email: x.email, name: x.name, roles: x.roles })}>修改</button>{' '}
                        <button className={styles.copyBtn} onClick={() => post({ kind: 'staff', email: x.email, name: x.name, roles: x.roles, isActive: !x.is_active }, x.is_active ? '已停用' : '已启用')}>{x.is_active ? '停用' : '启用'}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.card} style={{ marginTop: '1rem' }}>
              <p className={styles.cardTitle}>添加 / 修改工作人员</p>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="st-email">邮箱（用它收验证码登录）</label>
                <input id="st-email" className={styles.input} type="email" value={st.email} onChange={(e) => setSt({ ...st, email: e.target.value })} />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="st-name">姓名</label>
                <input id="st-name" className={styles.input} value={st.name} onChange={(e) => setSt({ ...st, name: e.target.value })} />
              </div>
              <div className={styles.chips} style={{ marginBottom: '1rem' }}>
                {ROLES.map(([k, l]) => {
                  const on = st.roles.includes(k);
                  return <button key={k} type="button" className={`${styles.chip} ${on ? styles.chipOn : ''}`} onClick={() => setSt({ ...st, roles: on ? st.roles.filter((r) => r !== k) : [...st.roles, k] })}>{l}</button>;
                })}
              </div>
              <button className={styles.btn} disabled={!st.email || !st.roles.length} onClick={() => post({ kind: 'staff', ...st, isActive: true }, '工作人员已保存')}>保存</button>
            </div>
          </>
        )
      }
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
