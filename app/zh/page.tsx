import type { Metadata } from 'next';
import { HeroV3B } from '@/components/hero/HeroV3B';
import { H02CinematicQuote } from '@/components/sections/H02CinematicQuote';
import { H03WhySarec } from '@/components/sections/H03WhySarec';
import { H04ThreeLayers } from '@/components/sections/H04ThreeLayers';
import { H05TrustAnchors } from '@/components/sections/H05TrustAnchors';
import { SiteFooter } from '@/components/layout/SiteFooter';

export const metadata: Metadata = {
  title: 'SAREC · 中美房地产商会 — 跨境地产资本与项目协作平台',
  description:
    'SAREC 围绕项目判断、结构设计、风险控制与资源协同，帮助中国资本、美国项目方和专业服务机构建立更高效的跨境合作路径。',
  alternates: {
    canonical: 'https://sinoamericanrec.org/zh'
  }
};

export default function HomePage() {
  return (
    <main>
      {/* H01 — Hero v3-B Final (with embedded nav) */}
      <HeroV3B />

      {/* H02–H10 — Placeholders for Phase 1 visual implementation.
          Each is a 100vh dark section with a section ID and copy stub.
          Will be replaced by full implementations in subsequent prompts. */}

      <H02CinematicQuote />
      <H03WhySarec />

      <H04ThreeLayers />

      <H05TrustAnchors />

      <section
        id="h06-projects"
        className="min-h-screen bg-[var(--ink-deepest)] flex items-center justify-center border-t border-[var(--line)]"
      >
        <div className="text-center">
          <p
            className="text-xs uppercase tracking-[0.22em] text-[var(--gold-dim)]"
            style={{ fontFamily: 'var(--mono)' }}
          >
            H06 / Project Types + Featured Rosewood
          </p>
          <p className="mt-4 text-[var(--ivory-mute)]">placeholder</p>
        </div>
      </section>

      <section
        id="h07-founder"
        className="min-h-screen bg-[var(--ink-deep)] flex items-center justify-center border-t border-[var(--line)]"
      >
        <div className="text-center">
          <p
            className="text-xs uppercase tracking-[0.22em] text-[var(--gold-dim)]"
            style={{ fontFamily: 'var(--mono)' }}
          >
            H07 / Founder Introduction
          </p>
          <p className="mt-4 text-[var(--ivory-mute)]">placeholder</p>
        </div>
      </section>

      <section
        id="h08-research"
        className="min-h-screen bg-[var(--ink-deepest)] flex items-center justify-center border-t border-[var(--line)]"
      >
        <div className="text-center">
          <p
            className="text-xs uppercase tracking-[0.22em] text-[var(--gold-dim)]"
            style={{ fontFamily: 'var(--mono)' }}
          >
            H08 / Research Preview
          </p>
          <p className="mt-4 text-[var(--ivory-mute)]">placeholder</p>
        </div>
      </section>

      <section
        id="h09-faq"
        className="min-h-screen bg-[var(--ink-deep)] flex items-center justify-center border-t border-[var(--line)]"
      >
        <div className="text-center">
          <p
            className="text-xs uppercase tracking-[0.22em] text-[var(--gold-dim)]"
            style={{ fontFamily: 'var(--mono)' }}
          >
            H09 / FAQ
          </p>
          <p className="mt-4 text-[var(--ivory-mute)]">placeholder</p>
        </div>
      </section>

      <section
        id="h10-cta-banner"
        className="min-h-screen bg-[var(--ink-deepest)] flex items-center justify-center border-t border-[var(--line)]"
      >
        <div className="text-center">
          <p
            className="text-xs uppercase tracking-[0.22em] text-[var(--gold-dim)]"
            style={{ fontFamily: 'var(--mono)' }}
          >
            H10 / CTA Banner
          </p>
          <p className="mt-4 text-[var(--ivory-mute)]">placeholder</p>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
