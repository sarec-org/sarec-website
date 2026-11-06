/** 洛杉矶当地日期 YYYY-MM-DD（服务器和浏览器都能用；不受运行环境时区影响） */
export function laToday(d: Date = new Date()): string {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? '';
  return `${g('year')}-${g('month')}-${g('day')}`;
}
