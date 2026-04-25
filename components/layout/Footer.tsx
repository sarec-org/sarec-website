import { footerContent, site } from '@/lib/content';

export function Footer() {
  return (
    <footer className="bg-deep py-10 text-zinc-300 md:py-14">
      <div className="container-shell grid gap-8 md:grid-cols-[1.1fr_2fr] md:gap-10">
        <div className="border-b border-white/10 pb-6 md:border-b-0 md:pb-0">
          <div className="font-sans text-2xl font-bold text-white">SAREC</div>
          <p className="mt-3 max-w-sm text-sm text-zinc-400">{site.positioning}</p>
          <p className="mt-4 max-w-md text-sm leading-7 text-zinc-400">{site.positioningDetail}</p>
        </div>
        <div className="grid gap-8 font-sans text-sm sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_1.1fr]">
          {footerContent.groups.map((group) => (
            <div key={group.title}>
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-white">{group.title}</h2>
              <div className="mt-4 grid gap-2.5">
                {group.links.map((item) => (
                  <a className="block border-b border-white/10 py-1.5 text-zinc-300 hover:text-white sm:border-b-0" href={item.href} key={item.href}>
                    {item.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-white">联系</h2>
            <div className="mt-4 grid gap-2.5 text-zinc-300">
              <p>电话：{site.phone}</p>
              <p>邮箱：{site.email}</p>
              <p>地区：{site.location}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="container-shell mt-8 border-t border-white/10 pt-5 text-xs leading-6 text-zinc-500">
        {footerContent.disclaimer}
      </div>
    </footer>
  );
}
