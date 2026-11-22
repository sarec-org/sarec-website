'use client';
import { useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { api } from '@/components/crm/client';

/** 后台综合优化：从后台首页挪出来（三.5：线上巡检状态挪到「设置与团队」，由子任务 A 挂上） */
type Patrol = { run: { at: string; trigger: string; total: number; failed: number; bad: { name: string; detail: string }[] } | null; email: { on: boolean; to: string } };
/** 东哥 11/12 定的发版关卡：线上只读巡检（部署后 + 每天）。有失败就在后台首页最上面显示红条；管理员可手动巡检、开关巡检邮件（默认关，只发给东哥本人） */
export function PatrolBar({ admin }: { admin: boolean }) {
  const [p, setP] = useState<Patrol | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api<Patrol>('/api/v1/staff/qa-patrol').then((x) => x.ok && setP(x.data)); }, []);
  const post = async (body: Record<string, unknown>) => { setBusy(true); const r = await api<Patrol>('/api/v1/staff/qa-patrol', { body }); setBusy(false); if (r.ok) setP(r.data); };
  if (!p) return null;
  const r = p.run;
  const when = r ? new Date(r.at).toLocaleString('zh-CN') : '';
  return (
    <>
      {r && r.failed > 0 && (
        <div style={{ background: '#C0392B', color: '#fff', padding: '0.8rem 1rem', borderRadius: 8, marginBottom: '1rem' }}>
          <strong>线上巡检发现 {r.failed} 项不正常</strong>（{when}，共查 {r.total} 项）
          <ul style={{ margin: '0.4rem 0 0 1.2rem', padding: 0 }}>
            {r.bad.slice(0, 8).map((x) => <li key={x.name}>{x.name}：{x.detail}</li>)}
          </ul>
          {r.bad.length > 8 && <div>还有 {r.bad.length - 8} 项…</div>}
        </div>
      )}
      {admin && (
        <p className={styles.small} style={{ marginTop: 0 }}>
          线上巡检：{r ? `${when}，${r.total} 项，${r.failed ? `${r.failed} 项不正常` : '全部正常'}` : '还没跑过'}。
          巡检邮件 {p.email.on ? '已开' : '已关'}（收件人 {p.email.to}）。
          <button className={`${styles.btn} ${styles.btnQuiet}`} disabled={busy} onClick={() => post({ action: 'run' })} style={{ marginLeft: 8 }}>{busy ? '巡检中…' : '现在巡检一次'}</button>
          <button className={`${styles.btn} ${styles.btnQuiet}`} disabled={busy} onClick={() => post({ action: 'email', on: !p.email.on })} style={{ marginLeft: 8 }}>{p.email.on ? '关掉巡检邮件' : '打开巡检邮件'}</button>
        </p>
      )}
    </>
  );
}

