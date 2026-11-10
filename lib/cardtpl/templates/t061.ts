import type { CardTemplate } from '../types';

/** 61 · 千禧液态铬：淡紫粉渐变、星星闪光、像水银一样的金属字，千禧年又流行回来了 */
const t: CardTemplate = {
  id: 61,
  name: '千禧液态铬',
  desc: '淡紫粉渐变、星星闪光、像水银一样的金属字，千禧年又流行回来了',
  cat: '设计经典',
  batch: 2,
  cls: 'c17',
  css: `
.c17{background:linear-gradient(120deg,#BFB2FF 0%,#F2C2EA 50%,#B8E8FF 100%);--c:#2A1F5C;--a:#5B3FD6;--s:#3D3270}
.c17 .sp1{right:26cqw;top:6cqw;font-size:9cqw;color:#fff;text-shadow:0 0 2cqw #fff}
.c17 .sp2{right:9cqw;top:24cqw;font-size:5cqw;color:#fff}
.c17 .sp3{left:52cqw;top:30cqw;font-size:6cqw;color:#fff}
.c17 .bb{right:-8cqw;top:-10cqw;width:34cqw;height:34cqw;border-radius:50%;background:radial-gradient(circle at 30% 30%,rgba(255,255,255,.9),rgba(255,255,255,.15) 40%,rgba(120,90,255,.25) 70%,rgba(255,255,255,.5));box-shadow:inset 0 0 3cqw rgba(255,255,255,.8)}
.c17 .chr{font-family:var(--num);font-weight:700;font-style:italic;font-size:11cqw;line-height:1;white-space:nowrap;background:linear-gradient(180deg,#FFFFFF 0%,#C9D2E8 28%,#5A6488 49%,#1E2440 52%,#AEB9D8 60%,#FFFFFF 82%,#8E99BD 100%);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-stroke:.14cqw rgba(30,36,64,.55);filter:drop-shadow(0 .5cqw .6cqw rgba(60,40,140,.35))}
.c17 .cn{font-family:var(--sans)!important;font-weight:900;font-size:4.6cqw!important;letter-spacing:.4em!important;margin-top:1.4cqw!important}
.c17 .tier{background:#fff;border-color:#fff;color:#5B3FD6}
.c17 .qr{border-radius:2.4cqw}
`,
  html: `<div class="deco sp1">✦</div><div class="deco sp2">✦</div><div class="deco sp3">✧</div><div class="deco bb"></div><div class="in"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="chr">ANDY WANG</p><p class="cn">{{name}}</p>{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
