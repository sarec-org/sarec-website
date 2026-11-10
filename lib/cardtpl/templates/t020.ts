import type { CardTemplate } from '../types';

/** 20 · 彩球：几乎全白的卡片上悬着一颗流光溢彩的球，极简里的一点惊艳 */
const t: CardTemplate = {
  id: 20,
  name: '彩球',
  desc: '几乎全白的卡片上悬着一颗流光溢彩的球，极简里的一点惊艳',
  cat: '大胆款',
  batch: 2,
  cls: 'q20',
  css: `
.q20{background:#F6F5F1;--c:#111;--a:#111;--s:#444}
.q20 .ball{right:9cqw;top:5cqw;width:30cqw;height:30cqw;border-radius:50%;background:radial-gradient(circle at 30% 26%,#FFF4C9 0%,#FFB067 22%,#FF5C8A 48%,#7B3FE4 76%,#2B1A7A 100%);box-shadow:inset -2cqw -3cqw 6cqw rgba(20,10,80,.45)}
.q20 .sh{right:11cqw;top:35.4cqw;width:26cqw;height:3.4cqw;border-radius:50%;background:radial-gradient(rgba(60,30,120,.32),transparent 70%)}
.q20 .cn{font-family:var(--sans)!important;font-weight:900}
.q20 .en{font-family:var(--sans)!important;font-weight:500}
.q20 .tier{background:#111;color:#fff;border-color:#111}
.q20 .qr{border:1px solid #ddd}
`,
  html: `<div class="deco sh"></div><div class="deco ball"></div><div class="in"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
