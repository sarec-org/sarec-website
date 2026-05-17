export default function NotFound() {
  return (
    <main className="py-16 md:py-24">
      <div className="container-shell max-w-4xl">
        <p className="font-sans text-sm font-semibold text-gold">404</p>
        <h1 className="mt-4 font-sans text-4xl font-bold md:text-5xl">页面未找到</h1>
        <p className="mt-6 max-w-2xl text-lg text-muted">
          你访问的页面可能已移动或不存在。你可以返回首页，或查看 SAREC 的服务、项目与合作方案。
        </p>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <a className="rounded-[2px] border border-line bg-white px-4 py-3 font-sans font-semibold text-ink transition hover:border-zinc-400" href="/zh">
            返回首页
          </a>
          <a className="rounded-[2px] border border-line bg-white px-4 py-3 font-sans font-semibold text-ink transition hover:border-zinc-400" href="/zh/services">
            查看服务
          </a>
          <a className="rounded-[2px] border border-line bg-white px-4 py-3 font-sans font-semibold text-ink transition hover:border-zinc-400" href="/zh/case-studies">
            查看项目案例
          </a>
          <a className="rounded-[2px] border border-line bg-white px-4 py-3 font-sans font-semibold text-ink transition hover:border-zinc-400" href="/zh/contact">
            联系 SAREC
          </a>
        </div>
      </div>
    </main>
  );
}
