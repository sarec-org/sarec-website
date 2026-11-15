'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { StaffGate } from '@/components/crm/staff/StaffGate';
import { api } from '@/components/crm/client';

type C = { id: string; member_no: number; name: string; email: string | null; phone_e164: string | null; cur_email: string | null; cur_phone: string | null; email_status: string | null; email_status_text: string; phone_status: string | null; phone_status_text: string; role_label: string | null; tier: string | null; member_until: string | null; points: number; attended: number };
const STATUS_COLOR: Record<string, string> = { confirmed: '#9fd6a8', unconfirmed: 'var(--ivory-mute)', invalid: '#f3a1a1' };
type Meta = { roleCategories: { key: string; label: string }[]; topics: Record<string, string> };
const REGIONS = ['洛杉矶市区', '圣盖博谷（阿罕布拉、圣盖博、阿卡迪亚等）', '东区（核桃、钻石吧、罗兰岗等）', '橙县', '内陆帝国', '南湾', '北加州', '德州', '其他州'];
const TOPIC_TAGS = ['ADU 加建', '地块分割与小型开发', '新建开发项目', '买房出租', '翻新转卖', '商业地产', '贷款融资', '税务与资产配置', '保险与传承', '投资移民', '中国企业出海', 'AI 与房地产科技', '物业管理', '政策法规'];

export default function StaffContacts() {
  const [f, setF] = useState({ q: '', region: '', roleCategory: '', topic: '', tag: '', member: '', emailStatus: '' });
  const [rows, setRows] = useState<C[] | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [err, setErr] = useState('');
  const qs = (x = f) => new URLSearchParams(Object.entries(x).filter(([, v]) => v)).toString();
  async function load(x = f) {
    const r = await api<{ contacts: C[] }>(`/api/v1/staff/contacts?${qs(x)}`);
    if (r.ok) setRows(r.data.contacts);
    else setErr(r.message);
  }
  useEffect(() => {
    api<Meta>('/api/v1/meta').then((r) => r.ok && setMeta(r.data));
    // 网址带 ?q= 时（别的页面点“查看客户”过来）直接按它查
    const q = new URLSearchParams(location.search).get('q') ?? '';
    const first = { ...f, q };
    if (q) setF(first);
    load(first);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const sel = (k: keyof typeof f, label: string, opts: [string, string][]) => (
    <div className={styles.field} style={{ margin: 0 }}>
      <label className={styles.small} htmlFor={`f-${k}`}>{label}</label>
      <select id={`f-${k}`} className={styles.select} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })}>
        <option value="">全部</option>
        {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
  return (
    <StaffGate title="客户" role="ops" wide>
      {() => (
        <>
          {err && <div className={styles.error}>{err}</div>}
          <div className={styles.inputRow} style={{ marginBottom: '0.75rem' }}>
            <input className={styles.input} placeholder="姓名 / 邮箱 / 手机 / 会员编号" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && load()} />
            <button className={styles.btn} onClick={() => load()}>查询</button>
          </div>
          <div className={styles.grid2} style={{ marginBottom: '0.75rem' }}>
            {sel('member', '身份', [['member', '正式会员'], ['registered', '注册用户']])}
            {sel('emailStatus', '邮箱状态', [['confirmed', '已确认'], ['unconfirmed', '未确认'], ['invalid', '无效'], ['none', '没填']])}
            {sel('region', '关注区域', REGIONS.map((r) => [r, r]))}
            {sel('roleCategory', '行业大类', (meta?.roleCategories ?? []).map((c) => [c.key, c.label]))}
            {sel('topic', '关注主题', TOPIC_TAGS.map((t) => [t, t]))}
            <div className={styles.field} style={{ margin: 0 }}>
              <label className={styles.small} htmlFor="f-tag">任意标签包含</label>
              <input id="f-tag" className={styles.input} value={f.tag} placeholder="如 往返:上海" onChange={(e) => setF({ ...f, tag: e.target.value })} />
            </div>
          </div>
          <div className={styles.btnRow} style={{ marginBottom: '1rem' }}>
            <button className={styles.btn} onClick={() => load()}>按条件筛选</button>
            <a className={`${styles.btn} ${styles.btnGhost}`} href={`/api/v1/staff/contacts?${qs()}&format=csv`}>导出 Excel（CSV）</a>
          </div>
          <p className={styles.small}>{rows ? `共 ${rows.length} 人（最多显示 200）` : '加载中…'}</p>
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.table}>
              <thead><tr><th>姓名</th><th>邮箱</th><th>手机</th><th>行业</th><th>身份</th><th>积分</th><th>到场</th></tr></thead>
              <tbody>
                {rows?.map((c) => (
                  <tr key={c.id}>
                    <td><Link href={`/zh/staff/contacts/${c.id}`} style={{ color: 'var(--gold)' }}>{c.name}</Link> <span className={styles.small}>#{c.member_no}</span></td>
                    <td className={styles.small}>{c.cur_email ?? c.email ?? '—'}<br /><span style={{ color: STATUS_COLOR[c.email_status ?? ''] ?? 'var(--ivory-mute)' }}>{c.email_status_text}</span></td>
                    <td className={styles.small}>{c.cur_phone ?? c.phone_e164 ?? '—'}<br /><span style={{ color: STATUS_COLOR[c.phone_status ?? ''] ?? 'var(--ivory-mute)' }}>{c.phone_status_text}</span></td>
                    <td className={styles.small}>{c.role_label ?? '—'}</td>
                    <td className={styles.small}>{c.tier ? `${c.tier}（至 ${c.member_until}）` : '注册用户'}</td>
                    <td>{c.points}</td>
                    <td>{c.attended}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </StaffGate>
  );
}
