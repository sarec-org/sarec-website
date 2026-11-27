#!/usr/bin/env node
/**
 * 一次性脚本：算出 festival_dates 的日期（2025–2035），打印成 SQL，贴进 db/migrations/0054_greetings.sql。
 *   node db/sql/festival_dates_gen.mjs          → 打印 SQL
 *   node db/sql/festival_dates_gen.mjs --check  → 打印核对表（已知日期 + ICU 农历交叉核对）
 * - 农历节日（春节、元宵、端午、七夕、中秋、重阳）：常见的 lunarInfo 表算法（每年一个 16 进制数：
 *   低 4 位 = 闰几月；0x10000 位 = 闰月是不是大月；第 i 月大小 = info & (0x10000 >> i)）。
 *   起点用 2020 年正月初一 = 2020-01-25，表只取 2020–2036 这几年。
 * - 冬至：节气通式 [Y×0.2422 + 21.94] − [Y/4]（21 世纪，Y = 年份后两位），2025–2035 无例外年。
 * - 美国按星期算的：母亲节 5 月第 2 个周日、阵亡将士纪念日 5 月最后一个周一、父亲节 6 月第 3 个周日、
 *   劳动节 9 月第 1 个周一、感恩节 11 月第 4 个周四；复活节用格里历复活节算法（Anonymous Gregorian）。
 */
const Y0 = 2025;
const Y1 = 2035;

// lunarInfo（2020–2032），与通行的 1900–2100 表同一段
const LUNAR = {
  2020: 0x07954, 2021: 0x06aa0, 2022: 0x0ad50, 2023: 0x05b52, 2024: 0x04b60, 2025: 0x0a6e6, 2026: 0x0a4e0,
  2027: 0x0d260, 2028: 0x0ea65, 2029: 0x0d530, 2030: 0x05aa0, 2031: 0x076a3, 2032: 0x096d0, 2033: 0x04afb,
  2034: 0x04ad0, 2035: 0x0a4d0, 2036: 0x1d0b6
};
const leapMonth = (y) => LUNAR[y] & 0xf;
const leapDays = (y) => (leapMonth(y) ? (LUNAR[y] & 0x10000 ? 30 : 29) : 0);
const monthDays = (y, m) => (LUNAR[y] & (0x10000 >> m) ? 30 : 29);
const yearDays = (y) => { let s = leapDays(y); for (let m = 1; m <= 12; m++) s += monthDays(y, m); return s; };

const DAY = 86400000;
const utc = (y, m, d) => Date.UTC(y, m - 1, d);
const fmt = (t) => new Date(t).toISOString().slice(0, 10);
const ANCHOR = utc(2020, 1, 25); // 2020 年正月初一

/** 农历 y 年 m 月 d 日（非闰月）→ 公历 */
function lunar(y, m, d) {
  let t = ANCHOR;
  for (let yy = 2020; yy < y; yy++) t += yearDays(yy) * DAY;
  for (let mm = 1; mm < m; mm++) {
    t += monthDays(y, mm) * DAY;
    if (leapMonth(y) === mm) t += leapDays(y) * DAY;
  }
  return fmt(t + (d - 1) * DAY);
}
/** 某月第 n 个星期 w（0=周日）；n = -1 表示最后一个 */
function nthWeekday(y, m, w, n) {
  if (n > 0) {
    const first = new Date(utc(y, m, 1)).getUTCDay();
    return fmt(utc(y, m, 1 + ((w - first + 7) % 7) + (n - 1) * 7));
  }
  const lastDay = new Date(utc(y, m + 1, 0)).getUTCDate();
  const last = new Date(utc(y, m, lastDay)).getUTCDay();
  return fmt(utc(y, m, lastDay - ((last - w + 7) % 7)));
}
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return fmt(utc(y, month, day));
}
function winterSolstice(y) {
  const Y = y % 100;
  return fmt(utc(y, 12, Math.floor(Y * 0.2422 + 21.94) - Math.floor(Y / 4)));
}
const fixed = (m, d) => (y) => fmt(utc(y, m, d));

