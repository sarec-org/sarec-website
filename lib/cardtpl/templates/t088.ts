import type { CardTemplate } from '../types';

/** 88 · 商会红头：像红头文件：顶上红色的商会全称、一道红线，中间大字姓名和职务，商会协会领导名片的标准样式 */
const t: CardTemplate = {
  id: 88,
  name: '商会红头',
  desc: '像红头文件：顶上红色的商会全称、一道红线，中间大字姓名和职务，商会协会领导名片的标准样式',
  cat: '商务经典',
  batch: 1,
  cls: 'b22',
  css: `
.b22{background:#FFFEFA;--c:#1A1A1A;--a:#C8102E;--s:#3A3A3A}
.b22 .in{padding:5cqw 6.5cqw 5.4cqw}
.b22 .hh{font-family:var(--serif);font-weight:900;font-size:5.6cqw;letter-spacing:.3em;color:#C8102E;display:flex;align-items:center;gap:2cqw;white-space:nowrap}
.b22 .hh i{width:6.4cqw;height:6.4cqw;border-radius:50%;background:#C8102E;color:#fff;display:grid;place-items:center;font-style:normal;font-family:var(--en);font-size:3.6cqw;letter-spacing:0}
.b22 .he{font-size:1.7cqw;letter-spacing:.3em;color:#C8102E;margin-top:.8cqw!important}
.b22 .hr{width:100%;height:.7cqw;background:#C8102E;margin-top:1.6cqw!important;box-shadow:0 1cqw 0 -.25cqw #C8102E}
.b22 .nn{font-family:var(--serif);font-weight:900;font-size:8.4cqw;line-height:1.1;white-space:nowrap}
.b22 .tt{font-size:2.8cqw;letter-spacing:.2em;color:#C8102E;font-weight:700;margin-top:1.4cqw!important}
.b22 .qr{border:1px solid #ddd;width:12.5cqw;height:12.5cqw}
`,
  html: `<div class="in ctr">{{#company}}<p class="hh">{{{markI}}}{{company}}</p>{{/company}}{{#companyEnUp}}<p class="he">{{companyEnUp}}</p>{{/companyEnUp}}<div class="hr"></div><div class="sp"></div><p class="nn">{{nameWide}}</p>{{#tierTitle}}<p class="tt">{{tierTitle}}</p>{{/tierTitle}}<div class="sp"></div><div class="bot">{{#hasIc}}<div class="ic2">{{#ic}}<div class="{{c}}"><i>{{k}}</i>{{v}}</div>{{/ic}}</div>{{/hasIc}}{{^hasIc}}<span></span>{{/hasIc}}<div class="qr">{{{qrImg}}}</div></div></div>`
};
export default t;
