import type { CardTemplate } from '../types';

/** 25 · 瑞士红点：白底、粗黑体、一个红方块，国际设计公司最爱 */
const t: CardTemplate = {
  id: 25,
  name: '瑞士红点',
  desc: '白底、粗黑体、一个红方块，国际设计公司最爱',
  cat: '第一批',
  batch: 2,
  cls: 'k3',
  css: `
.k3{background:#FAFAF7;--c:#111;--a:#E4002B;--s:#444}
.k3 .sq{right:0;bottom:0;width:22cqw;height:22cqw;background:#E4002B}
.k3 .cn,.k3 .org{font-family:var(--sans)!important;font-weight:900}
.k3 .tier{background:#111;color:#fff;border-color:#111}
`,
  html: `<div class="deco sq"></div><div class="in"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="bot" style="margin-top:3cqw;align-items:flex-start">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div><div class="sp"></div><p class="cn big">{{name}}</p><p class="ti"><span class="en" style="margin-right:2cqw">Andy Wang</span>创始人 · 中美房地产商会</p></div>`
};
export default t;
