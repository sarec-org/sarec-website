import { stats } from '@/lib/content';

export function TrustStats() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {stats.map((stat) => (
        <div className="rounded-md border border-line bg-white p-5 shadow-soft" key={stat.label}>
          <div className="font-sans text-3xl font-bold text-gold">{stat.value}</div>
          <div className="mt-2 text-sm text-muted">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}
