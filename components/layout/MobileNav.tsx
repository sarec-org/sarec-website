'use client';

/**
 * MobileNav — 移动端统一导航(首页 Hero + 全部内页共用同一实现)。
 * ------------------------------------------------------------------
 * - 桌面端(>768px)整体 display:none,绝不影响既有桌面导航(HeroV3B / InternalNav)。
 * - variant='overlay':首页 Hero 用,fixed 悬浮于背景视频之上,不占文档流(Hero 内容已下移)。
 * - variant='header' :内页用,fixed + 一个同高占位条(spacer)撑开正文,避免被顶栏遮挡。
 * - 一级横排可横向滑动;完整菜单(抽屉)内为手风琴二级,二级 href 全部对齐 SiteFooter。
 * 不新增第七个一级项;footer「联系」组作为抽屉底部辅助区,不参与一级结构与高亮。
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ViewportLockScript } from '@/components/sections/research/ViewportLockScript';
import styles from './MobileNav.module.css';

type SubLink = { label: string; href: string };
type NavItem = { label: string; href: string; children?: SubLink[] };

// 六项一级导航(与 HeroV3B / InternalNav 完全一致,顺序不变)。
// CMS V2 PR-2 最终导航:项目→会员项目、活动→新闻与活动、会员入会→会员风采;
// 「加入商会」从一级项改为右上角固定行动按钮(与桌面端一致)。
// 二级仅取能明确归属该一级的既有链接;无争议子链接的一级项保持纯一级,不显示展开箭头。
const NAV: NavItem[] = [
  {
    label: '关于',
    href: '/zh/about',
    children: [
      { label: 'SAREC 介绍', href: '/zh/about' },
      { label: '创始人', href: '/zh/about/founder' },
      { label: '研究中心', href: '/zh/research' }
    ]
  },
  {
    label: '服务',
    href: '/zh/services',
    children: [
      { label: '服务入口', href: '/zh/services' },
      { label: '项目案例', href: '/zh/case-studies' },
      { label: '会员服务', href: '/zh/membership' },
      { label: '战略合作伙伴', href: '/zh/strategic-partners' }
    ]
  },
  { label: '会员项目', href: '/zh/projects' },
  { label: '研究', href: '/zh/research' },
  {
    label: '新闻与活动',
    href: '/zh/events',
    children: [
      { label: '新闻与活动', href: '/zh/events' },
      { label: '新闻', href: '/zh/news' }
    ]
  },
  {
    label: '会员风采',
    href: '/zh/members',
    children: [
      { label: '会员风采', href: '/zh/members' },
      { label: '会员权益', href: '/zh/membership' }
    ]
  }
];

// footer「联系」组 —— 抽屉底部辅助链接区,不参与一级结构、不参与高亮。
const AUX: SubLink[] = [
  { label: '预约沟通', href: '/zh/contact' },
  { label: '项目评估', href: '/zh/contact#project-evaluation' },
  { label: '联系方式', href: '/zh/contact' }
];

export function MobileNav({ variant = 'overlay' }: { variant?: 'overlay' | 'header' }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const pathname = usePathname();

  const isActive = (href: string) =>
    typeof pathname === 'string' && (pathname === href || pathname.startsWith(`${href}/`));
  const isExact = (href: string) => pathname === href;

  const close = () => setOpen(false);

  // 路由变化时关闭抽屉。
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // 抽屉打开时锁定 body 滚动 + Esc 关闭。
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      {/* 抽屉高度依赖 --locked-vh。该变量此前只在部分内容页的 <main> 里挂载,
          /zh/about 等页面未定义 → 抽屉回落 1svh(微信 iOS 内即失效状态)。
          挂在本组件上,抽屉出现在哪一页都保证变量已就绪;重复挂载是幂等的。 */}
      <ViewportLockScript />

      <div className={`${styles.bar} ${variant === 'header' ? styles.barHeader : ''}`}>
        {/* 第一行:Logo / 菜单 / 联系我们 */}
        <div className={styles.topRow}>
          <Link href="/zh" className={styles.brand} onClick={close}>
            <span className={styles.brandMark}>SAREC</span>
            <span className={styles.brandSub}>中美房地产商会</span>
          </Link>

          <div className={styles.topRight}>
            <button
              type="button"
              className={styles.menuBtn}
              onClick={() => setOpen(true)}
              aria-label="打开菜单"
              aria-haspopup="true"
              aria-expanded={open}
              aria-controls="mobile-nav-drawer"
            >
              <span className={styles.menuIcon} aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              菜单
            </button>
            <Link href="/zh/join" className={styles.contact} onClick={close}>
              加入商会
            </Link>
          </div>
        </div>

        {/* 第二行:一级导航横排(可横向滑动,右侧渐隐提示可继续滑) */}
        <div className={styles.scrollRow}>
          <ul className={styles.scrollList}>
            {NAV.map((item) => (
              <li key={`bar-${item.label}`}>
                <Link
                  href={item.href}
                  className={`${styles.scrollLink} ${isActive(item.href) ? styles.scrollLinkActive : ''}`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <span className={styles.scrollFade} aria-hidden="true" />
        </div>
      </div>

      {/* 内页需要占位条撑开正文(首页 overlay 悬浮于 Hero 之上,不占流) */}
      {variant === 'header' ? <div className={styles.spacer} aria-hidden="true" /> : null}

      {/* 抽屉遮罩 */}
      <div
        className={`${styles.backdrop} ${open ? styles.backdropOpen : ''}`}
        onClick={close}
        aria-hidden="true"
      />

      {/* 完整菜单抽屉 */}
      <aside
        id="mobile-nav-drawer"
        className={`${styles.drawer} ${open ? styles.drawerOpen : ''}`}
        aria-hidden={!open}
        aria-label="完整菜单"
      >
        <div className={styles.drawerHead}>
          <span className={styles.drawerTitle}>菜单</span>
          <button type="button" className={styles.closeBtn} onClick={close} aria-label="关闭菜单">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>

        <nav className={styles.drawerNav} aria-label="完整导航">
          <ul className={styles.drawerList}>
            {NAV.map((item) => {
              const hasChildren = !!item.children?.length;
              const isOpen = expanded === item.label;
              const panelId = `mobile-sub-${item.href.replace(/[^a-z0-9]+/gi, '-')}`;
              return (
                <li key={`drawer-${item.label}`} className={styles.drawerItem}>
                  <div className={styles.drawerRow}>
                    <Link
                      href={item.href}
                      onClick={close}
                      className={`${styles.drawerLink} ${isActive(item.href) ? styles.drawerLinkActive : ''}`}
                    >
                      {item.label}
                    </Link>
                    {hasChildren ? (
                      <button
                        type="button"
                        className={`${styles.expandBtn} ${isOpen ? styles.expandBtnOpen : ''}`}
                        onClick={() => setExpanded(isOpen ? null : item.label)}
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        aria-label={isOpen ? `收起${item.label}子菜单` : `展开${item.label}子菜单`}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" />
                        </svg>
                      </button>
                    ) : null}
                  </div>
                  {hasChildren ? (
                    <ul
                      id={panelId}
                      className={`${styles.subList} ${isOpen ? styles.subListOpen : ''}`}
                    >
                      {item.children!.map((c) => (
                        <li key={c.href + c.label}>
                          <Link
                            href={c.href}
                            onClick={close}
                            className={`${styles.subLink} ${isExact(c.href) ? styles.subLinkActive : ''}`}
                          >
                            {c.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>

          {/* 辅助:联系(不参与一级结构 / 不高亮) */}
          <div className={styles.auxBlock}>
            <span className={styles.auxLabel}>联系</span>
            <ul className={styles.auxList}>
              {AUX.map((a) => (
                <li key={a.href + a.label}>
                  <Link href={a.href} onClick={close} className={styles.auxLink}>
                    {a.label}
                  </Link>
                </li>
              ))}
              <li>
                <a href="mailto:info@sinoamericanrec.org" className={styles.auxLink} onClick={close}>
                  info@sinoamericanrec.org
                </a>
              </li>
            </ul>
          </div>
        </nav>
      </aside>
    </>
  );
}
