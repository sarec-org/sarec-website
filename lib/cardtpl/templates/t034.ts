import type { CardTemplate } from '../types';

/** 34 · 牛皮纸印章：牛皮纸底、黑色铅字、虚线边，手作咖啡店那种亲切 */
const t: CardTemplate = {
  id: 34,
  name: '牛皮纸印章',
  desc: '牛皮纸底、黑色铅字、虚线边，手作咖啡店那种亲切',
  cat: '第一批',
  batch: 2,
  cls: 'k12',
  css: `
.k12{background:#C8A678;--c:#2A1D10;--a:#2A1D10;--s:#3D2C1A}
.k12 .tex{inset:0;background:repeating-linear-gradient(92deg,rgba(60,35,10,.06) 0 .2cqw,transparent .2cqw .9cqw),radial-gradient(rgba(60,35,10,.1) .5px,transparent 1px) 0 0/1.3cqw 1.1cqw}
.k12 .fr{inset:2.4cqw;border:.35cqw dashed rgba(42,29,16,.7)}
.k12 .stp{right:7cqw;top:6cqw;width:15cqw;height:15cqw;border:.6cqw solid #7A2416;border-radius:50%;color:#7A2416;display:grid;place-items:center;text-align:center;font-family:var(--num);font-weight:700;font-size:2.4cqw;letter-spacing:.14em;line-height:1.3;transform:rotate(-14deg);opacity:.8}
.k12 .org,.k12 .ct,.k12 .ti{font-family:var(--mono)}
`,
  html: `<div class="deco tex"></div><div class="deco fr"></div><div class="deco stp">SAREC<br>MEMBER</div><div class="in ctr"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}</div><div class="sp"></div><p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="rule"></div><div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
