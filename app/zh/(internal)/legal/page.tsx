import Link from 'next/link';

export const metadata = {
  title: '法律声明 | SAREC',
  description: 'SAREC 法律声明、隐私政策与风险披露。',
  robots: { index: true, follow: true }
};

export default function LegalIndexPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 md:py-24">
      <h1 className="font-sans text-3xl font-bold leading-tight md:text-5xl">
        法律声明
      </h1>
      <p className="mt-4 text-base text-zinc-600 md:text-lg">
        SAREC 公开的法律文件与披露。
      </p>
      <ul className="mt-12 space-y-6">
        <li><Link href="/zh/legal/disclaimer/" className="text-lg underline hover:no-underline">一般免责声明</Link></li>
        <li><Link href="/zh/legal/privacy/" className="text-lg underline hover:no-underline">隐私政策</Link></li>
        <li><Link href="/zh/legal/risk-disclosure/" className="text-lg underline hover:no-underline">风险披露</Link></li>
      </ul>
    </main>
  );
}
