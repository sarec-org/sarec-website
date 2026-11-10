import type { CardTemplate } from '../types';

/** 19 · 玉璧：温润的玉色底，一枚玉璧，君子如玉 */
const t: CardTemplate = {
  id: 19,
  name: '玉璧',
  desc: '温润的玉色底，一枚玉璧，君子如玉',
  cat: '大胆款',
  batch: 2,
  cls: 'q19',
  css: `
.q19{background:radial-gradient(60% 80% at 20% 20%,#F2FAF4,transparent 60%),radial-gradient(70% 90% at 90% 90%,#8FCDB2,transparent 65%),linear-gradient(135deg,#DDF0E5,#B4DDC8);--c:#0D3A2C;--a:#1F7A5C;--s:#2B5A49}
.q19 .v1{inset:0;background:linear-gradient(118deg,transparent 40%,rgba(255,255,255,.55) 41%,transparent 43.5%),linear-gradient(104deg,transparent 62%,rgba(255,255,255,.4) 62.6%,transparent 64%),linear-gradient(128deg,transparent 18%,rgba(31,122,92,.12) 18.5%,transparent 20.5%)}
.q19 .bi{right:10cqw;top:5cqw;width:27cqw;height:27cqw;border-radius:50%;background:radial-gradient(circle,transparent 0 21%,#2F8F6F 22%,#7FCBAB 34%,#4FAE8A 52%,#1F6B55 69%,transparent 70%);filter:drop-shadow(0 1.2cqw 1.4cqw rgba(13,58,44,.35))}
.q19 .tier{display:none}
`,
  html: `<div class="deco v1"></div><div class="deco v2"></div><div class="deco bi"></div><div class="in"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
