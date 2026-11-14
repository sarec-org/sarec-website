'use client';
/**
 * 1.4.0 后台顶部导航（总则第 3、7、10 条；改动单 A1–A3、A6）。
 * - 电脑：常用项直接摆在导航条上，其余收进「更多」下拉（按分组列全）；右上角搜索框。
 * - 手机（≤760px）：只有一个「菜单」按钮，点开是搜索框 + 按分组的全部页面，一屏看全，不靠横滑。
 * - 只显示登录者能进的项；没登录 / 不是工作人员时不显示导航。
 * - 当前页高亮（详情页算在它的列表页上）。
 */
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import css from './nav.module.css';
import { NAV_GROUPS, NAV_ITEMS, PRIMARY_ORDER, activeHref, canSee, searchNav, type NavItem } from './nav';
import { useStaffMe } from './useStaffMe';
import { SaveImageHost } from './SaveImage';

function NavSearch({ items, onGo, autoFocus }: { items: NavItem[]; onGo: (href: string) => void; autoFocus?: boolean }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const res = useMemo(() => searchNav(q, items), [q, items]);
  const go = (href: string) => {
    setQ('');
    setOpen(false);
    onGo(href);
  };
  return (
    <div className={css.search}>
      <input
        className={css.searchInput}
        type="search"
        enterKeyHint="go"
        placeholder="搜页面：团队、相册、签到…"
        aria-label="搜索后台页面"
        value={q}
        autoFocus={autoFocus}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && res[0]) go(res[0].href);
          if (e.key === 'Escape') setOpen(false);
        }}
      />
      {open && q.trim() && (
        <div className={css.searchList} role="listbox">
          {res.length ? (
            res.slice(0, 8).map((it) => (
              <button key={it.href} type="button" className={css.searchItem} onMouseDown={(e) => e.preventDefault()} onClick={() => go(it.href)}>
                <span>{it.label}</span>
                {it.group && <span className={css.searchGroup}>{it.group}</span>}
              </button>
            ))
          ) : (
            <p className={css.searchEmpty}>没找到「{q.trim()}」。试试：团队、相册、群发、签到、绑定、二维码、轮播、报错</p>
          )}
        </div>
      )}
    </div>
  );
}

function GroupList({ items, active, onPick }: { items: NavItem[]; active: string | null; onPick: () => void }) {
  return (
    <>
      {NAV_GROUPS.map((g) => {
        const list = items.filter((it) => it.group === g);
        if (!list.length) return null;
        return (
          <div key={g} className={css.group}>
            <p className={css.groupTitle}>{g}</p>
            <div className={css.groupGrid}>
              {list.map((it) => (
                <Link key={it.href} href={it.href} className={`${css.item} ${active === it.href ? css.itemOn : ''}`} aria-current={active === it.href ? 'page' : undefined} onClick={onPick}>
                  {it.label}
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

export function StaffNav() {
  const { status, me } = useStaffMe();
  const pathname = usePathname() || '';
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [more, setMore] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // 换页后收起菜单
  useEffect(() => {
    setMenu(false);
    setMore(false);
  }, [pathname]);
  // 点「更多」外面收起
  useEffect(() => {
    if (!more) return;
    const off = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMore(false);
    };
    document.addEventListener('mousedown', off);
    return () => document.removeEventListener('mousedown', off);
  }, [more]);

  const roles = me?.staff.roles ?? [];
  const items = useMemo(() => NAV_ITEMS.filter((it) => canSee(roles, it)), [roles.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps
  const primary = PRIMARY_ORDER.map((h) => items.find((it) => it.href === h)).filter(Boolean) as NavItem[];
  const rest = items.filter((it) => !PRIMARY_ORDER.includes(it.href));
  const active = activeHref(pathname);
  const restActive = rest.some((it) => it.href === active);
  const logged = status === 'ok' && !!me;
  const go = (href: string) => {
    setMenu(false);
    setMore(false);
    router.push(href);
  };

  return (
    <>
    <header className={css.header}>
      <div className={css.top}>
        <Link href="/zh/staff" className={css.brand} onClick={() => setMenu(false)}>
          SAREC 工作人员后台
        </Link>
        <div className={css.topRight}>
          {logged && (
            <div className={css.desktopOnly}>
              <NavSearch items={items} onGo={go} />
            </div>
          )}
          <Link href="/" className={`${css.home} ${logged ? css.desktopOnly : ''}`}>
            返回官网
          </Link>
          {logged && (
            <button type="button" className={`${css.menuBtn} ${css.mobileOnly}`} aria-expanded={menu} onClick={() => setMenu((x) => !x)}>
              {menu ? '收起' : '菜单'}
            </button>
          )}
        </div>
      </div>

      {logged && (
        <nav className={`${css.bar} ${css.desktopOnly}`} aria-label="后台导航">
          {primary.map((it) => (
            <Link key={it.href} href={it.href} className={`${css.tab} ${active === it.href ? css.tabOn : ''}`} aria-current={active === it.href ? 'page' : undefined}>
              {it.label}
            </Link>
          ))}
          {rest.length > 0 && (
            <div className={css.moreWrap} ref={moreRef}>
              <button type="button" className={`${css.tab} ${restActive || more ? css.tabOn : ''}`} aria-expanded={more} onClick={() => setMore((x) => !x)}>
                {restActive ? `更多 · ${rest.find((it) => it.href === active)?.label}` : '更多'} {more ? '▴' : '▾'}
              </button>
              {more && (
                <div className={css.morePanel}>
                  <GroupList items={rest} active={active} onPick={() => setMore(false)} />
                </div>
              )}
            </div>
          )}
        </nav>
      )}

      {logged && menu && (
        <div className={`${css.mobilePanel} ${css.mobileOnly}`}>
          <NavSearch items={items} onGo={go} />
          {items.find((it) => it.href === '/zh/staff') && (
            <div className={css.groupGrid} style={{ marginTop: 12 }}>
              <Link href="/zh/staff" className={`${css.item} ${active === '/zh/staff' ? css.itemOn : ''}`} onClick={() => setMenu(false)}>
                首页
              </Link>
              <Link href="/" className={css.item} onClick={() => setMenu(false)}>
                返回官网
              </Link>
            </div>
          )}
          <GroupList items={items} active={active} onPick={() => setMenu(false)} />
        </div>
      )}
    </header>
    <SaveImageHost />
    </>
  );
}
