'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { StaffGate, can } from '@/components/crm/staff/StaffGate';
import { api } from '@/components/crm/client';

const SECTIONS: { href: string; title: string; desc: string; role: string }[] = [
  { href: '/zh/staff/followups', title: '待跟进任务', desc: 'AI 助手线索、新咨询、活动后希望了解、30 天内到期会员；失败与异常在“待处理”', role: 'ops' },
  { href: '/zh/staff/checkin', title: '现场签到台', desc: '查人、代签到、现场登记', role: 'checkin' },
  { href: '/zh/staff/join-requests', title: '入会申请', desc: '小程序“加入商会”提交的申请：一键发网站缴费链接（短信 / 邮件 / 复制发微信），满 7 天没入会提醒跟进', role: 'ops' },
  { href: '/zh/staff/payments', title: '核款工作台', desc: '核对 Zelle 到账，一键确认或标记未到账', role: 'finance' },
  { href: '/zh/staff/events', title: '活动管理', desc: '新建、编辑、关闭报名、下载签到码', role: 'ops' },
  { href: '/zh/staff/contacts', title: '客户查询', desc: '档案、时间线、积分、标签、导出', role: 'ops' },
  { href: '/zh/staff/album', title: '活动相册', desc: '上传现场照片（自动加水印）、活动封面、发布并通知到场的人', role: 'ops' },
  { href: '/zh/staff/rooms', title: '会议室与电子屏', desc: '线下预约登记（防撞期）、收款登记、会议室展示信息、电子屏审核', role: 'ops' },
  { href: '/zh/staff/growth', title: '增长与设置', desc: '点击统计、推荐排行、商会微信二维码、视频号、专委会、内容显示范围', role: 'ops' },
  { href: '/zh/staff/growth#wechat-qr', title: '换商会微信二维码', desc: '小程序和网站里所有“加商会微信”的码，手机上也能直接换图', role: 'ops' },
  { href: '/zh/staff/newsletter', title: '邮件通讯', desc: '给验证过邮箱的会员和注册用户发通讯：按标签筛选、个性化、先发测试给东哥、东哥确认后才群发；看送达、打开、点击、退订', role: 'ops' },
  { href: '/zh/staff/prep', title: '活动筹备清单', desc: '每场活动按类型自动生成的筹备清单：负责人、截止时间、打勾、拍摄清单、复盘；模板也在这里改', role: 'ops|checkin' },
  { href: '/zh/staff/recaps', title: '活动回顾', desc: '活动结束后自动整理好的照片精选、回顾、推文初稿，一次审核发布', role: 'ops' },
  { href: '/zh/staff/features', title: '功能排行', desc: '每个功能用了多少、带来多少报名到场入会；调首页入口顺序', role: 'ops' },
  { href: '/zh/staff/channels', title: '渠道码', desc: '合作商家 / 机构 / 副会长单位专属码，按渠道看报名到场', role: 'ops' },
  { href: '/zh/staff/cards', title: '内容审核', desc: '会员自己填写的电子名片、客户上传的照片：逐条查看，可下架、退回、删除', role: 'ops' },
  { href: '/zh/staff/display', title: '官网展示审核', desc: '会员资料能否在官网展示（不影响会员身份）', role: 'ops' },
  { href: '/zh/staff/settings', title: '设置', desc: '会员价、屏幕费、积分比例、商家优惠、工作人员', role: 'admin' }
];

type Results = { yesterday: { visits: number; newArrived: number; joined: number; inquiries: number }; pending: { todo: number; exceptions: number; cards: number; photos: number; recaps: number } };

