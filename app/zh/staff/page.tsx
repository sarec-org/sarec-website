'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { StaffGate, can } from '@/components/crm/staff/StaffGate';
import { api } from '@/components/crm/client';
import { NAV_GROUPS, NAV_ITEMS, ROLE_NAME, canSee, type NavGroup } from '@/components/crm/staff/nav';
import { notifyStaffChanged } from '@/components/crm/staff/useStaffMe';
import { ActionButtons, ContactResult } from '@/components/crm/staff/TodayActions';
import { QuickActions } from '@/components/crm/staff/QuickActions';
import type { TodayItem, TodayPayload } from '@/lib/crm/today/types';

/**
 * 后台综合优化 B（第二部分 三）：后台首页 = 「今天」。打开就是一列要办的事，每条一句话"这是什么、建议怎么办"，按钮直接在卡片上。
 * 排序在服务器（lib/crm/today/registry.ts）：置顶的活动回顾 → 钱 → 已过期跟进 → 新咨询 → 待审核待确认。
 * 今天有活动时最上面"今天现场"三个大按钮；"昨天的四个结果"在待办下面；没有待办显示"今天没有要办的事"。
 * 线上巡检、绑定码挪到「设置与团队」（组件在 components/crm/staff/PatrolBar.tsx、MpBind.tsx，由子任务 A 挂）。
 * 下面"全部功能"卡片保留（原有入口一个不少）。
 *
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
  '/zh/staff/settings': '最上面「常用」：下载小程序码、复制小程序路径、渠道码、海报模板、节日日期表；各个开关直达；收款与价格、活动、小程序与微信、邮件；关着的功能',
  '/zh/staff/jobs': '发布的活儿：状态（自动到期）、联系次数、到期日；下架、写备注',
  '/zh/staff/jobs/pros': '登记接活的人：待核验 / 已通过 / 退回 / 下架；加州承包商牌照自动查，其余一键打开官方查询页 + 核验清单',
  '/zh/staff/jobs/trades': '工种与资质表：增删改、排序、分组、开放；首页 7 个入口换和排序',
  '/zh/staff/jobs/cities': '城市表（按地区）：加、改名、排序、停用；发活儿、登记接活、城市筛选都用它',
  '/zh/staff/jobs/switches': '「找工人／施工队」「我要接活儿」两个栏目开关、接活儿收费方式（全部免费 / 免费额度 / 必须是会员）、免费次数（改前确认，记谁改的）',
  '/zh/staff/jobs/stats': '每个工种的点击数、活儿数、联系次数、成了的数、平均多久有人联系',
  '/zh/staff/jobs/reports': '卡片和活儿上的"反馈 / 投诉"：看内容、标已处理',
  '/zh/staff/jobs/invite': '按行业标签筛现有会员，先预览再确认，发"来登记接活"的邀请（默认演练）',
  '/zh/staff/jobs/proxy': '替师傅代登记接活儿资料：一个一个填，或从 Excel / 微信表格整张贴进来，先预览再写入；本人收到确认链接（总闸关着时只记录不发）',
  '/zh/staff/committees': '专委会和俱乐部的意向名单：真实姓名、手机、邮箱；没留姓名手机号的标“待补填”',
  '/zh/staff/notify': '每人选自己收哪几类通知、走短信 / 企业微信 / 邮件；最近的通知和“本该发什么”的记录',
  // 1.5.0 新页面
  '/zh/staff/clubs': '俱乐部：新建 / 编辑 / 关闭、指定负责人、上传群二维码（快过期标红）；组局放行 / 下架 / 恢复；禁止名单；操作记录',
  '/zh/staff/broadcast': '按条件选人（实时人数、各渠道能发到几个）→ 写内容（短信 / 邮件 / 微信服务通知）→ 先发东哥预览 → 管理员确认（受「手机通知」总闸管，关着只记录不发）；页面下面也能按期发「邮件通讯」',
  '/zh/staff/moderation': '被举报的、机器拦下的、等放行的主办方活动、组局、名片、客户照片、找工人投诉、下架的模板：每处各有几条要处理，点进去办',
  '/zh/staff/content': '用户发的组局、个人主页、项目、名片、照片发了就公开：这里看被举报的、机器拦下的、已下架的，可下架、恢复、禁止此人',
  '/zh/staff/showcase': '副会长单位、战略合作方：标志、简介、项目图文、联系人、排序、下架；小程序首页入口开关'
};
/** 不是单独页面、但常用的卡片（挪进「设置」后仍留一张直达卡） */
const EXTRA: { href: string; title: string; desc: string; role: string; group: NavGroup; after: string }[] = [
  { href: '/zh/staff/settings#wechat-qr', title: '换商会微信二维码', desc: '小程序和网站里所有“加商会微信”的码，手机上也能直接换图（在「设置」页）', role: 'admin', group: '设置与团队', after: '/zh/staff/settings' },
  { href: '/zh/staff/settings#mp-bind', title: '我的手机工作台绑定码', desc: '用自己的微信扫一下，在小程序「我的」里打开工作台（在「设置」页）', role: '', group: '设置与团队', after: '/zh/staff/settings' }
];


