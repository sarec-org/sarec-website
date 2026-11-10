import type { CardTemplate } from '../types';

/** 103 · 图标方格：左边深色大字姓名，右边四个彩色方格各放一种联系方式，一目了然 */
const t: CardTemplate = {
  id: 103,
  name: '图标方格',
  desc: '左边深色大字姓名，右边四个彩色方格各放一种联系方式，一目了然',
  cat: '商务精选',
  batch: 1,
  cls: 'd14',
  css: `
.d14{background:#101C3A;--c:#fff;--a:#F2B705;--s:#CBD5EA;--lgc:#101C3A}
.d14 .tr{margin-top:1.8cqw!important}
.d14 .tier{color:#F2B705;border-color:#F2B705}
.d14 .ad{font-size:2cqw;color:#9FB0D0;white-space:nowrap}
.d14 .gd{right:0;top:0;bottom:0;width:46cqw;overflow:hidden;display:grid;grid-template-columns:23cqw 23cqw;grid-template-rows:1fr 1fr;z-index:2}
.d14 .gd div{display:flex;flex-direction:column;justify-content:center;align-items:flex-start;padding:0 2.6cqw;color:#fff;gap:1cqw}
.d14 .gd div:nth-child(1){background:#1E63E9}
.d14 .gd div:nth-child(2){background:#16B364}
.d14 .gd div:nth-child(3){background:#FF7A1A}
.d14 .gd .q{background:#fff;align-items:center}
.d14 .gd i{font-style:normal;width:6cqw;height:6cqw;border-radius:50%;background:rgba(255,255,255,.25);display:grid;place-items:center;font-size:3cqw;font-weight:700}
.d14 .gd b{font-size:2cqw;font-weight:700;line-height:1.3;white-space:nowrap}
.d14 .gd .qr{width:16cqw;height:16cqw;padding:0}
`,
  html: `<div class="deco lf"></div><div class="in" style="padding-right:50cqw"><div class="top">{{#company}}<div class="lg">{{{markI}}}<div><b>{{company}}</b>{{#companyEn}}<span>{{companyEn}}</span>{{/companyEn}}</div></div>{{/company}}{{^company}}<span></span>{{/company}}</div><div class="sp"></div><p class="n2"><b>{{name}}</b>{{#title}}<span>{{title}}</span>{{/title}}</p>{{#e2}}<p class="e2">{{e2}}</p>{{/e2}}<p class="tr">{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</p><div class="sp"></div><div class="ad">美国加州洛杉矶 Los Angeles, CA</div></div><div class="deco gd"><div><i>手</i><b>949 787 8888</b></div><div><i>微</i><b>逍遥</b></div><div><i>邮</i><b>info@<br>sinoamericanrec.org</b></div><div class="q"><div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
