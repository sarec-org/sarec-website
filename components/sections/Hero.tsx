import { Button } from '@/components/ui/Button';
import { homePage } from '@/lib/content';

export function Hero() {
  const content = homePage.hero;

  return (
    <section className="relative overflow-hidden bg-deep text-white">
      <div className="absolute inset-0 opacity-30">
        <div className="h-full w-full bg-[linear-gradient(135deg,#0a0a0a_0%,#222_45%,#0a0a0a_100%)]" />
      </div>
      <div className="container-shell relative grid min-h-[540px] content-center py-16 md:min-h-[620px] md:py-20">
        <div className="max-w-[51rem] lg:max-w-[48rem] xl:max-w-[51rem]">
          <p className="font-sans text-sm font-semibold uppercase tracking-[0.2em] text-gold">
            {content.eyebrow}
          </p>
          <h1 className="mt-5 max-w-4xl font-sans text-[2rem] font-bold leading-tight md:mt-6 md:max-w-none md:text-[3.25rem] lg:text-[3.5rem] xl:text-6xl">
            <span className="md:hidden">{content.title}</span>
            <span className="hidden md:block">
              <span className="block whitespace-nowrap">跨境地产最缺的，通常不是机会，</span>
              <span className="mt-1 block whitespace-nowrap">而是判断。</span>
            </span>
          </h1>
          <p className="mt-5 max-w-[35rem] text-base leading-7 text-zinc-300 md:mt-6 md:text-[1.05rem] md:leading-8">
            {content.subtitle}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row md:mt-10 md:gap-4">
            <Button className="md:min-h-11 md:px-4 md:py-2.5" href={content.primaryCTA.href} variant="light">
            {content.primaryCTA.text}
          </Button>
            <Button className="md:min-h-11 md:px-4 md:py-2.5" href={content.secondaryCTA.href} variant="gold">
            {content.secondaryCTA.text}
          </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
