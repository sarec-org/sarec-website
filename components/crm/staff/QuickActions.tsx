'use client';
/**
 * 指令 89-B.1 / B.3：后台「常用」一排 + 「开关在哪」一排（东哥找小程序码找不到，停在「设置」页一墙说明文字）。
 * - 「下载小程序码」：小程序首页码（pages/home/home），一点就下载 PNG（/api/v1/staff/mp-code，服务器出码后存 Blob，不重复调微信）。
 * - 「复制小程序路径（给技术 / 公众号配菜单用）」：复制小程序 AppID + 首页路径（公众号文章、菜单、视频号挂小程序时填这两项）。
 *   原名「复制小程序链接」名不副实（验收 P2-3）已改名；真短链接要调新的微信接口，东哥点头前不做。
 * - 其余是最常用页面的直达；名字和导航（nav.ts）一致（总则第 1 条）。只显示登录者能进的。
 * 「设置」页和后台首页「今天」都用这一份。
 */
import Link from 'next/link';
import { useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { canSee } from './nav';

type M = { ok: boolean; text: string } | null;

/** 一排按钮按字的长短排开，一行能放几个放几个（不撑成等宽格子，字不折行） */
const ROW = { display: 'flex', flexWrap: 'wrap', gap: 8 } as const;
const PILL = { flex: '0 1 auto', minHeight: 44, padding: '0.5rem 1rem', whiteSpace: 'nowrap' } as const;

/** 常用直达（名字 = 导航上的名字） */
const LINKS: { href: string; label: string; role: string }[] = [
  { href: '/zh/staff/channels', label: '渠道码', role: 'ops' },
  { href: '/zh/staff/poster-templates', label: '海报模板', role: 'ops' },
  { href: '/zh/staff/festivals', label: '节日日期表', role: 'ops' },
  { href: '/zh/staff/team', label: '团队', role: 'admin' }
];

/** 开关在哪：每个开关一个按钮，直接打开它所在的那一块（名字 = 开关本身的名字） */
export const SWITCHES: { href: string; label: string; role: string }[] = [
  { href: '/zh/staff/poster-templates#upload-own', label: '传自己的海报', role: 'ops' },
  { href: '/zh/staff/poster-templates#ai-badge', label: '「AI 生成」标识', role: 'ops' },
  { href: '/zh/staff/organizers', label: '主办方活动工具总开关', role: 'ops' },
  { href: '/zh/staff/clubs', label: '俱乐部开 / 关（麻将、掼蛋）', role: 'ops' },
  { href: '/zh/staff/jobs/switches', label: '找工人接活儿开关', role: 'ops' },
  { href: '/zh/staff/notify', label: '手机通知总闸', role: 'ops|checkin|finance' },
  { href: '/zh/staff/settings#zelle', label: 'Zelle 付款', role: 'admin' }
  // 「活动确认时间线」不放这一排：它关着时已经在下面「N 项功能关着」里（同一页不出现两次，总则第 11 条）；在「活动」一组里改
];

async function downloadCode(setMsg: (m: M) => void, setBusy: (b: boolean) => void) {
  setBusy(true);
  setMsg({ ok: true, text: '正在生成小程序码…' });
  try {
    const res = await fetch('/api/v1/staff/mp-code', { credentials: 'same-origin' });
    if (!res.ok) {
      let t = '下载失败，请稍后再试';
      try { const j = (await res.json()) as { message?: string; error?: { message?: string } }; t = j.error?.message || j.message || t; } catch { /* 不是 JSON */ }
      setMsg({ ok: false, text: t });
      return;
    }
    const name = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') || '')?.[1] || 'sarec-miniprogram.png';
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    setMsg(
      name.includes('TEST')
        ? { ok: true, text: `已下载 ${name}。注意：这台服务器没配小程序密钥，下的是测试码（扫出来是一行字，不是小程序），正式站下的才是真小程序码。` }
        : { ok: true, text: `已下载 ${name}：小程序首页码，微信扫一下进商会小程序首页。可以直接印到海报、易拉宝上。` }
    );
  } catch {
    setMsg({ ok: false, text: '网络不通，下载失败，请稍后再试' });
  } finally {
    setBusy(false);
  }
}

async function copyLink(setMsg: (m: M) => void) {
  const res = await fetch('/api/v1/staff/mp-code?info=1', { credentials: 'same-origin' }).catch(() => null);
  const d = res && res.ok ? ((await res.json()) as { appid: string; path: string; name: string }) : null;
  if (!d) return setMsg({ ok: false, text: '读不到小程序信息，请刷新后再试' });
  const text = `${d.name} 小程序\nAppID：${d.appid}\n首页路径：${d.path}`;
  try {
    await navigator.clipboard.writeText(text);
    setMsg({ ok: true, text: `已复制小程序 AppID（${d.appid}）和首页路径（${d.path}）——这不是能点开的链接，是公众号菜单、公众号文章插小程序时要填的两项。要发给朋友，请用「下载小程序码」发图片。` });
  } catch {
    setMsg({ ok: true, text: `浏览器不让自动复制，请手动复制：AppID ${d.appid}，首页路径 ${d.path}` });
  }
}

export function QuickActions({ roles, title = '常用', showSwitches = true }: { roles: string[]; title?: string; showSwitches?: boolean }) {
  const [msg, setMsg] = useState<M>(null);
  const [busy, setBusy] = useState(false);
  const links = LINKS.filter((l) => canSee(roles, l));
  const sw = SWITCHES.filter((l) => canSee(roles, l));
  return (
    <section id="common" aria-label={title} style={{ marginBottom: '0.8rem', scrollMarginTop: 140 }}>
      <h2 className={styles.h2} style={{ marginTop: 0 }}>{title}</h2>
      <div style={ROW}>
        <button type="button" className={styles.btn} style={PILL} disabled={busy} onClick={() => downloadCode(setMsg, setBusy)}>
          {busy ? '正在生成…' : '下载小程序码'}
        </button>
        {/* 指令 89-B 验收 P2-3：原来叫「复制小程序链接」，复制出来的却不是能点开的链接（名不副实）。改名说清是什么、给谁用；
            真短链接要调新的微信接口，东哥点头前不做。没拿掉：公众号菜单 / 文章插小程序确实要填这两项，拿掉了技术同事又得问开发 */}
        <button type="button" className={`${styles.btn} ${styles.btnQuiet}`} style={PILL} onClick={() => copyLink(setMsg)}>
          复制小程序路径（给技术 / 公众号配菜单用）
        </button>
        {links.map((l) => (
          <Link key={l.href} href={l.href} className={`${styles.btn} ${styles.btnGhost}`} style={PILL}>
            {l.label} ›
          </Link>
        ))}
      </div>
      {msg && <p className={msg.ok ? styles.success : styles.error} role="status" style={{ marginBottom: 0 }}>{msg.text}</p>}
      {showSwitches && sw.length > 0 && (
        <>
          <h2 className={styles.h2} id="switches" style={{ marginTop: '1rem', scrollMarginTop: 140 }}>开关</h2>
          <div style={ROW}>
            {sw.map((l) =>
              l.href.startsWith('/zh/staff/settings#') ? (
                <a key={l.href} href={l.href.replace('/zh/staff/settings', '')} className={`${styles.btn} ${styles.btnQuiet}`} style={PILL}>{l.label} ›</a>
              ) : (
                <Link key={l.href} href={l.href} className={`${styles.btn} ${styles.btnQuiet}`} style={PILL}>{l.label} ›</Link>
              )
            )}
          </div>
        </>
      )}
    </section>
  );
}
