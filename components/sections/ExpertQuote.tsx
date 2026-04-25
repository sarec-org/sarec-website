type ExpertQuoteProps = {
  sarecJudgment: string;
  andyObservation: string;
  investorInsight: string;
};

export function ExpertQuote({ sarecJudgment, andyObservation, investorInsight }: ExpertQuoteProps) {
  const rows = [
    ['SAREC判断', sarecJudgment],
    ['Andy Wang 实战观察', andyObservation],
    ['对投资人的意义', investorInsight]
  ];

  return (
    <section className="rounded-md bg-deep p-6 text-white md:p-8">
      <h2 className="font-sans text-2xl font-semibold">SAREC专家观点</h2>
      <div className="mt-6 grid gap-6">
        {rows.map(([label, text]) => (
          <div className="border-l-2 border-gold pl-4" key={label}>
            <h3 className="font-sans text-sm font-semibold text-gold">{label}</h3>
            <p className="mt-2 text-zinc-300">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
