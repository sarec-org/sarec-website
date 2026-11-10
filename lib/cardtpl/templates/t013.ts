import type { CardTemplate } from '../types';

/** 13 · 紫绒月桂：深紫丝绒底，一圈金色月桂环抱着姓氏，颁奖礼的隆重 */
const t: CardTemplate = {
  id: 13,
  name: '紫绒月桂',
  desc: '深紫丝绒底，一圈金色月桂环抱着姓氏，颁奖礼的隆重',
  cat: '大胆款',
  batch: 2,
  cls: 'q13',
  css: `
.q13{background:radial-gradient(at 25% 40%,#5A2482,#1E0932 75%);--c:#F6EAD0;--a:#E3C57A;--s:#DCCDE8}
.q13 .lw{left:2cqw;top:50%;width:36cqw;height:36cqw;transform:translateY(-50%)}
.q13 .cn{color:#F6E2A6}
`,
  html: `<svg class="deco lw" viewBox="-30 -30 60 60"><g fill="#E3C57A"><ellipse cx="0" cy="-21" rx="2.3" ry="5.4" transform="rotate(200) rotate(28 0 -21)"/><ellipse cx="0" cy="-21" rx="2.3" ry="5.4" transform="rotate(220) rotate(28 0 -21)"/><ellipse cx="0" cy="-21" rx="2.3" ry="5.4" transform="rotate(240) rotate(28 0 -21)"/><ellipse cx="0" cy="-21" rx="2.3" ry="5.4" transform="rotate(260) rotate(28 0 -21)"/><ellipse cx="0" cy="-21" rx="2.3" ry="5.4" transform="rotate(280) rotate(28 0 -21)"/><ellipse cx="0" cy="-21" rx="2.3" ry="5.4" transform="rotate(300) rotate(28 0 -21)"/><ellipse cx="0" cy="-21" rx="2.3" ry="5.4" transform="rotate(320) rotate(28 0 -21)"/><ellipse cx="0" cy="-21" rx="2.3" ry="5.4" transform="rotate(340) rotate(28 0 -21)"/><ellipse cx="0" cy="-21" rx="2.3" ry="5.4" transform="rotate(-200) rotate(-28 0 -21)"/><ellipse cx="0" cy="-21" rx="2.3" ry="5.4" transform="rotate(-220) rotate(-28 0 -21)"/><ellipse cx="0" cy="-21" rx="2.3" ry="5.4" transform="rotate(-240) rotate(-28 0 -21)"/><ellipse cx="0" cy="-21" rx="2.3" ry="5.4" transform="rotate(-260) rotate(-28 0 -21)"/><ellipse cx="0" cy="-21" rx="2.3" ry="5.4" transform="rotate(-280) rotate(-28 0 -21)"/><ellipse cx="0" cy="-21" rx="2.3" ry="5.4" transform="rotate(-300) rotate(-28 0 -21)"/><ellipse cx="0" cy="-21" rx="2.3" ry="5.4" transform="rotate(-320) rotate(-28 0 -21)"/><ellipse cx="0" cy="-21" rx="2.3" ry="5.4" transform="rotate(-340) rotate(-28 0 -21)"/></g><text x="0" y="6.5" text-anchor="middle" font-family="Playfair Display,Georgia,serif" font-weight="700" font-size="19" fill="#F6E2A6">W</text></svg><div class="in" style="padding-left:39cqw"><div class="top">{{#company}}<span class="org">{{company}}</span>{{/company}}{{^company}}<span></span>{{/company}}{{#tier}}<span class="tier">{{tier}}</span>{{/tier}}</div><div class="sp"></div><p class="cn">{{nameSp}}</p>{{#nameEn}}<p class="en">{{nameEn}}</p>{{/nameEn}}{{#titleLine}}<p class="ti">{{titleLine}}</p>{{/titleLine}}<div class="sp"></div><div class="bot">{{#hasCt}}<div class="ct">{{#ct}}<div><i>{{k}}</i>{{v}}</div>{{/ct}}</div>{{/hasCt}}{{^hasCt}}<span></span>{{/hasCt}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
