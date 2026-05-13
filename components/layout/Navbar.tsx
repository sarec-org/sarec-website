'use client';

import { useState } from 'react';
import { navItems, researchItems, serviceItems } from '@/lib/content';

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#E8DFD2] bg-[rgba(247,243,235,0.88)] text-[#041421] shadow-[0_1px_0_rgba(4,20,33,0.05)] backdrop-blur-xl">
      <div className="container-shell flex min-h-16 items-center justify-between gap-4 lg:min-h-20">
        <a className="font-sans text-lg font-bold tracking-normal text-[#041421] lg:text-xl" href="/zh" onClick={() => setOpen(false)}>
          <span>SAREC</span>
          <span className="ml-2 hidden text-xs font-medium text-[#6E7C88] sm:inline">中美房地产商会</span>
        </a>

        <nav className="hidden items-center gap-4 font-sans text-[13px] text-[#041421] xl:gap-5 xl:text-sm lg:flex">
          <a href="/zh/">首页</a>
          <a href="/zh/about/">关于商会</a>
          <div className="group relative py-7">
            <a href="/zh/services/">服务产品</a>
            <div className="invisible absolute left-0 top-full w-64 translate-y-2 border border-[#E8DFD2] bg-[#F7F3EB] p-3 opacity-0 shadow-v3-card transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
              {serviceItems.map((item) => (
                <a className="block px-3 py-2 text-sm hover:bg-[#F3EFE6]" href={item.href} key={item.href}>
                  {item.title}
                </a>
              ))}
            </div>
          </div>
          <a href="/zh/case-studies/">项目案例</a>
          <div className="group relative py-7">
            <a href="/zh/research/">研究中心</a>
            <div className="invisible absolute left-0 top-full w-72 translate-y-2 border border-[#E8DFD2] bg-[#F7F3EB] p-3 opacity-0 shadow-v3-card transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
              <a className="block px-3 py-2 text-sm hover:bg-[#F3EFE6]" href="/zh/research/">
                研究总览
              </a>
              {researchItems.map((item) => (
                <a className="block px-3 py-2 text-sm hover:bg-[#F3EFE6]" href={item.href} key={item.href}>
                  {item.title}
                </a>
              ))}
            </div>
          </div>
          <a href="/zh/news/">新闻动态</a>
          <a href="/zh/membership/">会员服务</a>
          <a href="/zh/events/">活动与考察</a>
        </nav>

        <div className="hidden lg:block">
          <a
            className="inline-flex min-h-12 w-full items-center justify-center rounded-[2px] border border-[#041421] bg-[#041421] px-5 py-3 text-center font-sans text-sm font-semibold leading-none text-[#F7F3EB] transition-colors duration-150 hover:bg-[#071B2C] sm:w-auto"
            href="/zh/contact#inquiry-form"
          >
            联系我们
          </a>
        </div>

        <button
          aria-expanded={open}
          aria-label="打开导航菜单"
          className="flex h-10 w-10 items-center justify-center rounded-[2px] border border-[#E8DFD2] bg-[#F7F3EB] font-sans text-lg text-[#041421] shadow-soft lg:hidden"
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          {open ? '×' : '☰'}
        </button>
      </div>

      {open ? (
        <div className="absolute inset-x-0 top-full z-40 border-b border-[#E8DFD2] bg-[rgba(247,243,235,0.96)] px-4 py-4 shadow-[0_18px_40px_rgba(4,20,33,0.10)] backdrop-blur-xl lg:hidden">
          <nav className="mx-auto flex max-w-xl flex-col gap-2 font-sans text-base">
            {navItems.map((item) => (
              <a
                className="rounded-[2px] border border-[#E8DFD2] bg-[#F3EFE6] px-4 py-3 font-medium text-[#041421]"
                href={item.href}
                key={item.href}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <a
              className="mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-[2px] border border-[#041421] bg-[#041421] px-5 py-3 text-center font-sans text-sm font-semibold leading-none text-[#F7F3EB] transition-colors duration-150 hover:bg-[#071B2C] sm:w-auto"
              href="/zh/contact#inquiry-form"
              onClick={() => setOpen(false)}
            >
              联系我们
            </a>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
