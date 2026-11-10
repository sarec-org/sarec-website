import type { CardTemplate } from '../types';

/** 3 · 积木城：米色底上一座立体小城，一块黄色的地亮着，地产味最足 */
const t: CardTemplate = {
  id: 3,
  name: '积木城',
  desc: '米色底上一座立体小城，一块黄色的地亮着，地产味最足',
  cat: '大胆款',
  batch: 2,
  cls: 'q3',
  css: `
.q3{background:#F3EDE2;--c:#14213D;--a:#C2410C;--s:#3D4763}
.q3 .iso2{right:15cqw;top:0;width:42cqw;height:33cqw}
.q3 .cn{font-family:var(--sans)!important;font-weight:900}
.q3 .tier{background:#14213D;color:#fff;border-color:#14213D}
.q3 .qr{border:.4cqw solid #14213D}
`,
  html: `<svg class="deco iso2" viewBox="0 0 90 70"></svg><div class="in"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
