'use client';
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { Msg, StaffGate } from '@/components/crm/staff/StaffGate';
import { api } from '@/components/crm/client';

type A = { id: string; application_type: string; selected_tier_slug: string; company_name: string | null; contact_name: string | null; email: string; website_url: string | null; company_description: string | null; display_status: string; membership_end_date: string | null; contact_id: string | null };
const LABEL: Record<string, string> = { not_submitted: '未提交', pending_review: '待审核', approved: '可展示', rejected: '不展示', published: '已上线', expired: '已过期', hidden: '已隐藏' };

export default function StaffDisplay() {
  const [rows, setRows] = useState<A[] | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const load = useCallback(async () => {
    const r = await api<{ applications: A[] }>('/api/v1/staff/display');
    if (r.ok) setRows(r.data.applications);
    else setMsg({ ok: false, text: r.message });
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  async function set(id: string, displayStatus: string) {
    const r = await api('/api/v1/staff/display', { body: { applicationId: id, displayStatus } });
    setMsg(r.ok ? { ok: true, text: `已设为「${LABEL[displayStatus]}」` } : { ok: false, text: r.message });
    load();
  }
  return (
    <StaffGate title="官网展示" role="ops">
      {() => (
        <>
          <div className={styles.notice}>这里只决定会员资料能否在商会官网公开展示，<strong>不影响会员身份</strong>。会员付款后即已生效。</div>
          <Msg m={msg} />
          {rows?.map((a) => (
            <div key={a.id} className={styles.card}>
              <p className={styles.cardTitle}>{a.company_name || a.contact_name} <span className={styles.badge}>{LABEL[a.display_status] ?? a.display_status}</span></p>
              <p className={styles.small}>{a.selected_tier_slug} · {a.contact_name} · {a.email} · 有效期至 {a.membership_end_date ?? '—'}</p>
              {a.website_url && <p className={styles.small}>{a.website_url}</p>}
              {a.company_description && <p>{a.company_description}</p>}
              <div className={styles.btnRow}>
                <button className={styles.btn} onClick={() => set(a.id, 'approved')}>可以展示</button>
                <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => set(a.id, 'rejected')}>不展示</button>
                <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => set(a.id, 'hidden')}>隐藏</button>
              </div>
            </div>
          ))}
          {rows && !rows.length && <p className={styles.muted}>暂无会员申请。</p>}
        </>
      )}
    </StaffGate>
  );
}
