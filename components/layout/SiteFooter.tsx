import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="bg-[var(--ink-deepest)] border-t border-[var(--line-2)] py-20 px-[6vw]">
      <div className="max-w-[1560px] mx-auto grid gap-12 md:grid-cols-4">
        {/* Column 1 — Brand */}
        <div>
          <div
            className="text-[2.4rem] tracking-[0.1em] text-[var(--ivory)]"
            style={{ fontFamily: 'var(--serif-en)' }}
          >
            SAREC
          </div>
          <div
            className="mt-2 text-sm tracking-[0.3em] text-[var(--ivory-dim)]"
            style={{ fontFamily: 'var(--serif-zh)' }}
          >
            中美房地产商会
          </div>
          <p className="mt-6 text-[13px] leading-[1.85] text-[var(--ivory-mute)] max-w-[280px]">
            以商会为入口，以项目判断、结构设计和风险控制为核心，
            连接中国资本、开发项目和专业服务资源。
          </p>
        </div>

        {/* Column 2 — About */}
        <div>
          <h4
            className="text-[11px] uppercase tracking-[0.22em] text-[var(--gold)]"
            style={{ fontFamily: 'var(--mono)' }}
          >
            关于
          </h4>
          <ul className="mt-5 space-y-3 text-[14px] text-[var(--ivory-dim)]">
            <li>
              <Link href="/zh/about" className="hover:text-[var(--gold)] transition-colors">
                SAREC 介绍
              </Link>
            </li>
            <li>
              <Link
                href="/zh/about/founder"
                className="hover:text-[var(--gold)] transition-colors"
              >
                创始人
              </Link>
            </li>
            <li>
              <Link href="/zh/research" className="hover:text-[var(--gold)] transition-colors">
                研究中心
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 3 — Services */}
        <div>
          <h4
            className="text-[11px] uppercase tracking-[0.22em] text-[var(--gold)]"
            style={{ fontFamily: 'var(--mono)' }}
          >
            服务
          </h4>
          <ul className="mt-5 space-y-3 text-[14px] text-[var(--ivory-dim)]">
            <li>
              <Link href="/zh/services" className="hover:text-[var(--gold)] transition-colors">
                服务架构
              </Link>
            </li>
            <li>
              <Link
                href="/zh/case-studies"
                className="hover:text-[var(--gold)] transition-colors"
              >
                项目案例
              </Link>
            </li>
            <li>
              <Link href="/zh/membership" className="hover:text-[var(--gold)] transition-colors">
                会员服务
              </Link>
            </li>
            <li>
              <Link href="/zh/events" className="hover:text-[var(--gold)] transition-colors">
                活动与考察
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 4 — Contact */}
        <div>
          <h4
            className="text-[11px] uppercase tracking-[0.22em] text-[var(--gold)]"
            style={{ fontFamily: 'var(--mono)' }}
          >
            联系
          </h4>
          <ul className="mt-5 space-y-3 text-[14px] text-[var(--ivory-dim)]">
            <li>
              <Link href="/zh/contact" className="hover:text-[var(--gold)] transition-colors">
                预约沟通
              </Link>
            </li>
            <li>
              <Link
                href="/zh/contact#project-evaluation"
                className="hover:text-[var(--gold)] transition-colors"
              >
                项目评估
              </Link>
            </li>
            <li>
              <a
                href="mailto:info@sinoamericanrec.org"
                className="hover:text-[var(--gold)] transition-colors"
              >
                info@sinoamericanrec.org
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Legal disclaimer */}
      <div className="max-w-[1560px] mx-auto mt-20 pt-10 border-t border-[var(--line-2)]">
        <p className="text-[12px] leading-[1.85] text-[var(--ivory-faint)] max-w-[900px]">
          SAREC 是商会型组织 + 顾问服务机构，主叙事聚焦美国房地产项目判断、
          风险控制和资本合作。SAREC 不直接作为施工开发主体，也不设资金池。
          具体服务条款、费用安排、合作结构以单独协议为准。
          本网站内容不构成任何投资建议、要约或法律意见。
          项目相关投资材料仅向通过合格审核的潜在合作方提供。
          涉及证券、移民、税务、法律的具体咨询，由我们的专业服务伙伴网络分工提供。
        </p>
      </div>

      {/* Bottom bar */}
      <div className="max-w-[1560px] mx-auto mt-12 pt-8 border-t border-[var(--line-2)] flex flex-col md:flex-row justify-between gap-4">
        <p
          className="text-[10px] uppercase tracking-[0.22em] text-[var(--ivory-faint)]"
          style={{ fontFamily: 'var(--mono)' }}
        >
          © 2026 SINO-AMERICAN REAL ESTATE CHAMBER · ALL RIGHTS RESERVED
        </p>
        <p
          className="text-[10px] uppercase tracking-[0.22em] text-[var(--ivory-faint)]"
          style={{ fontFamily: 'var(--mono)' }}
        >
          INFO@SINOAMERICANREC.ORG
        </p>
      </div>
    </footer>
  );
}
