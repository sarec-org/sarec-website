import { Button } from '@/components/ui/Button';

type SectionCTAProps = {
  title: string;
  subtitle: string;
  primaryCTA: { text: string; href: string };
  secondaryCTA?: { text: string; href: string };
};

export function SectionCTA({ title, subtitle, primaryCTA, secondaryCTA }: SectionCTAProps) {
  return (
    <section className="bg-deep py-12 text-white md:py-24">
      <div className="container-shell grid gap-8 md:grid-cols-[1.5fr_1fr] md:items-end">
        <div>
          <h2 className="font-sans text-2xl font-bold leading-tight md:text-4xl">{title}</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 md:text-base">{subtitle}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
          <Button href={primaryCTA.href} variant="gold">
            {primaryCTA.text}
          </Button>
          {secondaryCTA ? (
            <Button href={secondaryCTA.href} variant="light">
              {secondaryCTA.text}
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