/** 1.3 J：每天看四个结果（昨天）+ 未完成的事集中列出 */
function Today() {
  const [r, setR] = useState<Results | null>(null);
  useEffect(() => {
    api<Results>('/api/v1/staff/results').then((x) => x.ok && setR(x.data));
  }, []);
  if (!r) return null;
  const y = r.yesterday;
  const p = r.pending;
  const todo = [
    p.recaps ? { href: '/zh/staff/recaps', t: `${p.recaps} 场活动回顾待审核` } : null,
    p.todo ? { href: '/zh/staff/followups', t: `${p.todo} 条待联系` } : null,
    p.cards || p.photos ? { href: '/zh/staff/cards', t: `${p.cards} 张名片、${p.photos} 张照片待审核` } : null,
    p.exceptions ? { href: '/zh/staff/followups', t: `${p.exceptions} 条失败 / 异常` } : null
  ].filter(Boolean) as { href: string; t: string }[];
  return (
    <div className={styles.card}>
      <p className={styles.cardTitle}>昨天的四个结果</p>
      <div className={styles.grid2}>
        <p style={{ margin: 0 }}>分享带来的访问 <strong>{y.visits}</strong></p>
        <p style={{ margin: 0 }}>新人报名并到场 <strong>{y.newArrived}</strong></p>
        <p style={{ margin: 0 }}>缴费入会 <strong>{y.joined}</strong></p>
        <p style={{ margin: 0 }}>有效咨询 <strong>{y.inquiries}</strong></p>
      </div>
      {todo.length ? (
        <p className={styles.small} style={{ marginBottom: 0 }}>待办：{todo.map((x, i) => <span key={x.href + i}>{i ? '；' : ''}<Link href={x.href}>{x.t}</Link></span>)}</p>
      ) : (
        <p className={styles.small} style={{ marginBottom: 0 }}>没有待办。</p>
      )}
    </div>
  );
}

/** 1.3 N：在小程序里用手机工作台——生成一次性绑定码，用自己的微信扫一下 */
function MpBind() {
  const [b, setB] = useState<{ code: string; qr: string | null; expiresAt: string } | null>(null);
  const [err, setErr] = useState('');
  return (
    <div className={styles.card}>
      <p className={styles.cardTitle}>在手机上管：小程序工作台</p>
      <p className={styles.small}>用自己的微信扫一下下面的码，就能在商会小程序“我的”里打开工作台：拍照传相册、看实时报名签到、现场代签到、待办和筹备清单。收款和会费只在这个网站后台看。</p>
      {!b && <button className={styles.btn} onClick={async () => { const r = await api<{ code: string; qr: string | null; expiresAt: string }>('/api/v1/staff/mp-bind', { body: {} }); if (r.ok) setB(r.data); else setErr(r.message); }}>生成绑定码</button>}
      {err && <p className={styles.error}>{err}</p>}
      {b && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {b.qr ? <img src={b.qr} alt="工作台绑定码" style={{ width: 200, height: 200, background: '#fff' }} /> : <p className={styles.notice}>小程序码暂时生成不了。请在小程序“我的 → 关于商会”页面连续点 5 下标题，输入绑定码：<b className={styles.mono}>{b.code}</b></p>}
          <p className={styles.small}>10 分钟内有效，只能用一次。绑定码：<span className={styles.mono}>{b.code}</span></p>
        </>
      )}
    </div>
  );
}

export default function StaffHome() {
  return (
    <StaffGate title="工作人员后台">
      {(s) => (
        <>
          <p className={styles.lead}>
            {s.name}，您好。您的权限：{s.roles.map((r) => ({ checkin: '现场签到', finance: '财务核款', ops: '运营', admin: '管理员' })[r] ?? r).join('、')}
          </p>
          {can(s, 'ops') && <Today />}
          <div className={styles.grid2}>
            {SECTIONS.filter((x) => x.role.split('|').some((r) => can(s, r))).map((x) => (
              <Link key={x.href} href={x.href} className={`${styles.card} ${styles.cardGold}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <p className={styles.cardTitle}>{x.title}</p>
                <p className={styles.muted} style={{ margin: 0 }}>{x.desc}</p>
              </Link>
            ))}
          </div>
          <MpBind />
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
