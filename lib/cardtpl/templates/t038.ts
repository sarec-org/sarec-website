import type { CardTemplate } from '../types';

/** 38 · 日式留白：大片留白、一轮红日、极小的字，安静克制 */
const t: CardTemplate = {
  id: 38,
  name: '日式留白',
  desc: '大片留白、一轮红日、极小的字，安静克制',
  cat: '第一批',
  batch: 2,
  cls: 'k16',
  css: `
.k16{background:#FCFBF8;--c:#222;--a:#D7372F;--s:#666}
.k16 .sun{right:9cqw;top:8cqw;width:17cqw;height:17cqw;border-radius:50%;background:#D7372F}
.k16 .cn{font-size:5.6cqw!important;letter-spacing:.6em!important;font-weight:600!important}
.k16 .en{font-size:2.8cqw!important;letter-spacing:.3em}
.k16 .ti,.k16 .ct{font-size:2.1cqw!important}
.k16 .tier{display:none}
.k16 .qr{width:12cqw!important;height:12cqw!important;border:1px solid #ddd}
`,
  html: `<div class="deco sun"></div><div class="in"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
