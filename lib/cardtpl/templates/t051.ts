import type { CardTemplate } from '../types';

/** 51 · 白卡压凹：白纸上不印墨，徽记和边框全靠压出来的凹痕，只有名字是深灰 */
const t: CardTemplate = {
  id: 51,
  name: '白卡压凹',
  desc: '白纸上不印墨，徽记和边框全靠压出来的凹痕，只有名字是深灰',
  cat: '设计经典',
  batch: 2,
  cls: 'c7',
  css: `
.c7{background:#F6F6F3;--c:#3A3A3A;--a:#8A8A86;--s:#6A6A66}
.c7 .fr{inset:3cqw;border-radius:1cqw;box-shadow:inset .25cqw .25cqw .5cqw rgba(0,0,0,.14),inset -.25cqw -.25cqw .5cqw rgba(255,255,255,1)}
.c7 .em{left:50%;top:1cqw;transform:translateX(-50%);font-family:var(--en);font-weight:700;font-size:50cqw;line-height:1;color:#F6F6F3;text-shadow:-.22cqw -.22cqw .3cqw rgba(0,0,0,.2),.22cqw .22cqw .3cqw rgba(255,255,255,1)}
.c7 .in{padding:7.4cqw 8cqw}
.c7 .cn{font-weight:600;letter-spacing:.4em}
.c7 .qr{background:transparent;mix-blend-mode:multiply}
`,
  html: `<div class="deco fr"></div><div class="deco em">{{mark}}</div><div class="in ctr"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}</div><div class="sp"></div><p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="rule"></div><div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
