'use client';
/** 1.3.1 F：团队与权限（只有管理员）。每个微信账号一行，分别显示、可单独停用；加人生成 24 小时绑定码；关键操作记录可查。
 *  1.4.0：每人一行「出码」（小程序码 + 8 位码备用）；设置页“按邮箱管工作人员”并到这里（东哥已点头）。 */
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { Msg, StaffGate } from '@/components/crm/staff/StaffGate';
import { api, copyText, fmtDateTime } from '@/components/crm/client';
import { saveImage, savedText } from '@/components/crm/staff/SaveImage';

type M = { id: string; name: string; roles: string[]; regions: string[]; phone: string | null; is_active: boolean; wechat_name: string | null; member_no: number | null; mp_bound_at: string | null; last_seen_at: string | null; email: string | null };
type L = { created_at: string; actor: string; action: string; target_type: string; target_id: string; target_name: string | null; reason: string | null; before_value: { roles?: string[]; is_active?: boolean } | null; after_value: { roles?: string[]; active?: boolean; recipients?: number } | null };
const ROLE: Record<string, string> = { admin: '管理员', ops: '运营', checkin: '签到员', finance: '财务' };
const REGIONS = ['洛杉矶/橙县', '旧金山湾区', '纽约', '美国其他', '中国大陆', '其他'];
const ACTION: Record<string, string> = {
  capacity_change: '改名额', staff_admit: '现场放人', noshow_exempt: '解除爽约候补', confirm_timeline: '确认时间线开关', backfill_attendance: '补登记到场',
  merge_contacts: '合并档案', undo_merge_contacts: '撤销合并', team_add: '加工作人员', team_update: '改权限', team_disable: '停用工作人员', team_bind_code: '生成绑定码',
  join_link_sent: '发入会链接', home_slide: '首页轮播设置', home_slide_remove: '撤掉轮播设置', contact_region: '改客户地区', checkin_questions_update: '改签到题库',
  staff_checkin: '代签到', onsite_register: '现场登记', newsletter_confirm: '确认群发邮件通讯', create_event: '新建活动', update_event: '修改活动',
  regenerate_checkin_code: '重置签到码', upsert_staff: '改网站登录（按邮箱）'
};
const roleText = (r?: string[]) => (r ?? []).map((x) => ROLE[x] ?? x).join('、');
function detail(l: L) {
  if (l.action === 'team_update' || l.action === 'team_disable') {
    const b = l.before_value ?? {};
    const a = l.after_value ?? {};
    const parts = [] as string[];
    if (a.roles && roleText(b.roles) !== roleText(a.roles)) parts.push(`${roleText(b.roles)} → ${roleText(a.roles)}`);
    if (a.active === false) parts.push('停用');
    if (a.active === true && b.is_active === false) parts.push('恢复');
    return parts.join('；');
  }
  if (l.action === 'newsletter_confirm' && l.after_value?.recipients) return `发给 ${l.after_value.recipients} 人`;
  return l.reason ?? '';
}

/** 1.4.0（改动单 B1）：出码结果——小程序码（微信一扫即绑定）+ 8 位码备用 + 复制发微信 + 存图 */
type Code = { code: string; expiresAt: string; who: string; qr: string | null };
const BIND_TIP = '让同事用微信扫这个码，扫完就绑定好了；扫不了的：小程序「我的」→「工作人员绑定码」输入 8 位码';
function CodeCard({ c, onMsg, onClose }: { c: Code; onMsg: (m: { ok: boolean; text: string }) => void; onClose: () => void }) {
  return (
    <div className={styles.card} style={{ borderLeft: '4px solid #C9A567', marginTop: '0.75rem' }}>
      <p className={styles.cardTitle}>{c.who ? `${c.who} 的绑定码` : '绑定码'}</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {c.qr && <img src={c.qr} alt={`${c.who} 的工作台绑定小程序码`} className={styles.qrImg} style={{ width: 220 }} />}
      <p style={{ margin: '0.6rem 0' }}>{c.qr ? BIND_TIP : '小程序码这会儿生成不了，请让同事打开小程序「我的」→「工作人员绑定码」，输入下面 8 位码。'}</p>
      <p className={styles.mono} style={{ fontSize: 28, letterSpacing: 4, margin: '0 0 0.4rem', color: 'var(--gold-bright)' }}>{c.code}</p>
      <p className={styles.small}>{fmtDateTime(c.expiresAt)} 前有效（24 小时），只能用一次。</p>
      <div className={styles.btnRow}>
        <button
          className={styles.btn}
          onClick={async () => {
            const ok = await copyText(`SAREC 工作台绑定码：${c.code}（24 小时内有效）。打开商会小程序 →「我的」→「工作人员绑定码」，输入这 8 位码，手机工作台就开了。`);
            onMsg(ok ? { ok: true, text: `已复制${c.who ? ` ${c.who} 的` : ''}绑定码和打开方法，粘到微信发给对方` } : { ok: false, text: '复制没成功，请手动抄下 8 位码发给对方' });
          }}
        >
          复制发微信
        </button>
        {c.qr && (
          <button
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={async () => {
              try {
                const how = await saveImage(c.qr!, `工作台绑定码-${c.who || c.code}.png`);
                onMsg({ ok: true, text: `${savedText(how, '绑定码图片')}。发给同事后，同事用微信长按识别或扫一扫即可` });
              } catch (e) {
                onMsg({ ok: false, text: e instanceof Error ? e.message : '存图没成功' });
              }
            }}
          >
            存码图发给同事
          </button>
        )}
        <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={onClose}>
          收起
        </button>
      </div>
    </div>
  );
}

