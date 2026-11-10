import type { CardTemplate } from '../types';

/** 12 · 星河：深空里一片星云、一道行星轨道，辽阔安静 */
const t: CardTemplate = {
  id: 12,
  name: '星河',
  desc: '深空里一片星云、一道行星轨道，辽阔安静',
  cat: '大胆款',
  batch: 2,
  cls: 'q12',
  css: `
.q12{background:radial-gradient(60% 80% at 82% 18%,#4A2386 0%,transparent 60%),radial-gradient(60% 80% at 8% 95%,#0F5C8E 0%,transparent 60%),radial-gradient(40% 50% at 55% 60%,#7A1F5C 0%,transparent 70%),#05060F;--c:#fff;--a:#9AD7FF;--s:#CAD3EA}
.q12 .st1{inset:0;background:radial-gradient(#fff .5px,transparent 1px) 0 0/7cqw 6.2cqw,radial-gradient(#fff .6px,transparent 1.2px) 3cqw 2cqw/11cqw 9.4cqw;opacity:.8}
.q12 .st2{inset:0;background:radial-gradient(#BFE4FF 1px,transparent 1.6px) 5cqw 4cqw/23cqw 17cqw}
.q12 .orb{right:-6cqw;top:-4cqw;width:62cqw;height:26cqw;border:.3cqw solid rgba(154,215,255,.55);border-radius:50%;transform:rotate(-18deg)}
.q12 .orb i{position:absolute;left:9cqw;top:17cqw;width:4cqw;height:4cqw;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,#9AD7FF 50%,#3B6BD6);box-shadow:0 0 3cqw #9AD7FF}
`,
  html: `<div class="deco st1"></div><div class="deco st2"></div><div class="deco orb"><i></i></div><div class="in"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
