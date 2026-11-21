'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { StaffGate, can } from '@/components/crm/staff/StaffGate';
import { api } from '@/components/crm/client';
import { NAV_GROUPS, NAV_ITEMS, ROLE_NAME, canSee, type NavGroup } from '@/components/crm/staff/nav';
import { notifyStaffChanged } from '@/components/crm/staff/useStaffMe';

/**
 * 1.4.0：卡片名统一用导航上的短名（东哥已点头），按 今天现场 / 活动 / 会员与客户 / 内容 / 设置与团队 分组。
 * 名字、分组、谁能看见都从 components/crm/staff/nav.ts 来；这里只放每张卡片的说明文字。
 */
const DESC: Record<string, string> = {
  '/zh/staff/followups': 'AI 助手线索、新咨询、活动后希望了解、30 天内到期会员；失败与异常在“待处理”',
  '/zh/staff/checkin': '查人、代签到、现场登记',
  '/zh/staff/backfill': '实际来了但系统没记上的人：按手机号补报名并记到场，活动结束后也能补，留操作记录',
  '/zh/staff/duplicates': '同手机号 / 同邮箱 / 同名的疑似重复，确认后合并（报名、签到、积分都保留，重复积分不相加），可撤销',
  '/zh/staff/checkin-questions': '来过的人扫码时自动出的 1–3 道选择题：题目、选项、顺序、启用',
  '/zh/staff/join-requests': '小程序“加入商会”提交的申请：一键发网站缴费链接（短信 / 邮件 / 复制发微信），满 7 天没入会提醒跟进',
  '/zh/staff/payments': '核对 Zelle 到账，一键确认或标记未到账',
  '/zh/staff/docs': '公司 PPT 介绍等：上传 PDF（自动逐页转图）或一组图片，小程序里能看、能转发、能看 PDF 原件；看打开 / 转发次数',
  '/zh/staff/system': '线上巡检、线上报错（新报错交给开发处理，不进待办）',
  '/zh/staff/data': '一页看懂：来了多少新人、多少人到场、多少人入会、哪些功能和渠道带来的最多；明细（每场活动、功能、点击、推荐排行、操作记录）可展开',
  '/zh/staff/content-visibility': '每篇文章在网站和小程序里显示全文、只给简介还是不显示',
  '/zh/staff/home-slides': '系统自动排；只处理例外：置顶、隐藏、改文案 / 换图、手动加一张（都要截止时间）；预览新人 / 已报名 / 会员分别看到什么',
  '/zh/staff/events': '新建、编辑、关闭报名、下载签到码',
  '/zh/staff/contacts': '档案、时间线、积分、标签、导出',
  '/zh/staff/album': '按活动看照片墙：传照片（传好大家就能看到）、下架、禁止某人上传、通知到场的人',
  '/zh/staff/rooms': '线下预约登记（防撞期）、收款登记、会议室展示信息、电子屏审核',
  // 改动单 D3：原来写“按标签筛选”，实际没有；改成实际能做的
  '/zh/staff/newsletter': '给验证过邮箱的会员和注册用户发通讯：按身份、参加过的活动类型、行业、地区、渠道来源选人，个性化、先发测试给东哥、东哥确认后才群发；看送达、打开、点击、退订',
  '/zh/staff/prep': '每场活动按类型自动生成的筹备清单：负责人、截止时间、打勾、拍摄清单、复盘；模板也在这里改',
  '/zh/staff/recaps': '活动结束后自动整理好的照片精选、回顾、推文初稿，一次审核发布',
  '/zh/staff/channels': '合作商家 / 机构 / 副会长单位专属码，按渠道看报名到场',
  '/zh/staff/cards': '会员自己填写的电子名片、客户上传的照片：逐条查看，可下架、退回、删除',
  '/zh/staff/display': '会员资料能否在官网展示（不影响会员身份）',
  '/zh/staff/agent': '网站上的商会 AI 助手：月预算、每日用量、常见问题库、最近对话和线索',
  '/zh/staff/team': '工作人员和权限：加人、每人一行「出码」（同事用微信扫一下就绑定好手机工作台）、停用、改角色，立即生效；网站登录邮箱也在这里管',
  '/zh/staff/settings': '所有配置集中在这里：现在关着的功能、收款与价格、活动、小程序与微信、邮件；我的手机工作台绑定码',
  '/zh/staff/jobs': '发布的活儿：状态（自动到期）、联系次数、到期日；下架、写备注',
  '/zh/staff/jobs/pros': '登记接活的人：待核验 / 已通过 / 退回 / 下架；加州承包商牌照自动查，其余一键打开官方查询页 + 核验清单',
  '/zh/staff/jobs/trades': '工种与资质表：增删改、排序、分组、开放；首页 7 个入口换和排序',
  '/zh/staff/jobs/cities': '城市表（按地区）：加、改名、排序、停用；发活儿、登记接活、城市筛选都用它',
  '/zh/staff/jobs/switches': '「找工人／施工队」「我要接活儿」两个栏目开关、接活儿收费方式（全部免费 / 免费额度 / 必须是会员）、免费次数（改前确认，记谁改的）',
  '/zh/staff/jobs/stats': '每个工种的点击数、活儿数、联系次数、成了的数、平均多久有人联系',
  '/zh/staff/jobs/reports': '卡片和活儿上的"反馈 / 投诉"：看内容、标已处理',
  '/zh/staff/jobs/invite': '按行业标签筛现有会员，先预览再确认，发"来登记接活"的邀请（默认演练）'
};
/** 不是单独页面、但常用的卡片（挪进「设置」后仍留一张直达卡） */
const EXTRA: { href: string; title: string; desc: string; role: string; group: NavGroup; after: string }[] = [
  { href: '/zh/staff/settings#wechat-qr', title: '换商会微信二维码', desc: '小程序和网站里所有“加商会微信”的码，手机上也能直接换图（在「设置」页）', role: 'admin', group: '设置与团队', after: '/zh/staff/settings' },
  { href: '/zh/staff/settings#mp-bind', title: '我的手机工作台绑定码', desc: '用自己的微信扫一下，在小程序「我的」里打开工作台（在「设置」页）', role: '', group: '设置与团队', after: '/zh/staff/settings' }
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
    p.exceptions ? { href: '/zh/staff/followups?tab=exceptions', t: `${p.exceptions} 条失败 / 异常` } : null
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

/** 首页卡片：按组排，每组一个小标题；只放登录者能进的 */
function Desk({ roles }: { roles: string[] }) {
  return (
    <>
      {NAV_GROUPS.map((g) => {
        const cards: { href: string; title: string; desc: string }[] = [];
        for (const it of NAV_ITEMS) {
          if (it.group !== g || it.href === '/zh/staff' || !canSee(roles, it)) continue;
          cards.push({ href: it.href, title: it.label, desc: DESC[it.href] ?? '' });
          for (const x of EXTRA) if (x.after === it.href && canSee(roles, x)) cards.push(x);
        }
        if (!cards.length) return null;
        return (
          <section key={g}>
            <h2 className={styles.h2} style={{ marginTop: '1.5rem' }}>{g}</h2>
            <div className={styles.grid2}>
              {cards.map((x) => (
                <Link key={x.href} href={x.href} className={`${styles.card} ${styles.cardGold}`} style={{ textDecoration: 'none', color: 'inherit', margin: 0 }}>
                  <p className={styles.cardTitle}>{x.title} ›</p>
                  <p className={styles.muted} style={{ margin: 0 }}>{x.desc}</p>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}

export default function StaffHome() {
  return (
    <StaffGate title="工作人员后台">
      {(s) => (
        <>
          <p className={styles.lead}>
            {s.name}，您好。您的权限：{s.roles.map((r) => ROLE_NAME[r] ?? r).join('、')}
          </p>
          {/* 后台综合优化 11/21（三.5）：线上巡检挪到「设置与团队 › 系统状态」，我的绑定码挪到「设置与团队 › 设置」 */}
          {can(s, 'ops') && <Today />}
          <Desk roles={s.roles} />
          <button
            className={`${styles.btn} ${styles.btnQuiet}`}
            style={{ marginTop: '2rem' }}
            onClick={async () => {
              await api('/api/v1/auth/logout', { body: {} });
              notifyStaffChanged();
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
