'use client';

import { useState } from 'react';
import { navItems, researchItems, serviceItems } from '@/lib/content';

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/95 shadow-[0_1px_0_rgba(0,0,0,0.03)] backdrop-blur">
      <div className="container-shell flex min-h-16 items-center justify-between gap-4 lg:min-h-20">
        <a className="font-sans text-lg font-bold tracking-normal text-ink lg:text-xl" href="/zh" onClick={() => setOpen(false)}>
          <span>SAREC</span>
          <span className="ml-2 hidden text-xs font-medium text-muted sm:inline">中美房地产商会</span>
        </a>

        <nav className="hidden items-center gap-7 font-sans text-sm text-ink lg:flex">
          <div className="group relative py-7">
            <a href="/zh/services/">核心服务</a>
            <div className="invisible absolute left-0 top-full w-64 translate-y-2 border border-line bg-white p-3 opacity-0 shadow-soft transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
              {serviceItems.map((item) => (
                <a className="block px-3 py-2 text-sm hover:bg-zinc-50" href={item.href} key={item.href}>
                  {item.title}
                </a>
              ))}
            </div>
          </div>
          <a href="/zh/projects/">项目与案例</a>
          <div className="group relative py-7">
            <a href="/zh/research/">研究与观点</a>
            <div className="invisible absolute left-0 top-full w-72 translate-y-2 border border-line bg-white p-3 opacity-0 shadow-soft transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
              <a className="block px-3 py-2 text-sm hover:bg-zinc-50" href="/zh/research/">
                研究总览
              </a>
              {researchItems.map((item) => (
                <a className="block px-3 py-2 text-sm hover:bg-zinc-50" href={item.href} key={item.href}>
                  {item.title}
                </a>
              ))}
            </div>
          </div>
          <a href="/zh/about/">关于商会</a>
          <a href="/zh/contact/">联系我们</a>
        </nav>

        <div className="hidden lg:block">
          <a
            className="inline-flex min-h-12 w-full items-center justify-center rounded-[2px] border border-ink bg-ink px-5 py-3 text-center font-sans text-sm font-semibold leading-none text-white transition-colors duration-150 hover:bg-black sm:w-auto"
            href="/zh/contact/"
          >
            预约咨询
          </a>
        </div>

        <button
          aria-expanded={open}
          aria-label="打开导航菜单"
          className="flex h-10 w-10 items-center justify-center rounded-[2px] border border-line bg-white font-sans text-lg text-ink shadow-soft lg:hidden"
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          {open ? '×' : '☰'}
        </button>
      </div>

      {open ? (
        <div className="absolute inset-x-0 top-full z-40 border-b border-line bg-white px-4 py-4 shadow-[0_18px_40px_rgba(0,0,0,0.08)] lg:hidden">
          <nav className="mx-auto flex max-w-xl flex-col gap-2 font-sans text-base">
            {navItems.map((item) => (
              <a
                className="rounded-[2px] border border-line bg-zinc-50 px-4 py-3 font-medium text-ink"
                href={item.href}
                key={item.href}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <a
              className="mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-[2px] border border-ink bg-ink px-5 py-3 text-center font-sans text-sm font-semibold leading-none text-white transition-colors duration-150 hover:bg-black sm:w-auto"
              href="/zh/contact/"
              onClick={() => setOpen(false)}
            >
              预约咨询
            </a>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
