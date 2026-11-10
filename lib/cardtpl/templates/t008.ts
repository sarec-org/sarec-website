import type { CardTemplate } from '../types';

/** 8 · 朱红海水纹：朱红底、金色海水江崖纹、毛笔金字，中国红的喜庆和气派 */
const t: CardTemplate = {
  id: 8,
  name: '朱红海水纹',
  desc: '朱红底、金色海水江崖纹、毛笔金字，中国红的喜庆和气派',
  cat: '大胆款',
  batch: 2,
  cls: 'q8',
  css: `
.q8{background:radial-gradient(at 30% 30%,#C8242A,#8E1116);--c:#FFE9B0;--a:#FFD27A;--s:#F7D9B5}
.q8 .wv{inset:0;background:radial-gradient(circle at 50% 100%,transparent 0 1.7cqw,rgba(255,215,130,.55) 1.8cqw 2.05cqw,transparent 2.15cqw 2.6cqw,rgba(255,215,130,.55) 2.7cqw 2.95cqw,transparent 3.05cqw) 0 0/6.2cqw 3.1cqw,radial-gradient(circle at 50% 100%,transparent 0 1.7cqw,rgba(255,215,130,.55) 1.8cqw 2.05cqw,transparent 2.15cqw 2.6cqw,rgba(255,215,130,.55) 2.7cqw 2.95cqw,transparent 3.05cqw) 3.1cqw 1.55cqw/6.2cqw 3.1cqw;-webkit-mask:linear-gradient(100deg,transparent 38%,#000 72%);mask:linear-gradient(100deg,transparent 38%,#000 72%)}
.q8 .cn{font-family:var(--brush)!important;font-weight:400;font-size:12cqw;letter-spacing:.08em;background:linear-gradient(180deg,#FFF3C4,#F4CF6B 50%,#C8922E);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 .5cqw 0 rgba(70,5,8,.6))}
`,
  html: `<div class="deco wv"></div><div class="in"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
