import type { CardTemplate } from '../types';

/** 21 · 碳纤维赛道：碳纤维纹、一道红色赛车线、斜体大写英文名，跑车钥匙的感觉 */
const t: CardTemplate = {
  id: 21,
  name: '碳纤维赛道',
  desc: '碳纤维纹、一道红色赛车线、斜体大写英文名，跑车钥匙的感觉',
  cat: '大胆款',
  batch: 2,
  cls: 'q21',
  css: `
.q21{background:#151517;--c:#fff;--a:#FF2D2D;--s:#C9C9CE}
.q21 .cf{inset:0;background:repeating-linear-gradient(45deg,rgba(255,255,255,.055) 0 .5cqw,transparent .5cqw 1cqw),repeating-linear-gradient(-45deg,rgba(0,0,0,.5) 0 .5cqw,transparent .5cqw 1cqw),linear-gradient(120deg,#232327,#0E0E10)}
.q21 .rs{right:10cqw;top:-10cqw;width:5cqw;height:90cqw;background:linear-gradient(90deg,#FF2D2D 0 60%,transparent 60% 76%,#FF2D2D 76%);transform:rotate(24deg)}
.q21 .en2{font-family:var(--num);font-weight:700;font-style:italic;font-size:11cqw;line-height:1;letter-spacing:.02em;white-space:nowrap}
.q21 .cn{font-family:var(--sans)!important;font-weight:900;font-size:4.6cqw!important;letter-spacing:.4em!important;margin-top:1.6cqw!important;color:#FF2D2D}
.q21 .tier{background:#FF2D2D;color:#fff;border-color:#FF2D2D}
`,
  html: `<div class="deco cf"></div><div class="deco rs"></div><div class="in"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div>{{#nameEnUp}}<p class="en2">{{nameEnUp}}</p>{{/nameEnUp}}<p class="cn">{{name}}</p>{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
