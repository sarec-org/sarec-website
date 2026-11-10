import type { CardTemplate } from '../types';

/** 7 · 流光描边：纯黑卡片镶一圈会流动的彩色光边，名字也是渐变色 */
const t: CardTemplate = {
  id: 7,
  name: '流光描边',
  desc: '纯黑卡片镶一圈会流动的彩色光边，名字也是渐变色',
  cat: '大胆款',
  batch: 2,
  cls: 'q7',
  css: `
.q7{background:#0B0B12;--c:#fff;--a:#9AD7FF;--s:#C4C9D8}
.q7 .gb{inset:0;background:conic-gradient(from 140deg,#7DF9FF,#B38CFF,#FF7AC6,#FFC56B,#7DF9FF)}
.q7 .gi{inset:.8cqw;border-radius:2.4cqw;background:radial-gradient(at 20% 0,#1B1B2A,#0B0B12 60%)}
.q7 .cn{font-family:var(--sans)!important;font-weight:900;background:linear-gradient(90deg,#7DF9FF,#B38CFF 50%,#FF7AC6);-webkit-background-clip:text;background-clip:text;color:transparent;display:inline-block;align-self:flex-start}
`,
  html: `<div class="deco gb"></div><div class="deco gi"></div><div class="in"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
