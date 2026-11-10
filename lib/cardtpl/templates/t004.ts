import type { CardTemplate } from '../types';

/** 4 · 证券雕版：钞票和股票证书上那种细密团花纹，墨绿配米白，老钱风 */
const t: CardTemplate = {
  id: 4,
  name: '证券雕版',
  desc: '钞票和股票证书上那种细密团花纹，墨绿配米白，老钱风',
  cat: '大胆款',
  batch: 2,
  cls: 'q4',
  css: `
.q4{background:#F4F1E4;--c:#143F31;--a:#1C5C44;--s:#2F5546}
.q4 .ro{width:46cqw;height:46cqw;border-radius:50%;background:repeating-radial-gradient(circle,transparent 0 .55cqw,rgba(28,92,68,.4) .55cqw .68cqw)}
.q4 .r1{left:-20cqw;top:-20cqw}
.q4 .r2{left:-16cqw;top:-17cqw}
.q4 .r3{right:-20cqw;bottom:-20cqw}
.q4 .r4{right:-16cqw;bottom:-17cqw}
.q4 .band{inset:2.2cqw;border:1.2cqw solid transparent;border-image:repeating-linear-gradient(45deg,#1C5C44 0 .35cqw,#F4F1E4 .35cqw .9cqw) 12;outline:1px solid #1C5C44;outline-offset:-.3cqw}
.q4 .cn{letter-spacing:.3em}
.q4 .org{font-family:var(--en);letter-spacing:.3em}
.q4 .in{padding:7.4cqw 8cqw}
`,
  html: `<div class="deco ro r1"></div><div class="deco ro r2"></div><div class="deco ro r3"></div><div class="deco ro r4"></div><div class="deco band"></div><div class="in ctr"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}</div><div class="sp"></div><p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="rule"></div><div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
