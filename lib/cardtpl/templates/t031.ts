import type { CardTemplate } from '../types';

/** 31 · 撞色斜切：藏蓝配珊瑚红，一刀斜切，年轻有冲劲 */
const t: CardTemplate = {
  id: 31,
  name: '撞色斜切',
  desc: '藏蓝配珊瑚红，一刀斜切，年轻有冲劲',
  cat: '第一批',
  batch: 2,
  cls: 'k9',
  css: `
.k9{background:#14213D;--c:#fff;--a:#FF6B5E;--s:#C9D3E6}
.k9 .cut{inset:0;background:#FF5A4E;clip-path:polygon(72% 0,100% 0,100% 100%,56% 100%)}
.k9 .tier{background:#fff;color:#FF5A4E;border-color:#fff}
`,
  html: `<div class="deco cut"></div><div class="in"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