// key, 名字, 类别, 提前几天, 节后再显示几天, 办活动分类, 祝福分类, 怎么算
export const FESTIVALS = [
  ['new_year', '元旦', 'intl', 2, 0, 'new_year', 'greet_newyear', fixed(1, 1)],
  ['spring_festival', '春节', 'cn', 2, 6, 'spring_festival', 'greet_springfest', (y) => lunar(y, 1, 1)],
  ['lantern_festival', '元宵节', 'cn', 2, 0, 'lantern_festival', 'greet_lantern', (y) => lunar(y, 1, 15)],
  ['valentines', '情人节', 'intl', 2, 0, 'valentines', null, fixed(2, 14)],
  ['womens_day', '三八妇女节', 'intl', 2, 0, 'womens_day', null, fixed(3, 8)],
  ['st_patricks', '圣帕特里克节', 'us', 2, 0, 'st_patricks', null, fixed(3, 17)],
  ['easter', '复活节', 'us', 2, 0, 'easter', null, easter],
  ['mothers_day', '母亲节', 'us', 2, 0, 'mothers_day', null, (y) => nthWeekday(y, 5, 0, 2)],
  ['memorial_day', '阵亡将士纪念日', 'us', 2, 0, 'memorial_day', null, (y) => nthWeekday(y, 5, 1, -1)],
  ['childrens_day', '儿童节', 'intl', 2, 0, 'childrens_day', null, fixed(6, 1)],
  ['dragon_boat', '端午节', 'cn', 2, 0, 'dragon_boat', null, (y) => lunar(y, 5, 5)],
  ['fathers_day', '父亲节', 'us', 2, 0, 'fathers_day', null, (y) => nthWeekday(y, 6, 0, 3)],
  ['july4', '美国独立日', 'us', 2, 0, 'july4', null, fixed(7, 4)],
  ['qixi', '七夕', 'cn', 2, 0, 'qixi', null, (y) => lunar(y, 7, 7)],
  ['labor_day', '美国劳动节', 'us', 2, 0, 'labor_day', null, (y) => nthWeekday(y, 9, 1, 1)],
  ['mid_autumn', '中秋节', 'cn', 2, 0, 'mid_autumn', null, (y) => lunar(y, 8, 15)],
  ['double_ninth', '重阳节', 'cn', 2, 0, 'double_ninth', null, (y) => lunar(y, 9, 9)],
  ['halloween', '万圣节', 'us', 2, 0, 'halloween', null, fixed(10, 31)],
  ['veterans_day', '退伍军人节', 'us', 2, 0, 'veterans_day', null, fixed(11, 11)],
  ['thanksgiving', '感恩节', 'us', 2, 0, 'thanksgiving', 'greet_thanksgiving', (y) => nthWeekday(y, 11, 4, 4)],
  ['winter_solstice', '冬至', 'cn', 2, 0, 'winter_solstice', null, winterSolstice],
  ['christmas', '圣诞节', 'intl', 2, 0, 'christmas', 'greet_christmas', fixed(12, 25)]
];

const KNOWN = [
  ['spring_festival', '2027-02-06'], ['spring_festival', '2028-01-26'], ['spring_festival', '2029-02-13'], ['spring_festival', '2030-02-03'],
  ['lantern_festival', '2027-02-20'], ['dragon_boat', '2027-06-09'], ['qixi', '2027-08-08'],
  ['mid_autumn', '2026-09-25'], ['mid_autumn', '2027-09-15'], ['mid_autumn', '2028-10-03'], ['double_ninth', '2026-10-18'],
  ['thanksgiving', '2026-11-26'], ['thanksgiving', '2027-11-25'], ['mothers_day', '2027-05-09'],
  // 额外：近几年公认的日期
  ['spring_festival', '2025-01-29'], ['spring_festival', '2026-02-17'], ['spring_festival', '2031-01-23'],
  ['mid_autumn', '2025-10-06'], ['dragon_boat', '2026-06-19'], ['easter', '2026-04-05'], ['easter', '2027-03-28'],
  ['winter_solstice', '2026-12-22'], ['winter_solstice', '2028-12-21'],
  // 2032–2035 公认春节
  ['spring_festival', '2032-02-11'], ['spring_festival', '2033-01-31'], ['spring_festival', '2034-02-19'], ['spring_festival', '2035-02-08']
];
const LUNAR_MD = { spring_festival: [1, 1], lantern_festival: [1, 15], dragon_boat: [5, 5], qixi: [7, 7], mid_autumn: [8, 15], double_ninth: [9, 9] };
const icu = new Intl.DateTimeFormat('zh-u-ca-chinese', { timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric' });

const rows = [];
for (const f of FESTIVALS) for (let y = Y0; y <= Y1; y++) rows.push([f[0], f[7](y)]);

if (process.argv.includes('--check')) {
  const has = new Set(rows.map((r) => r.join('|')));
  for (const [k, d] of KNOWN) console.log(`${has.has(`${k}|${d}`) ? '✔' : '✘'} ${k} ${d}`);
  console.log('\nICU 农历交叉核对（ICU 按天文算法，个别年份新月贴着子夜时可能差一天）：');
  for (const [k, d] of rows) {
    if (!LUNAR_MD[k]) continue;
    const parts = icu.formatToParts(new Date(`${d}T04:00:00Z`));
    const m = parseInt(parts.find((p) => p.type === 'month').value, 10);
    const dd = parseInt(parts.find((p) => p.type === 'day').value, 10);
    const okd = m === LUNAR_MD[k][0] && dd === LUNAR_MD[k][1];
    if (!okd) console.log(`  不一致 ${k} ${d}：ICU 说是 ${m} 月 ${dd} 日`);
  }
  console.log('\n全部日期：');
  for (const f of FESTIVALS) console.log(`${f[1]}\t${rows.filter((r) => r[0] === f[0]).map((r) => r[1]).join(' ')}`);
} else {
  const q = (v) => (v == null ? 'NULL' : `'${v}'`);
  console.log('INSERT INTO festivals (key, name, kind, show_before_days, show_until_offset, category_key, greet_category_key, sort) VALUES');
  console.log(FESTIVALS.map((f, i) => `  (${q(f[0])}, ${q(f[1])}, ${q(f[2])}, ${f[3]}, ${f[4]}, ${q(f[5])}, ${q(f[6])}, ${i + 1})`).join(',\n') + '\nON CONFLICT (key) DO NOTHING;\n');
  console.log('INSERT INTO festival_dates (festival_key, date) VALUES');
  const lines = FESTIVALS.map((f) => '  ' + rows.filter((r) => r[0] === f[0]).map((r) => `('${r[0]}', '${r[1]}')`).join(', '));
  console.log(lines.join(',\n') + '\nON CONFLICT DO NOTHING;');
}
