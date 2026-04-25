import type { HTMLAttributes } from 'react';

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-md border border-line bg-white p-5 shadow-soft transition duration-150 hover:-translate-y-0.5 hover:border-zinc-400 md:p-8 ${className}`}
      {...props}
    />
  );
}
