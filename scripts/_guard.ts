/** 防止误连正式库：DATABASE_URL 指向 Neon（正式与预览共用）时，除非显式确认，否则拒绝运行。 */
export function guardNotProduction(): void {
  const url = process.env.DATABASE_URL ?? '';
  if (!url) {
    console.error('请先设置 DATABASE_URL');
    process.exit(1);
  }
  if (/neon\.tech/i.test(url) && !process.argv.includes('--i-know-this-is-not-production')) {
    console.error('DATABASE_URL 看起来是 Neon 线上库（正式站与预览共用）。确认不是正式库后，加参数 --i-know-this-is-not-production 再运行。');
    process.exit(1);
  }
}
