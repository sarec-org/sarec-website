'use client';
import Link from 'next/link';
import styles from '@/components/crm/crm.module.css';
import { StaffGate, can } from '@/components/crm/staff/StaffGate';
import { api } from '@/components/crm/client';

const SECTIONS: { href: string; title: string; desc: string; role: string }[] = [
  { href: '/zh/staff/checkin', title: '现场签到台', desc: '查人、代签到、现场登记', role: 'checkin' },
  { href: '/zh/staff/payments', title: '核款工作台', desc: '核对 Zelle 到账，一键确认或标记未到账', role: 'finance' },
  { href: '/zh/staff/events', title: '活动管理', desc: '新建、编辑、关闭报名、下载签到码', role: 'ops' },
  { href: '/zh/staff/contacts', title: '客户查询', desc: '档案、时间线、积分、标签、导出', role: 'ops' },
  { href: '/zh/staff/rooms', title: '会议室与电子屏', desc: '预约排期、电子屏审核', role: 'ops' },
  { href: '/zh/staff/display', title: '官网展示审核', desc: '会员资料能否在官网展示（不影响会员身份）', role: 'ops' },
  { href: '/zh/staff/settings', title: '设置', desc: '会员价、屏幕费、积分比例、商家优惠、工作人员', role: 'admin' }
];

export default function StaffHome() {
  return (
    <StaffGate title="工作人员后台">
      {(s) => (
        <>
          <p className={styles.lead}>
            {s.name}，您好。您的权限：{s.roles.map((r) => ({ checkin: '现场签到', finance: '财务核款', ops: '运营', admin: '管理员' })[r] ?? r).join('、')}
          </p>
          <div className={styles.grid2}>
            {SECTIONS.filter((x) => can(s, x.role)).map((x) => (
              <Link key={x.href} href={x.href} className={`${styles.card} ${styles.cardGold}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <p className={styles.cardTitle}>{x.title}</p>
                <p className={styles.muted} style={{ margin: 0 }}>{x.desc}</p>
              </Link>
            ))}
          </div>
          <button
            className={`${styles.btn} ${styles.btnQuiet}`}
            onClick={async () => {
              await api('/api/v1/auth/logout', { body: {} });
              location.reload();
            }}
          >
            退出登录
          </button>
        </>
      )}
    </StaffGate>
  );
}
