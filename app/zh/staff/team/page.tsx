'use client';
/** 1.3.1 F：团队与权限（只有管理员）。每个微信账号一行，分别显示、可单独停用；加人生成 24 小时绑定码；关键操作记录可查。 */
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { Msg, StaffGate } from '@/components/crm/staff/StaffGate';
import { api, copyText, fmtDateTime } from '@/components/crm/client';

type M = { id: string; name: string; roles: string[]; regions: string[]; phone: string | null; is_active: boolean; wechat_name: string | null; member_no: number | null; mp_bound_at: string | null; last_seen_at: string | null; email: string | null };
type L = { created_at: string; actor: string; action: string; target_type: string; target_id: string; target_name: string | null; reason: string | null };
const ROLE: Record<string, string> = { admin: '管理员', ops: '运营', checkin: '签到员', finance: '财务' };
const REGIONS = ['洛杉矶/橙县', '旧金山湾区', '纽约', '美国其他', '中国大陆', '其他'];
const ACTION: Record<string, string> = {
  capacity_change: '改名额', staff_admit: '现场放人', noshow_exempt: '解除爽约候补', confirm_timeline: '确认时间线开关', backfill_attendance: '补登记到场',
  merge_contacts: '合并档案', undo_merge_contacts: '撤销合并', team_add: '加工作人员', team_update: '改权限', team_disable: '停用工作人员', team_bind_code: '生成绑定码',
  join_link_sent: '发入会链接', home_slide: '首页轮播设置', home_slide_remove: '撤掉轮播设置', contact_region: '改客户地区', checkin_questions_update: '改签到题库',
  staff_checkin: '代签到', onsite_register: '现场登记'
};

