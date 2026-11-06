/** 洛杉矶当地日期 YYYY-MM-DD（服务器和浏览器都能用；不受运行环境时区影响） */
export function laToday(d: Date = new Date()): string {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? '';
  return `${g('year')}-${g('month')}-${g('day')}`;
}

/** 把“洛杉矶时间 日期 + 时刻”换成 UTC ISO，跟浏览器所在时区无关（自动处理夏令时） */
export function laWallToIso(d: string, t: string): string {
  const wall = Date.parse(`${d}T${t}:00Z`); // 把墙上时间先当 UTC
  const offsetAt = (ms: number) => {
    const p = Object.fromEntries(
      new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
        .formatToParts(new Date(ms)).map((x) => [x.type, x.value])
    );
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - ms; // 洛杉矶相对 UTC 的偏移（负数）
  };
  let utc = wall - offsetAt(wall);
  utc = wall - offsetAt(utc); // 夏令时边界再校一次
  return new Date(utc).toISOString();
}
