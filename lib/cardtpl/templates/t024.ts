import type { CardTemplate } from '../types';

/** 24 · 象牙凸版：厚棉纸、墨绿字、压出来的暗纹字母，老牌事务所的感觉 */
const t: CardTemplate = {
  id: 24,
  name: '象牙凸版',
  desc: '厚棉纸、墨绿字、压出来的暗纹字母，老牌事务所的感觉',
  cat: '第一批',
  batch: 2,
  cls: 'k2',
  css: `
.k2{background:#F3EEE2;--c:#1F3D2E;--a:#8A6A2F;--s:#44584D}
.k2 .tex{inset:0;background:radial-gradient(rgba(0,0,0,.045) .5px,transparent 1px) 0 0/1.1cqw 1.1cqw}
.k2 .fr{inset:2.4cqw;border:1px solid rgba(31,61,46,.55);outline:1px solid rgba(31,61,46,.25);outline-offset:.8cqw}
.k2 .emb{right:6cqw;top:3cqw;font-family:var(--en);font-weight:700;font-size:44cqw;line-height:1;color:#F3EEE2;text-shadow:-.25cqw -.25cqw .3cqw rgba(0,0,0,.16),.25cqw .25cqw .3cqw rgba(255,255,255,.95)}
`,
  html: `<div class="deco tex"></div><div class="deco fr"></div><div class="deco emb">S</div><div class="in ctr"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}</div><div class="sp"></div><p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="rule"></div><div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
