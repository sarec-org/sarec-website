import type { CardTemplate } from '../types';

/** 28 · 水墨远山：宣纸底、淡墨远山、一方红印，中式雅致 */
const t: CardTemplate = {
  id: 28,
  name: '水墨远山',
  desc: '宣纸底、淡墨远山、一方红印，中式雅致',
  cat: '第一批',
  batch: 2,
  cls: 'k6',
  css: `
.k6{background:#F5F1E7;--c:#1E1E1E;--a:#B3261E;--s:#4A4A4A}
.k6 .mt{left:0;bottom:0;width:100%;height:30cqw}
.k6 .yin{left:44cqw;top:17cqw;width:6.4cqw;height:6.4cqw;background:#B3261E;color:#F5F1E7;display:grid;place-items:center;font-family:var(--serif);font-weight:900;font-size:4.2cqw;border-radius:.6cqw}
.k6 .cn{font-family:var(--brush)!important;font-weight:400;font-size:11cqw;letter-spacing:.1em}
.k6 .tier{border-color:#B3261E;color:#B3261E}
`,
  html: `<svg class="deco mt" viewBox="0 0 170 50" preserveAspectRatio="none"><path d="M0 50V34l14-12 10 8 16-18 14 14 10-7 18 16 12-10 16 12 14-16 16 14 16-9 14 12v12z" fill="#2B2B2B" opacity=".10"/><path d="M0 50V40l20-10 14 8 18-14 16 12 22-10 18 12 20-9 18 10 24-8v19z" fill="#2B2B2B" opacity=".16"/><path d="M0 50V45l26-6 20 5 28-9 24 8 30-6 22 6 20-4v11z" fill="#2B2B2B" opacity=".26"/></svg><div class="deco yin">王</div><div class="in"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
