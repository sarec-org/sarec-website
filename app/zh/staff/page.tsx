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
  '/zh/staff/client-errors': '小程序里出现报错时自动上报，按天汇总；红色是新出现的错误类型（不带个人信息）',
  '/zh/staff/home-slides': '系统自动排；只处理例外：置顶、隐藏、改文案 / 换图、手动加一张（都要截止时间）；预览新人 / 已报名 / 会员分别看到什么',
  '/zh/staff/events': '新建、编辑、关闭报名、下载签到码',
  '/zh/staff/contacts': '档案、时间线、积分、标签、导出',
  '/zh/staff/album': '按活动看照片墙：传照片（传好大家就能看到）、下架、禁止某人上传、通知到场的人',
  '/zh/staff/rooms': '线下预约登记（防撞期）、收款登记、会议室展示信息、电子屏审核',
  // 「换商会微信二维码」已挪进「设置」（东哥已点头），这里不再写
  '/zh/staff/growth': '点击统计、推荐排行、视频号、专委会、内容显示范围',
  // 改动单 D3：原来写“按标签筛选”，实际没有；改成实际能做的
  '/zh/staff/newsletter': '给验证过邮箱的会员和注册用户发通讯：按身份、参加过的活动类型、行业、地区、渠道来源选人，个性化、先发测试给东哥、东哥确认后才群发；看送达、打开、点击、退订',
  '/zh/staff/prep': '每场活动按类型自动生成的筹备清单：负责人、截止时间、打勾、拍摄清单、复盘；模板也在这里改',
  '/zh/staff/recaps': '活动结束后自动整理好的照片精选、回顾、推文初稿，一次审核发布',
  '/zh/staff/flow-stats': '一页看懂：扫码完成签到比例、报名到场率、分享带来的报名、入会转化、重复参加人数、每场人工处理多少项',
  // 东哥已点头：功能排行不再调首页顺序，只看点击数据
  '/zh/staff/features': '每个功能用了多少、带来多少报名到场入会（只看数据；小程序首页入口顺序固定，不在这里调）',
  '/zh/staff/channels': '合作商家 / 机构 / 副会长单位专属码，按渠道看报名到场',
  '/zh/staff/cards': '会员自己填写的电子名片、客户上传的照片：逐条查看，可下架、退回、删除',
  '/zh/staff/display': '会员资料能否在官网展示（不影响会员身份）',
  '/zh/staff/agent': '网站上的商会 AI 助手：月预算、每日用量、常见问题库、最近对话和线索',
  '/zh/staff/team': '工作人员和权限：加人、每人一行「出码」（同事用微信扫一下就绑定好手机工作台）、停用、改角色，立即生效；网站登录邮箱也在这里管；关键操作记录',
  '/zh/staff/settings': '会员价、屏幕费、积分比例、商家优惠、邮件额度、商会微信二维码'
};
/** 不是单独页面、但常用的卡片（挪进「设置」后仍留一张直达卡） */
const EXTRA: { href: string; title: string; desc: string; role: string; group: NavGroup; after: string }[] = [
  { href: '/zh/staff/settings#wechat-qr', title: '换商会微信二维码', desc: '小程序和网站里所有“加商会微信”的码，手机上也能直接换图（在「设置」页）', role: 'admin', group: '设置与团队', after: '/zh/staff/settings' }
];

type Results = { yesterday: { visits: number; newArrived: number; joined: number; inquiries: number }; pending: { todo: number; exceptions: number; cards: number; photos: number; recaps: number } };

type Patrol = { run: { at: string; trigger: string; total: number; failed: number; bad: { name: string; detail: string }[] } | null; email: { on: boolean; to: string } };
/** 东哥 11/12 定的发版关卡：线上只读巡检（部署后 + 每天）。有失败就在后台首页最上面显示红条；管理员可手动巡检、开关巡检邮件（默认关，只发给东哥本人） */
function PatrolBar({ admin }: { admin: boolean }) {
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

/**
 * 1.3 N / 1.4.0（改动单 A5、B2）：在小程序里用手机工作台——给“自己”的手机生成一次性绑定码，用自己的微信扫一下。
 * 放在问候语下面；给同事开通去「团队」页每人一行「出码」。
 */
function MpBind({ admin }: { admin: boolean }) {
  const [b, setB] = useState<{ code: string; qr: string | null; expiresAt: string } | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div className={styles.card}>
      <p className={styles.cardTitle}>在手机上管：小程序工作台</p>
      <p className={styles.small} style={{ marginTop: 0 }}>
        用您自己的微信扫一下下面的码，就能在商会小程序「我的」里打开工作台：拍照传相册、看实时报名签到、现场代签到、待办和筹备清单。收款和会费只在这个网站后台看。
      </p>
      <p className={styles.small}>
        <strong>这个码是给您自己的手机用的；</strong>给同事开通请去{admin ? <Link href="/zh/staff/team" style={{ color: 'var(--gold)' }}>「团队」</Link> : '「团队」（请管理员操作）'}。
      </p>
      {!b && (
        <button
          className={styles.btn}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setErr('');
            const r = await api<{ code: string; qr: string | null; expiresAt: string }>('/api/v1/staff/mp-bind', { body: {} });
            setBusy(false);
            if (r.ok) setB(r.data);
            else setErr(r.message);
          }}
        >
          {busy ? '生成中…' : '生成我的绑定码'}
        </button>
      )}
      {err && <p className={styles.error}>{err}</p>}
      {b && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {b.qr ? <img src={b.qr} alt="我的工作台绑定码" className={styles.qrImg} style={{ width: 200 }} /> : null}
          <p className={b.qr ? styles.small : styles.notice}>
            {b.qr ? '扫不了的：' : '小程序码这会儿生成不了。请'}打开小程序「我的」→「工作人员绑定码」（旧版小程序在「我的 → 设置」里），输入 8 位码：
            <b className={styles.mono} style={{ fontSize: '1.3rem', letterSpacing: 3, marginLeft: 6 }}>{b.code}</b>
          </p>
          <p className={styles.small}>10 分钟内有效，只能用一次。过期了再点一次生成。</p>
          <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => setB(null)}>重新生成</button>
        </>
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
    <StaffGate title="工作人员后台">
      {(s) => (
        <>
          <PatrolBar admin={can(s, 'admin')} />
          <p className={styles.lead}>
            {s.name}，您好。您的权限：{s.roles.map((r) => ROLE_NAME[r] ?? r).join('、')}
          </p>
          <MpBind admin={can(s, 'admin')} />
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
