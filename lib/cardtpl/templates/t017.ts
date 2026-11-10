import type { CardTemplate } from '../types';

/** 17 · 落日大道：紫色天空、条纹落日、伸向远方的霓虹网格，八十年代的未来感 */
const t: CardTemplate = {
  id: 17,
  name: '落日大道',
  desc: '紫色天空、条纹落日、伸向远方的霓虹网格，八十年代的未来感',
  cat: '大胆款',
  batch: 2,
  cls: 'q17',
  css: `
.q17{background:linear-gradient(180deg,#12052E 0%,#3A0F5C 55%,#7A1F6B 64%,#0A0420 64.2%);--c:#fff;--a:#FFD23F;--s:#E6D6FF}
.q17 .sn{right:10cqw;top:9cqw;width:34cqw;height:34cqw;border-radius:50%;background:linear-gradient(180deg,#FFD23F 0%,#FF5E8A 60%,#B336FF 100%);-webkit-mask:linear-gradient(180deg,#000 0 46%,transparent 46%),repeating-linear-gradient(180deg,#000 0 2.4cqw,transparent 2.4cqw 3.3cqw);-webkit-mask-composite:source-over;mask:linear-gradient(180deg,#000 0 46%,transparent 46%),repeating-linear-gradient(180deg,#000 0 2.4cqw,transparent 2.4cqw 3.3cqw);clip-path:inset(0 0 13% 0)}
.q17 .fl{left:-40cqw;right:-40cqw;top:37.8cqw;bottom:0;background:repeating-linear-gradient(90deg,rgba(255,60,200,.75) 0 .35cqw,transparent .35cqw 9cqw),repeating-linear-gradient(0deg,rgba(255,60,200,.75) 0 .35cqw,transparent .35cqw 5cqw);transform:perspective(40cqw) rotateX(58deg);transform-origin:top}
.q17 .cn{font-family:var(--sans)!important;font-weight:900;text-shadow:0 0 2cqw #7DF9FF,0 0 5cqw rgba(125,249,255,.6)}
`,
  html: `<div class="deco sn"></div><div class="deco fl"></div><div class="in"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
