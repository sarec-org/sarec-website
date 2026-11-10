import type { CardTemplate } from '../types';

/** 53 · 活版徽章：奶油色棉纸、藏蓝加一点红的圆形徽章，老牌手工作坊的味道 */
const t: CardTemplate = {
  id: 53,
  name: '活版徽章',
  desc: '奶油色棉纸、藏蓝加一点红的圆形徽章，老牌手工作坊的味道',
  cat: '设计经典',
  batch: 2,
  cls: 'c9',
  css: `
.c9{background:#EFE7D6;--c:#1C2F5A;--a:#B3261E;--s:#3B4A70}
.c9 .bg{left:4cqw;top:50%;width:34cqw;height:34cqw;transform:translateY(-50%)}
.c9 .cn{text-shadow:0 .15cqw 0 rgba(255,255,255,.7)}
.c9 .tier{border-color:#B3261E;color:#B3261E}
.c9 .qr{background:transparent;mix-blend-mode:multiply;width:12.5cqw;height:12.5cqw}
`,
  html: `<svg class="deco bg" viewBox="-30 -30 60 60"><defs><path id="rg" d="M0 -21a21 21 0 1 1 -.01 0"/></defs><circle r="28" fill="none" stroke="#1C2F5A" stroke-width="1"/><circle r="25.6" fill="none" stroke="#1C2F5A" stroke-width=".35"/><circle r="15.5" fill="none" stroke="#1C2F5A" stroke-width=".35"/><text font-family="Oswald,Arial,sans-serif" font-weight="500" font-size="4.3" letter-spacing="1.25" fill="#1C2F5A"><textPath href="#rg">{{ring}}</textPath></text><text y="5" text-anchor="middle" font-family="Playfair Display,Georgia,serif" font-weight="700" font-size="15" fill="#B3261E">{{mark}}</text><path d="M-9 9h18" stroke="#1C2F5A" stroke-width=".5"/><text y="13" text-anchor="middle" font-family="Oswald,Arial,sans-serif" font-size="2.6" letter-spacing=".8" fill="#1C2F5A">{{tierName}}</text></svg><div class="in" style="padding-left:41cqw"><div class="top"><span></span>{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
