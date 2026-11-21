'use client';
/** 后台综合优化 一.4：专委会和俱乐部的意向名单——真实姓名和联系方式；没留姓名手机号的老意向标“待补填”（本人下次打开小程序时会提示补填） */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from '@/components/crm/crm.module.css';
import { Msg, StaffGate } from '@/components/crm/staff/StaffGate';
import { api, fmtDate } from '@/components/crm/client';
import { ContactButtons, MemberBadge } from '@/components/crm/staff/ContactButtons';

type R = { committee: string; committee_name: string; contact_id: string; member_no: number; name: string | null; phone: string | null; email: string | null; needs_fill: boolean; created_at: string; is_member: boolean };

export default function Committees() {
  const [rows, setRows] = useState<R[] | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => {
    api<{ interests: R[] }>('/api/v1/staff/committees').then((r) => (r.ok ? setRows(r.data.interests) : setMsg({ ok: false, text: r.message })));
  }, []);
  const groups = Array.from(new Set((rows ?? []).map((r) => r.committee_name)));
  return (
    <StaffGate title="专委会和俱乐部意向" role="ops">
      {() => (
        <>
          <p className={styles.small}>谁想加入哪个专委会或俱乐部。表达意向时必须留姓名和手机号；以前没留的标“待补填”，本人下次打开小程序时会提示补填。</p>
          <Msg m={msg} />
          {rows && !rows.length && <p className={styles.muted}>还没有人表达意向。</p>}
          {groups.map((g) => {
            const list = (rows ?? []).filter((r) => r.committee_name === g);
            return (
              <section key={g}>
                <h2 className={styles.h}>{g}（{list.length} 人）</h2>
                {list.map((r) => (
                  <div key={r.contact_id + r.committee} className={styles.card}>
                    <div>
                      <Link href={`/zh/staff/contacts/${r.contact_id}`} style={{ color: 'inherit' }}><b>{r.name ?? '没留姓名'}</b></Link>
                      {' '}<MemberBadge isMember={r.is_member} />
                      {r.needs_fill && <span className={`${styles.badge} ${styles.badgeRed}`} style={{ marginLeft: 6 }}>待补填</span>}
                    </div>
                    <div className={styles.small}>{r.phone ?? '没留手机号'}{r.email ? ` · ${r.email}` : ''} · {fmtDate(r.created_at)} 表达意向</div>
                    <ContactButtons phone={r.phone} email={r.email} name={r.name} />
                  </div>
                ))}
              </section>
            );
          })}
        </>
      )}
    </StaffGate>
  );
}