type Msg = { ok: boolean; text: string };

function Card({ it, onChanged }: { it: TodayItem; onChanged: () => void }) {
  const [msg, setMsg] = useState<Msg | null>(null);
  const [asked, setAsked] = useState(false);
  const done = (m: Msg) => {
    setMsg(m);
    // 直接生效的按钮成功后整列刷新（复制只提示，不刷新）
    if (m.ok && !m.text.startsWith('已复制')) setTimeout(onChanged, 900);
  };
  const red = it.tags?.some((t) => t.startsWith('过期') || t === '钱');
  return (
    <div className={`${styles.card} ${styles.cardGold}`} style={{ borderLeftColor: red ? '#e7a1a1' : undefined }} data-kind={it.kind}>
      {it.tags && it.tags.length > 0 && (
        <p style={{ margin: '0 0 0.3rem', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {it.tags.map((t) => (
            <span key={t} className={`${styles.badge} ${t === '会员' ? styles.badgeGreen : t.startsWith('过期') || t === '钱' ? styles.badgeRed : ''}`}>{t}</span>
          ))}
        </p>
      )}
      <p className={styles.cardTitle} style={{ fontSize: '1.08rem' }}>
        <Link href={it.href} style={{ color: 'inherit', textDecoration: 'none' }}>{it.title} <span style={{ color: 'var(--gold)' }}>›</span></Link>
      </p>
      <p style={{ margin: 0, color: 'var(--ivory-soft, #ddd)' }}>{it.suggestion}</p>
      {it.detail && (
        <details style={{ marginTop: '0.4rem' }}>
          <summary className={styles.small} style={{ cursor: 'pointer' }}>{it.contactResult ? '看草稿' : '看详情'}</summary>
          <p className={styles.small} style={{ whiteSpace: 'pre-wrap', margin: '0.3rem 0 0' }}>{it.detail}</p>
        </details>
      )}
      <ActionButtons actions={it.actions} onDone={done} onContact={() => setAsked(true)} />
      {asked && it.contactResult && <ContactResult endpoint={it.contactResult.endpoint} onDone={(m) => { setAsked(!m.ok); done(m); }} />}
      {msg && <p className={msg.ok ? styles.success : styles.error} style={{ marginBottom: 0 }}>{msg.text}</p>}
    </div>
  );
}

function Today({ ops }: { ops: boolean }) {
  const [d, setD] = useState<TodayPayload | null>(null);
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    const r = await api<TodayPayload>('/api/v1/staff/today');
    if (r.ok) { setD(r.data); setErr(''); } else setErr(r.message);
  }, []);
  useEffect(() => { load(); }, [load]);
  if (err) return <p className={styles.error}>{err}</p>;
  if (!d) return <p className={styles.muted}>正在看今天有什么事…</p>;
  const y = d.yesterday;
  return (
    <>
      {d.mpBind && !d.mpBind.bound && (
        // 1.5.0 体验1（第三部分 2）：还没绑定手机工作台的，顶上提示去绑（出码 → 用自己的微信扫一下就好）
        <div className={styles.notice} role="note" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
          <span>您还没绑定手机工作台。绑好后在小程序「我的 → 工作台」随时能看这一列待办，不用等短信。</span>
          <Link href={d.mpBind.bindHref} className={styles.btn}>去绑定（扫一下就好）</Link>
        </div>
      )}
      {d.live.map((l) => (
        <section key={l.eventId} className={styles.card} style={{ borderColor: 'var(--gold)' }} aria-label="今天现场">
          <p className={styles.cardTitle}>今天现场：{l.title}</p>
          <div className={styles.btnRow}>
            {l.buttons.map((b) => (
              <Link key={b.href} href={b.href} className={styles.btn} style={{ minHeight: 64, fontSize: '1.15rem' }}>{b.label}</Link>
            ))}
          </div>
        </section>
      ))}
      {d.newRegs && (
        // 指令 89-B 验收 P2-1：今天谁报名了，一行看到、点了直接到那场的报名名单
        <p className={styles.card} style={{ margin: '0 0 0.6rem', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <strong>今天新报名 {d.newRegs.reduce((a, x) => a + x.n, 0)} 人</strong>
          {d.newRegs.map((x) => (
            <Link key={x.eventId} href={`/zh/staff/events/${x.eventId}#regs`} style={{ color: 'var(--gold)' }}>{x.title} {x.n} 人 ›</Link>
          ))}
          {!d.newRegs.length && <Link href="/zh/staff/events?want=list" style={{ color: 'var(--gold)' }}>看各场报名名单 ›</Link>}
        </p>
      )}
      <h2 className={styles.h2} style={{ marginTop: '0.6rem' }}>要办的事{d.items.length ? `（${d.items.length}）` : ''}</h2>
      {d.failed.length > 0 && <p className={styles.error}>这几类暂时读不出来：{d.failed.join('、')}。请稍后刷新，或直接去对应页面看。</p>}
      {d.items.length === 0 ? (
        <div className={styles.card} style={{ textAlign: 'center' }}>
          <p className={styles.cardTitle} style={{ margin: 0 }}>今天没有要办的事</p>
        </div>
      ) : (
        d.items.map((it) => <Card key={it.id} it={it} onChanged={load} />)
      )}
      {ops && y && (
        <div className={styles.card} style={{ marginTop: '1.2rem' }}>
          <p className={styles.cardTitle}>昨天的四个结果</p>
          <div className={styles.grid2}>
            <p style={{ margin: 0 }}>分享带来的访问 <strong>{y.visits}</strong></p>
            <p style={{ margin: 0 }}>新人报名并到场 <strong>{y.newArrived}</strong></p>
            <p style={{ margin: 0 }}>缴费入会 <strong>{y.joined}</strong></p>
            <p style={{ margin: 0 }}>有效咨询 <strong>{y.inquiries}</strong></p>
          </div>
        </div>
      )}
    </>
  );
}

/** 首页卡片：按组排，每组一个小标题；只放登录者能进的 */
function Desk({ roles }: { roles: string[] }) {
  return (
    <>
      {NAV_GROUPS.map((g) => {
        const cards: { href: string; title: string; desc: string }[] = [];
        for (const it of NAV_ITEMS) {
          if (it.group !== g || !canSee(roles, it)) continue;
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
    <StaffGate title="今天">
      {(s) => (
        <>
          <p className={styles.lead}>
            {s.name}，您好。{new Intl.DateTimeFormat('zh-CN', { timeZone: 'America/Los_Angeles', month: 'long', day: 'numeric', weekday: 'long' }).format(new Date())}（洛杉矶）。您的权限：{s.roles.map((r) => ROLE_NAME[r] ?? r).join('、')}
          </p>
          {/* 指令 89-B：后台首页也放「常用」一排（下载小程序码、复制小程序路径、渠道码……），和「设置」页同一份、同样的名字 */}
          <QuickActions roles={s.roles} showSwitches={false} />
          <Today ops={can(s, 'ops')} />
          <h2 className={styles.h2} style={{ marginTop: '2rem' }}>全部功能</h2>
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
