'use client';
import Link from 'next/link';
import styles from '@/components/crm/crm.module.css';
import { StaffGate, can } from '@/components/crm/staff/StaffGate';
import { api } from '@/components/crm/client';

const SECTIONS: { href: string; title: string; desc: string; role: string }[] = [
  { href: '/zh/staff/followups', title: '待跟进任务', desc: 'AI 助手线索、新咨询、活动后希望了解、30 天内到期会员；失败与异常在“待处理”', role: 'ops' },
  { href: '/zh/staff/checkin', title: '现场签到台', desc: '查人、代签到、现场登记', role: 'checkin' },
  { href: '/zh/staff/payments', title: '核款工作台', desc: '核对 Zelle 到账，一键确认或标记未到账', role: 'finance' },
  { href: '/zh/staff/events', title: '活动管理', desc: '新建、编辑、关闭报名、下载签到码', role: 'ops' },
  { href: '/zh/staff/contacts', title: '客户查询', desc: '档案、时间线、积分、标签、导出', role: 'ops' },
  { href: '/zh/staff/album', title: '活动相册', desc: '上传现场照片（自动加水印）、活动封面、发布并通知到场的人', role: 'ops' },
  { href: '/zh/staff/rooms', title: '会议室与电子屏', desc: '线下预约登记（防撞期）、收款登记、会议室展示信息、电子屏审核', role: 'ops' },
  { href: '/zh/staff/growth', title: '增长与设置', desc: '点击统计、推荐排行、商会微信二维码、视频号、专委会、内容显示范围', role: 'ops' },
  { href: '/zh/staff/features', title: '功能排行', desc: '每个功能用了多少、带来多少报名到场入会；调首页入口顺序', role: 'ops' },
  { href: '/zh/staff/channels', title: '渠道码', desc: '合作商家 / 机构 / 副会长单位专属码，按渠道看报名到场', role: 'ops' },
  { href: '/zh/staff/cards', title: '内容审核', desc: '会员自己填写的电子名片、客户上传的照片：逐条查看，可下架、退回、删除', role: 'ops' },
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
