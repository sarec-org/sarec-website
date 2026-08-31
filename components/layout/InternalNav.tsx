'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './InternalNav.module.css';
import { MobileNav } from './MobileNav';

// CMS V2 PR-2 最终导航:一级项直接表达用户意图,右侧独立行动按钮 [加入商会]。
// 与 HeroV3B / MobileNav 三处保持完全一致,顺序不变。
const MENU = [
  { label: '关于', href: '/zh/about' },
  { label: '服务', href: '/zh/services' },
  { label: '会员项目', href: '/zh/projects' },
  { label: '研究', href: '/zh/research' },
  { label: '新闻与活动', href: '/zh/events' },
  { label: '会员风采', href: '/zh/members' }
] as const;

export function InternalNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) =>
    typeof pathname === 'string' &&
    (pathname === href || pathname.startsWith(`${href}/`));

  const close = () => setMenuOpen(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <>
      {/* 移动端统一导航(桌面端 display:none;下方 header 在移动端隐藏) */}
      <MobileNav variant="header" />

      <header className={styles.header}>
        {/* Util bar */}
        <div className={styles.utilBar}>
          <div className={styles.utilBarLeft}>
            <span>
              <span className={styles.liveDot} aria-hidden="true" />
              Los Angeles
            </span>
            <span>Sino-American Real Estate Chamber</span>
          </div>
          <div className={styles.utilBarRight} />
        </div>

        {/* Main nav */}
        <nav className={styles.nav} aria-label="主导航">
          <Link href="/zh" className={styles.brand} onClick={close}>
            <span className={styles.brandMark}>SAREC</span>
            <span className={styles.brandSub}>中美房地产商会</span>
          </Link>

          <ul className={styles.navMenu}>
            {MENU.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={isActive(item.href) ? styles.navItemActive : ''}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className={styles.navRight}>
            <button
              type="button"
              className={`${styles.hamburger} ${
                menuOpen ? styles.hamburgerOpen : ''
              }`}
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? '关闭菜单' : '打开菜单'}
              aria-expanded={menuOpen}
              aria-controls="internal-nav-mobile-panel"
            >
              <span />
              <span />
              <span />
            </button>
            <Link href="/zh/join" className={styles.cta} onClick={close}>
              加入商会
            </Link>
          </div>
        </nav>
      </header>

      {/* Mobile overlay backdrop */}
      <div
        className={`${styles.mobileOverlay} ${
          menuOpen ? styles.mobileOverlayOpen : ''
        }`}
        onClick={close}
        aria-hidden="true"
      />

      {/* Mobile slide-in panel */}
      <aside
        id="internal-nav-mobile-panel"
        className={`${styles.mobilePanel} ${
          menuOpen ? styles.mobilePanelOpen : ''
        }`}
        aria-hidden={!menuOpen}
        aria-label="移动菜单"
      >
        <ul className={styles.mobileMenu}>
          {MENU.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={close}
                className={isActive(item.href) ? styles.navItemActive : ''}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </aside>
    </>
  );
}
