import type { CardTemplate } from '../types';

/** 56 · 西装条纹：藏蓝细条纹西装料上缝着一块米白布标，定制裁缝铺的派头 */
const t: CardTemplate = {
  id: 56,
  name: '西装条纹',
  desc: '藏蓝细条纹西装料上缝着一块米白布标，定制裁缝铺的派头',
  cat: '设计经典',
  batch: 2,
  cls: 'c12',
  css: `
.c12{background:#131B33;--c:#F0E7D2;--a:#D9B46A;--s:#C7CCDB}
.c12 .ps{inset:0;background:repeating-linear-gradient(90deg,transparent 0 2.1cqw,rgba(255,255,255,.16) 2.1cqw 2.3cqw)}
.c12 .lb{left:6cqw;top:11.5cqw;width:46cqw;height:26.5cqw;background:#F3EAD6;box-shadow:0 .8cqw 1.6cqw rgba(0,0,0,.5);outline:.3cqw dashed #B08A3C;outline-offset:-1.4cqw}
.c12 .lbx{padding:1.6cqw 0 0 4cqw;color:#1C2440;width:44cqw}
.c12 .lbx .org{font-size:1.8cqw;letter-spacing:.24em;color:#8A6A2F;margin:0}
.c12 .lbx .cn{font-size:6.6cqw;margin:1cqw 0 0;color:#1C2440}
.c12 .lbx .en{color:#8A6A2F;font-size:3.4cqw}
.c12 .lbx .ti{color:#3B4466;margin-top:1.2cqw!important}
.c12 .tier{border-color:#D9B46A;color:#D9B46A}
`,
  html: `<div class="deco ps"></div><div class="deco lb"></div><div class="in"><div class="top"><span></span>{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><div class="lbx">{{#company}}<p class="org">{{company}}</p>{{/company}}<p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#title}}<p class="ti">{{title}}</p>{{/title}}</div><div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
