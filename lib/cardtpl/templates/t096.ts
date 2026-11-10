import type { CardTemplate } from '../types';

/** 96 · 盾形徽章：浅灰底，左边一枚藏蓝金边的盾牌徽章，保险、安保、法务给人可靠感 */
const t: CardTemplate = {
  id: 96,
  name: '盾形徽章',
  desc: '浅灰底，左边一枚藏蓝金边的盾牌徽章，保险、安保、法务给人可靠感',
  cat: '商务精选',
  batch: 1,
  cls: 'd7',
  css: `
.d7{background:linear-gradient(160deg,#F6F8FB,#E6EBF2);--c:#12305E;--a:#B08A3C;--s:#3D4F70}
.d7 .sh{left:8cqw;top:7cqw;width:22cqw;height:26cqw;filter:drop-shadow(0 1cqw 1.4cqw rgba(18,48,94,.3))}
.d7 .nm{left:4cqw;top:36cqw;width:30cqw;text-align:center;font-family:var(--en);font-weight:700;font-size:3.6cqw;letter-spacing:.24em;color:#12305E}
.d7 .nm span{display:block;font-family:var(--sans);font-weight:500;font-size:2cqw;letter-spacing:.24em;color:#B08A3C;margin-top:.8cqw}
.d7 .tier{background:#12305E;color:#fff;border-color:#12305E}
.d7 .qr{width:12cqw;height:12cqw;border:1px solid #D5DBE6}
.d7 .ic2{gap:1.05cqw}
`,
  html: `<svg class="deco sh" viewBox="0 0 60 70"><path d="M30 3L55 11V34C55 50 44 61 30 67C16 61 5 50 5 34V11Z" fill="#12305E" stroke="#C39A4A" stroke-width="2"/><path d="M30 9L50 15.5V34C50 47 41 56 30 61C19 56 10 47 10 34V15.5Z" fill="none" stroke="#C39A4A" stroke-width=".6"/><text x="30" y="43" text-anchor="middle" font-family="Playfair Display,Georgia,serif" font-weight="700" font-size="26" fill="#F1DDA6">{{mark}}</text></svg>{{#company}}<div class="deco nm" data-fit>{{company}}{{#companyEn}}<span>{{companyEn}}</span>{{/companyEn}}</div>{{/company}}<div class="in" style="padding-left:40cqw"><div class="top"><span></span>{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="n2"><b>{{name}}</b>{{#title}}<span>{{title}}</span>{{/title}}</p>{{#e2}}<p class="e2">{{e2}}</p>{{/e2}}<div class="sp"></div><div class="bot">{{#hasIc}}<div class="ic2 one">{{#ic}}<div class="{{c}}"><i>{{k}}</i>{{v}}</div>{{/ic}}</div>{{/hasIc}}{{^hasIc}}<span></span>{{/hasIc}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