export default function Team() {
  const [team, setTeam] = useState<M[]>([]);
  const [log, setLog] = useState<L[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [code, setCode] = useState<{ code: string; expiresAt: string; who: string } | null>(null);
  const [f, setF] = useState({ name: '', phone: '', cc: '+1', role: 'ops', regions: [] as string[] });
  const load = useCallback(async () => {
    const r = await api<{ team: M[]; log: L[] }>('/api/v1/staff/team');
    if (r.ok) { setTeam(r.data.team); setLog(r.data.log); } else setMsg({ ok: false, text: r.message });
  }, []);
  useEffect(() => { load(); }, [load]);
  const post = async (b: Record<string, unknown>, okText: string, who?: string) => {
    const r = await api<{ code?: string; expiresAt?: string }>('/api/v1/staff/team', { body: b });
    if (!r.ok) return setMsg({ ok: false, text: r.message });
    if (r.data.code) setCode({ code: r.data.code, expiresAt: String(r.data.expiresAt), who: who ?? '' });
    setMsg({ ok: true, text: okText });
    load();
  };
  const add = () => post({ action: 'add', name: f.name, phone: f.phone, cc: f.cc, roles: [f.role === 'region' ? 'ops' : f.role], regions: f.role === 'region' ? f.regions : [] }, `已添加 ${f.name}，把绑定码发给对方`, f.name);
  return (
    <StaffGate title="团队" role="admin" wide>
      {() => (
        <>
          <p className={styles.small}>
            管理员：全部权限。运营：活动、客户、内容、通讯，不能改权限和价格。签到员：只能签到和补登记。地区管理员：只管自己地区的活动和报名；“全部地区”的通知只有管理员能发。每个微信账号单独一行，停用、改角色立即生效。
          </p>
          <Msg m={msg} />
          {code && (
            <div className={styles.card} style={{ borderLeft: '4px solid #C9A567' }}>
              <p className={styles.cardTitle}>绑定码{code.who ? `（${code.who}）` : ''}：<span style={{ fontSize: 28, letterSpacing: 4 }}>{code.code}</span></p>
              <p className={styles.small}>{fmtDateTime(code.expiresAt)} 前有效（24 小时）。请对方打开小程序 → 我的 → 工作台，输入这 8 位码，手机工作台就开了。</p>
              <button className={styles.btnQuiet} onClick={async () => { await copyText(`SAREC 工作台绑定码：${code.code}（24 小时内有效）。打开小程序 → 我的 → 工作台，输入即可。`); setMsg({ ok: true, text: '已复制，粘到微信发给对方' }); }}>复制发微信</button>
            </div>
          )}
          <h2 className={styles.h}>加人</h2>
          <div className={styles.card}>
            <label className={styles.label}>姓名（同一人多个微信号请写清，例如“东哥 · 微信 2”）</label>
            <input className={styles.input} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            <label className={styles.label}>手机号</label>
            <div className={styles.inputRow}>
              <select className={styles.select} style={{ maxWidth: 110 }} value={f.cc} onChange={(e) => setF({ ...f, cc: e.target.value })}><option value="+1">美国 +1</option><option value="+86">中国 +86</option></select>
              <input className={styles.input} inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
            </div>
            <label className={styles.label}>角色</label>
            <select className={styles.select} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
              <option value="ops">运营</option><option value="checkin">签到员</option><option value="region">地区管理员</option><option value="admin">管理员</option>
            </select>
            {f.role === 'region' && (
              <div className={styles.chips}>
                {REGIONS.map((r) => <button key={r} type="button" className={`${styles.chip} ${f.regions.includes(r) ? styles.chipOn : ''}`} onClick={() => setF({ ...f, regions: f.regions.includes(r) ? f.regions.filter((x) => x !== r) : [...f.regions, r] })}>{r}</button>)}
              </div>
            )}
            <button className={styles.btn} disabled={!f.name || !f.phone || (f.role === 'region' && !f.regions.length)} onClick={add}>生成绑定码</button>
          </div>
          <h2 className={styles.h}>工作人员（{team.filter((m) => m.is_active).length} 人在用）</h2>
          {team.map((m) => (
            <div key={m.id} className={styles.card} style={m.is_active ? undefined : { opacity: 0.6 }}>
              <div><b>{m.name}</b> · {m.roles.map((r) => ROLE[r] ?? r).join('、')}{m.regions?.length ? `（地区：${m.regions.join('、')}）` : ''}{m.is_active ? '' : ' · 已停用'}</div>
              <div className={styles.small}>
                {m.wechat_name || m.member_no ? `已绑微信：${m.wechat_name ?? ''}${m.member_no ? ' #' + m.member_no : ''}` : '还没绑微信'}
                {m.last_seen_at ? ` · 最近使用 ${fmtDateTime(m.last_seen_at)}` : ''}{m.email ? ` · 网站登录邮箱 ${m.email}` : ''}{m.phone ? ` · ${m.phone}` : ''}
              </div>
              <div className={styles.btnRow}>
                {m.is_active ? (
                  <>
                    <select className={styles.select} style={{ maxWidth: 140 }} value={m.roles.includes('admin') ? 'admin' : m.roles.includes('ops') ? 'ops' : 'checkin'} onChange={(e) => post({ action: 'update', id: m.id, roles: [e.target.value] }, `已改为${ROLE[e.target.value]}，立即生效`)}>
                      <option value="admin">管理员</option><option value="ops">运营</option><option value="checkin">签到员</option>
                    </select>
                    <button className={styles.btnQuiet} onClick={() => post({ action: 'code', id: m.id }, '已生成新的绑定码', m.name)}>新绑定码</button>
                    {m.mp_bound_at && <button className={styles.btnQuiet} onClick={() => post({ action: 'unbind', id: m.id }, '已解绑这个微信')}>解绑微信</button>}
                    <button className={styles.btnDanger} onClick={() => post({ action: 'update', id: m.id, isActive: false }, `已停用 ${m.name}，立即生效`)}>停用</button>
                  </>
                ) : (
                  <button className={styles.btnQuiet} onClick={() => post({ action: 'update', id: m.id, isActive: true }, `已恢复 ${m.name}`)}>恢复</button>
                )}
              </div>
            </div>
          ))}
          <h2 className={styles.h}>操作记录</h2>
          {!log.length && <p className={styles.muted}>还没有记录。</p>}
          {!!log.length && (
            <table className={styles.table}>
              <thead><tr><th>时间</th><th>谁（哪个账号）</th><th>做了什么</th><th>对象</th></tr></thead>
              <tbody>{log.map((l, i) => (
                <tr key={i}><td>{fmtDateTime(l.created_at)}</td><td>{l.actor.replace(/^staff:/, '')}</td><td>{ACTION[l.action] ?? l.action}{l.reason ? `（${l.reason}）` : ''}</td><td>{l.target_name ?? (l.target_type === 'contact' ? '' : l.target_type)}</td></tr>
              ))}</tbody>
            </table>
          )}
        </>
      )}
    </StaffGate>
  );
}