const roleValue = (m: M) =>
  m.roles.includes('admin') ? 'admin' : m.regions?.length ? 'region' : m.roles.includes('ops') ? 'ops' : m.roles.includes('finance') && !m.roles.includes('checkin') ? 'finance' : 'checkin';
const WEB_ROLES: [string, string][] = [['checkin', '签到员'], ['finance', '财务'], ['ops', '运营'], ['admin', '管理员']];

export default function Team() {
  const [team, setTeam] = useState<M[]>([]);
  const [log, setLog] = useState<L[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  // 刚加的人 / 某一行出的码：按工作人员 id 存，显示在那一行下面
  const [codes, setCodes] = useState<Record<string, Code>>({});
  const [f, setF] = useState({ name: '', phone: '', cc: '+1', role: 'ops', regions: [] as string[] });
  const [web, setWeb] = useState({ email: '', name: '', roles: [] as string[] });
  const [busy, setBusy] = useState('');
  const load = useCallback(async () => {
    const r = await api<{ team: M[]; log: L[] }>('/api/v1/staff/team');
    if (r.ok) {
      setTeam(r.data.team);
      setLog(r.data.log);
    } else setMsg({ ok: false, text: r.message });
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const post = async (b: Record<string, unknown>, okText: string) => {
    const r = await api<{ id?: string; code?: string; expiresAt?: string; qr?: string | null }>('/api/v1/staff/team', { body: b });
    if (!r.ok) {
      setMsg({ ok: false, text: r.message });
      return null;
    }
    setMsg({ ok: true, text: okText });
    load();
    return r.data;
  };
  const issue = async (m: M) => {
    setBusy(m.id);
    const d = await post({ action: 'code', id: m.id }, `已给 ${m.name} 出码，码在 ${m.name} 这一行下面`);
    setBusy('');
    if (d?.code) setCodes((x) => ({ ...x, [m.id]: { code: d.code!, expiresAt: String(d.expiresAt), who: m.name, qr: d.qr ?? null } }));
  };
  const add = async () => {
    setBusy('add');
    const name = f.name;
    const d = await post(
      { action: 'add', name, phone: f.phone, cc: f.cc, roles: f.role === 'region' ? ['ops', 'checkin'] : [f.role], regions: f.role === 'region' ? f.regions : [] },
      `已添加 ${name}。码在上面「工作人员」里 ${name} 那一行下面，让对方用微信扫一下`
    );
    setBusy('');
    if (d?.code && d.id) {
      setCodes((x) => ({ ...x, [d.id!]: { code: d.code!, expiresAt: String(d.expiresAt), who: name, qr: d.qr ?? null } }));
      setF({ name: '', phone: '', cc: '+1', role: 'ops', regions: [] });
      setTimeout(() => document.getElementById(`m-${d.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 400);
    }
  };
  // 原来在「设置」页的“按邮箱管工作人员”（网站后台登录），1.4.0 并到这里（东哥已点头）
  const saveWeb = async () => {
    const r = await api('/api/v1/staff/settings', { body: { kind: 'staff', ...web, isActive: true } });
    setMsg(r.ok ? { ok: true, text: `已保存：${web.name || web.email} 可以用 ${web.email} 收验证码登录网站后台` } : { ok: false, text: r.message });
    if (r.ok) setWeb({ email: '', name: '', roles: [] });
    load();
  };
  return (
    <StaffGate title="团队" role="admin" wide>
      {() => (
        <>
          <p className={styles.small}>
            管理员：全部权限。运营：活动、客户、内容、通讯，不能改权限和价格。签到员：只能签到和补登记。财务：核款。地区管理员：只管自己地区的活动和报名；“全部地区”的通知只有管理员能发。每个微信账号单独一行，停用、改角色立即生效。
          </p>
          <div className={styles.notice}>
            <strong>给同事开通手机工作台：</strong>在下面「工作人员」里找到这个人，点「出码」。{BIND_TIP}。新同事先到页面下方「加人」填姓名和手机号。
          </div>
          <Msg m={msg} />

          <h2 className={styles.h2}>工作人员（{team.filter((m) => m.is_active).length} 人在用）</h2>
          {team.map((m) => (
            <div key={m.id} id={`m-${m.id}`} className={styles.card} style={m.is_active ? undefined : { opacity: 0.6 }}>
              <div>
                <b>{m.name}</b> · {m.roles.map((r) => ROLE[r] ?? r).join('、')}
                {m.regions?.length ? `（地区：${m.regions.join('、')}）` : ''}
                {m.is_active ? '' : ' · 已停用'}
              </div>
              <div className={styles.small}>
                {m.wechat_name || m.member_no ? `已绑微信：${m.wechat_name ?? ''}${m.member_no ? ' #' + m.member_no : ''}` : '还没绑微信'}
                {m.last_seen_at ? ` · 最近使用 ${fmtDateTime(m.last_seen_at)}` : ''}
                {m.email ? ` · 网站登录邮箱 ${m.email}` : ''}
                {m.phone ? ` · ${m.phone}` : ''}
              </div>
              {m.is_active ? (
                <>
                  <div className={styles.btnRow} style={{ marginTop: '0.6rem' }}>
                    <button className={styles.btn} disabled={busy === m.id} onClick={() => issue(m)}>
                      {busy === m.id ? '出码中…' : m.mp_bound_at ? '出码（换手机 / 换微信）' : '出码'}
                    </button>
                    <select
                      className={styles.select}
                      style={{ flex: '1 1 170px', width: 'auto' }}
                      aria-label={`${m.name} 的角色`}
                      value={roleValue(m)}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === 'region') return post({ action: 'update', id: m.id, roles: ['ops', 'checkin'], regions: m.regions?.length ? m.regions : ['洛杉矶/橙县'] }, `已把 ${m.name} 改为地区管理员（可在下面选地区），立即生效`);
                        post({ action: 'update', id: m.id, roles: [v], regions: [] }, `已把 ${m.name} 改为${ROLE[v]}，立即生效`);
                      }}
                    >
                      <option value="admin">角色：管理员</option>
                      <option value="ops">角色：运营</option>
                      <option value="checkin">角色：签到员</option>
                      <option value="finance">角色：财务</option>
                      <option value="region">角色：地区管理员</option>
                    </select>
                    {m.email && (
                      <button
                        className={`${styles.btn} ${styles.btnQuiet}`}
                        onClick={() => {
                          setWeb({ email: m.email!, name: m.name, roles: m.roles });
                          document.getElementById('web-login')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                      >
                        改网站登录
                      </button>
                    )}
                    {m.mp_bound_at && (
                      <button
                        className={`${styles.btn} ${styles.btnQuiet}`}
                        onClick={() => {
                          if (window.confirm(`解绑 ${m.name} 的微信？解绑后这个微信打不开工作台，要重新出码绑定。`)) post({ action: 'unbind', id: m.id }, `已解绑 ${m.name} 的微信`);
                        }}
                      >
                        解绑微信
                      </button>
                    )}
                    <button
                      className={`${styles.btn} ${styles.btnDanger}`}
                      onClick={() => {
                        if (window.confirm(`停用 ${m.name}？立即生效，网站后台和手机工作台都进不去了。以后可以点「恢复」。`)) post({ action: 'update', id: m.id, isActive: false }, `已停用 ${m.name}，立即生效`);
                      }}
                    >
                      停用
                    </button>
                  </div>
                  {m.regions?.length > 0 && !m.roles.includes('admin') && (
                    <div className={styles.chips} style={{ marginTop: '0.6rem' }}>
                      {REGIONS.map((r) => (
                        <button
                          key={r}
                          type="button"
                          className={`${styles.chip} ${m.regions.includes(r) ? styles.chipOn : ''}`}
                          onClick={() => {
                            const next = m.regions.includes(r) ? m.regions.filter((x) => x !== r) : [...m.regions, r];
                            if (next.length) post({ action: 'update', id: m.id, regions: next }, `${m.name} 的地区已改为 ${next.join('、')}`);
                            else setMsg({ ok: false, text: '地区管理员至少要管一个地区' });
                          }}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  )}
                  {codes[m.id] && (
                    <CodeCard
                      c={codes[m.id]}
                      onMsg={setMsg}
                      onClose={() =>
                        setCodes((x) => {
                          const n = { ...x };
                          delete n[m.id];
                          return n;
                        })
                      }
                    />
                  )}
                </>
              ) : (
                <div className={styles.btnRow} style={{ marginTop: '0.6rem' }}>
                  <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => post({ action: 'update', id: m.id, isActive: true }, `已恢复 ${m.name}`)}>
                    恢复
                  </button>
                </div>
              )}
            </div>
          ))}
          <p className={styles.small}>出好的码只在这一页显示；离开页面后要用再点一次「出码」（之前出的码 24 小时内仍然能用）。</p>

          <h2 className={styles.h2}>加人（开通手机工作台）</h2>
          <div className={styles.card}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="tm-name">姓名（同一人多个微信号请写清，例如“东哥 · 微信 2”）</label>
              <input id="tm-name" className={styles.input} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="tm-phone">手机号</label>
              <div className={styles.inputRow}>
                <select className={styles.select} aria-label="区号" value={f.cc} onChange={(e) => setF({ ...f, cc: e.target.value })}>
                  <option value="+1">美国 +1</option>
                  <option value="+86">中国 +86</option>
                </select>
                <input id="tm-phone" className={styles.input} inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="tm-role">角色</label>
              <select id="tm-role" className={styles.select} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
                <option value="ops">运营</option>
                <option value="checkin">签到员</option>
                <option value="finance">财务</option>
                <option value="region">地区管理员</option>
                <option value="admin">管理员</option>
              </select>
            </div>
            {f.role === 'region' && (
              <div className={styles.chips} style={{ marginBottom: '1rem' }}>
                {REGIONS.map((r) => (
                  <button key={r} type="button" className={`${styles.chip} ${f.regions.includes(r) ? styles.chipOn : ''}`} onClick={() => setF({ ...f, regions: f.regions.includes(r) ? f.regions.filter((x) => x !== r) : [...f.regions, r] })}>
                    {r}
                  </button>
                ))}
              </div>
            )}
            <button className={styles.btn} disabled={busy === 'add' || !f.name || !f.phone || (f.role === 'region' && !f.regions.length)} onClick={add}>
              {busy === 'add' ? '处理中…' : '加人并出码'}
            </button>
          </div>

          <h2 className={styles.h2} id="web-login">网站后台登录（按邮箱）</h2>
          <div className={styles.card}>
            <p className={styles.small} style={{ marginTop: 0 }}>
              要在电脑或手机浏览器上进这个网站后台的人，在这里填邮箱和角色；他用这个邮箱收验证码登录，不需要密码。已有的人点上面那一行的「改网站登录」就能改。
            </p>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="st-email">邮箱（用它收验证码登录）</label>
              <input id="st-email" className={styles.input} type="email" value={web.email} onChange={(e) => setWeb({ ...web, email: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="st-name">姓名</label>
              <input id="st-name" className={styles.input} value={web.name} onChange={(e) => setWeb({ ...web, name: e.target.value })} />
            </div>
            <p className={styles.label} style={{ margin: '0 0 0.4rem' }}>角色（可多选）</p>
            <div className={styles.chips} style={{ marginBottom: '1rem' }}>
              {WEB_ROLES.map(([k, l]) => {
                const on = web.roles.includes(k);
                return (
                  <button key={k} type="button" className={`${styles.chip} ${on ? styles.chipOn : ''}`} onClick={() => setWeb({ ...web, roles: on ? web.roles.filter((r) => r !== k) : [...web.roles, k] })}>
                    {l}
                  </button>
                );
              })}
            </div>
            <div className={styles.btnRow}>
              <button className={styles.btn} disabled={!web.email || !web.roles.length} onClick={saveWeb}>
                保存网站登录
              </button>
              {(web.email || web.name) && (
                <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => setWeb({ email: '', name: '', roles: [] })}>
                  清空
                </button>
              )}
            </div>
          </div>

          <h2 className={styles.h2}>操作记录</h2>
          {!log.length && <p className={styles.muted}>还没有记录。</p>}
          {!!log.length && (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr><th>时间</th><th>谁（哪个账号）</th><th>做了什么</th><th>对象</th></tr>
                </thead>
                <tbody>
                  {log.map((l, i) => (
                    <tr key={i}>
                      <td>{fmtDateTime(l.created_at)}</td>
                      <td>{l.actor.replace(/^staff:/, '')}</td>
                      <td>{ACTION[l.action] ?? '其他操作'}{detail(l) ? `（${detail(l)}）` : ''}</td>
                      <td>{l.target_name ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </StaffGate>
  );
}
