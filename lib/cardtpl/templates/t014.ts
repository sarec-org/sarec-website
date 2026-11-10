import type { CardTemplate } from '../types';

/** 14 · 命令行：一个黑色终端窗口，名片内容像敲命令一样打出来，程序员一看就笑 */
const t: CardTemplate = {
  id: 14,
  name: '命令行',
  desc: '一个黑色终端窗口，名片内容像敲命令一样打出来，程序员一看就笑',
  cat: '大胆款',
  batch: 2,
  cls: 'q14',
  css: `
.q14{background:#0C100C;--c:#D7F5D0;--a:#39FF88;--s:#9FC79A;font-family:var(--mono)!important}
.q14 .bar{left:0;right:0;top:0;height:6cqw;background:#1B211B;display:flex;align-items:center;gap:1.2cqw;padding:0 2.6cqw;box-sizing:border-box}
.q14 .bar i{width:2cqw;height:2cqw;border-radius:50%;background:#FF5F57}
.q14 .bar i:nth-child(2){background:#FEBC2E}
.q14 .bar i:nth-child(3){background:#28C840}
.q14 .bar span{font-size:2cqw;color:#8FA08C;margin-left:auto;margin-right:auto;letter-spacing:.1em}
.q14 .tm{padding:8.4cqw 5cqw 3cqw;font-family:var(--mono);font-size:2.5cqw;line-height:1.5;white-space:nowrap}
.q14 .tm b{color:#39FF88;font-weight:600}
.q14 .tm .o{color:#fff;padding-left:3cqw;margin-bottom:.9cqw}
.q14 .tm .big{font-family:var(--sans);font-weight:900;font-size:6.4cqw;line-height:1.25;letter-spacing:.1em}
.q14 .tm .big span{font-family:var(--mono);font-weight:400;font-size:3cqw;letter-spacing:0;color:#39FF88}
.q14 .tm em{font-style:normal;color:#FEBC2E}
.q14 .tm u{display:inline-block;width:1.6cqw;height:3cqw;background:#39FF88;vertical-align:middle}
.q14 .tq{right:5cqw;bottom:5cqw;padding:.6cqw;border:.4cqw solid #39FF88;border-radius:1.4cqw;box-shadow:0 0 3cqw rgba(57,255,136,.5)}
`,
  html: `<div class="deco bar"><i></i><i></i><i></i><span>~ — card</span></div><div class="in tm"><p><b>$</b> whoami</p><p class="o big">{{name}} {{#nameEn}}<span>{{nameEn}}</span>{{/nameEn}}</p>{{#titleAt}}<p><b>$</b> cat title.txt</p><p class="o">{{titleAt}} {{#tierName}}<em>[SAREC {{tierName}}]</em>{{/tierName}}</p>{{/titleAt}}{{^titleAt}}{{#tierName}}<p><b>$</b> cat title.txt</p><p class="o"><em>[SAREC {{tierName}}]</em></p>{{/tierName}}{{/titleAt}}{{#ctLines}}<p><b>$</b> contact --all</p><p class="o">{{{ctLines}}}</p>{{/ctLines}}<p><b>$</b> <u></u></p></div><div class="deco tq"><div class="qr">{{{qrImg}}}</div></div>`
};
export default t;
