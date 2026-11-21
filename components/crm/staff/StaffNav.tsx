'use client';
/**
 * 后台顶部导航（总则第 3、7、10 条）。后台综合优化 11/21：顶栏只留 7 个（今天、活动、客户、收款、内容、数据、设置与团队）。
 * - 电脑：7 个栏直接摆在导航条上；右上角「搜页面」；页面上方一行列出这一栏里的全部页面。
 * - 手机（≤760px）：一个「菜单」按钮，点开是搜索框 + 按 7 栏分组的全部页面，一屏看全，不靠横滑；页面上方同样列出这一栏的页面（折行，不横滑）。
 * - 只显示登录者能进的项；没登录 / 不是工作人员时不显示导航。
 * - 当前页高亮（详情页算在它的列表页上）。
 */
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import css from './nav.module.css';
import { NAV_ITEMS, NAV_TABS, activeHref, activeTab, canSee, searchNav, tabHref, type NavItem, type NavTab } from './nav';
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
        placeholder="搜页面"
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
                <span className={css.searchGroup}>{it.sub ? `${it.tab} › ${it.sub}` : it.tab}</span>
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

/** 一栏里的页面：先列栏里的页面，再按小组（例如「找工人 · 接活儿」）列，小组带小标题 */
function TabItems({ list, active, onPick, itemClass }: { list: NavItem[]; active: string | null; onPick: () => void; itemClass: string }) {
  const main = list.filter((it) => !it.sub);
  const subs = Array.from(new Set(list.filter((it) => it.sub).map((it) => it.sub!)));
  const link = (it: NavItem) => (
    <Link key={it.href} href={it.href} className={`${itemClass} ${active === it.href ? css.itemOn : ''}`} aria-current={active === it.href ? 'page' : undefined} onClick={onPick}>
      {it.label}
    </Link>
  );
  return (
    <>
      {main.length > 0 && <div className={css.groupGrid}>{main.map(link)}</div>}
      {subs.map((sub) => (
        <div key={sub} className={css.subGroup}>
          <p className={css.subTitle}>{sub}</p>
          <div className={css.groupGrid}>{list.filter((it) => it.sub === sub).map(link)}</div>
        </div>
      ))}
    </>
  );
}

function GroupList({ items, active, onPick }: { items: NavItem[]; active: string | null; onPick: () => void }) {
  return (
    <>
      {NAV_TABS.map((g) => {
        const list = items.filter((it) => it.tab === g);
        if (!list.length) return null;
        return (
          <div key={g} className={css.group}>
            <p className={css.groupTitle}>{g}</p>
            <TabItems list={list} active={active} onPick={onPick} itemClass={css.item} />
          </div>
        );
      })}
    </>
  );
}

/** 页面上方的同栏小导航：当前这一栏里的其他页面（手机、电脑都显示；小组只在进了小组后展开，否则一个入口） */
function SubBar({ items, active, tab }: { items: NavItem[]; active: string | null; tab: NavTab }) {
  const list = items.filter((it) => it.tab === tab);
  if (list.length < 2) return null;
  const inSub = list.find((it) => it.href === active)?.sub;
  const main = list.filter((it) => !it.sub);
  const subs = Array.from(new Set(list.filter((it) => it.sub).map((it) => it.sub!)));
  return (
    <nav className={css.subBar} aria-label={`「${tab}」里的页面`}>
      {main.map((it) => (
        <Link key={it.href} href={it.href} className={`${css.subTab} ${active === it.href ? css.subTabOn : ''}`} aria-current={active === it.href ? 'page' : undefined}>
          {it.label}
        </Link>
      ))}
      {subs.map((sub) =>
        inSub === sub ? (
          <span key={sub} className={css.subBox}>
            <span className={css.subBoxTitle}>{sub}：</span>
            {list.filter((it) => it.sub === sub).map((it) => (
              <Link key={it.href} href={it.href} className={`${css.subTab} ${active === it.href ? css.subTabOn : ''}`} aria-current={active === it.href ? 'page' : undefined}>
                {it.label}
              </Link>
            ))}
          </span>
        ) : (
          <Link key={sub} href={list.find((it) => it.sub === sub)!.href} className={css.subTab}>
            {sub} ›
          </Link>
        )
      )}
    </nav>
  );
}

export function StaffNav() {
  const { status, me } = useStaffMe();
  const pathname = usePathname() || '';
  const router = useRouter();
  const [menu, setMenu] = useState(false);

  // 换页后收起菜单
  useEffect(() => {
    setMenu(false);
  }, [pathname]);

  const roles = me?.staff.roles ?? [];
  const items = useMemo(() => NAV_ITEMS.filter((it) => canSee(roles, it)), [roles.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps
  const tabs = NAV_TABS.map((t) => ({ tab: t, href: tabHref(t, items) })).filter((x): x is { tab: NavTab; href: string } => !!x.href);
  const active = activeHref(pathname);
  const curTab = activeTab(pathname);
  const logged = status === 'ok' && !!me;
  const go = (href: string) => {
    setMenu(false);
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
          {tabs.map(({ tab, href }) => (
            <Link key={tab} href={href} className={`${css.tab} ${curTab === tab ? css.tabOn : ''}`} aria-current={curTab === tab ? 'page' : undefined}>
              {tab}
            </Link>
          ))}
        </nav>
      )}

      {logged && menu && (
        <div className={`${css.mobilePanel} ${css.mobileOnly}`}>
          <NavSearch items={items} onGo={go} />
          <div className={css.groupGrid} style={{ marginTop: 12 }}>
            <Link href="/" className={css.item} onClick={() => setMenu(false)}>
              返回官网
            </Link>
          </div>
          <GroupList items={items} active={active} onPick={() => setMenu(false)} />
        </div>
      )}
    </header>
    {logged && curTab && (
      <div className={css.subWrap}>
        {/* 手机上：先告诉人现在在哪一栏，点「菜单」看全部 */}
        <p className={`${css.where} ${css.mobileOnly}`}>现在在「{curTab}」{active && NAV_ITEMS.find((it) => it.href === active)?.label !== curTab ? ` › ${NAV_ITEMS.find((it) => it.href === active)?.label}` : ''}</p>
        <SubBar items={items} active={active} tab={curTab} />
      </div>
    )}
    <SaveImageHost />
    </>
  );
}
