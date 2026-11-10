import type { CardTemplate } from '../types';

/** 22 · 杂志刊头：像一本财经杂志的封面：刊头、细线、超大衬线名字 */
const t: CardTemplate = {
  id: 22,
  name: '杂志刊头',
  desc: '像一本财经杂志的封面：刊头、细线、超大衬线名字',
  cat: '大胆款',
  batch: 2,
  cls: 'q22',
  css: `
.q22{background:#F6F1E7;--c:#191714;--a:#B3261E;--s:#3A3632}
.q22 .ed{padding:4.6cqw 6cqw 5.4cqw}
.q22 .mh{display:flex;justify-content:space-between;align-items:baseline;border-top:.9cqw solid #191714;border-bottom:.25cqw solid #191714;padding:1.5cqw 0;font-size:2.1cqw;letter-spacing:.2em}
.q22 .mh span:first-child{font-family:var(--en);font-weight:700;font-size:4cqw;letter-spacing:.1em}
.q22 .mh span:last-child{color:#B3261E;font-weight:700}
.q22 .cn{font-size:17cqw!important;letter-spacing:.02em!important;line-height:1.05;margin-top:2cqw!important}
.q22 .en{font-style:italic;font-size:4.4cqw!important;color:#B3261E;margin-top:.6cqw!important}
.q22 .en i{font-family:var(--serif);font-style:normal;font-size:2.5cqw;color:#3A3632;margin-left:1.6cqw;letter-spacing:.06em}
.q22 .bot{border-top:.25cqw solid #191714;padding-top:2.4cqw}
.q22 .qr{border:1px solid #191714;border-radius:0}
`,
  html: `<div class="in ed"><div class="mh"><span>SAREC</span><span>中美房地产商会 · 会员名片</span><span>副会长</span></div><p class="cn">{{name}}</p><p class="en">Andy Wang<i>— 创始人，中美房地产商会</i></p><div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
