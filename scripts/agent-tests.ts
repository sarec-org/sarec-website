/**
 * 商会 AI 助手（lib/agent）纯函数测试：不需要数据库、不调任何模型、不发网络请求。
 * 用法：pnpm dlx tsx scripts/agent-tests.ts
 */
import assert from 'node:assert/strict';
import { detectLang, extractEmail, extractPhone, extractWechat, isBotUserAgent, keywordScore, laDay, addDays, looksMeaningless, tokenize } from '@/lib/agent/text';
import { asksInvestmentReturn, asksLegalTax, asksSendOnBehalf, extractLeadSlots, isLeadIntent, leadNextStep, mergeLead, wantsJoin, wantsRegister } from '@/lib/agent/intent';
import { Bm25, chunkText } from '@/lib/agent/bm25';
import { buildStaticChunks, getIndex } from '@/lib/agent/knowledge';
import { matchFaq, renderFaq } from '@/lib/agent/faq';
import { computeBudget } from '@/lib/agent/budget';
import { costMicros, priceFor } from '@/lib/agent/config';
import { assess, emptyRow } from '@/lib/agent/guard';
import { OUTPUT_SCHEMA, SYSTEM_PROMPT, geminiSchema, parseModelOutput } from '@/lib/agent/prompt';
import { finalizeReply } from '@/lib/agent/engine';

let passed = 0;
const t = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
};

console.log('text');
t('语言识别', () => {
  assert.equal(detectLang('最近有什么活动'), 'zh');
  assert.equal(detectLang('When is the next event?'), 'en');
});
t('分词：中文二字组 + 英文词', () => {
  const k = tokenize('洛杉矶 ED1 项目');
  assert.ok(k.includes('洛杉') && k.includes('杉矶') && k.includes('ed1') && k.includes('项目'));
});
t('关键词 a+b', () => {
  assert.ok(keywordScore('下次活动什么时间？', ['活动+时间']) > 0);
  assert.equal(keywordScore('活动很好', ['活动+时间']), 0);
  assert.ok(keywordScore('When is the next event?', ['event+when']) > 0);
});
t('联系方式提取', () => {
  assert.equal(extractEmail('我的邮箱 a.b+c@x.com 谢谢'), 'a.b+c@x.com');
  assert.equal(extractPhone('电话 +1 (626) 555-1234'), '+16265551234');
  assert.equal(extractPhone('2026年10月'), null);
  assert.equal(extractWechat('微信：andy_2026x'), 'andy_2026x');
});
t('机器人 UA / 无意义内容', () => {
  assert.ok(isBotUserAgent('python-requests/2.31'));
  assert.ok(isBotUserAgent(''));
  assert.ok(!isBotUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'));
  assert.ok(looksMeaningless('aaaaaaaaaaaaaa'));
  assert.ok(looksMeaningless('!!!!????....'));
  assert.ok(!looksMeaningless('怎么入会'));
});
t('洛杉矶日期', () => {
  assert.equal(laDay(new Date('2026-11-05T06:00:00Z')), '2026-11-04');
  assert.equal(addDays('2026-11-01', -1), '2026-10-31');
});

console.log('intent');
t('线索识别', () => {
  assert.ok(isLeadIntent('我在洛杉矶有块地想做 ADU 开发，想找资金'));
  assert.ok(isLeadIntent('We are looking for a JV partner for a project in LA'));
  assert.ok(!isLeadIntent('最近有什么活动'));
  assert.ok(!isLeadIntent('ED1 是什么'));
});
t('边界：投资回报', () => {
  assert.ok(asksInvestmentReturn('这个项目年化回报多少'));
  assert.ok(asksInvestmentReturn('能保本吗'));
  assert.ok(asksInvestmentReturn('What returns can I expect?'));
  assert.ok(!asksInvestmentReturn('IRR 是什么意思'));
  assert.ok(!asksInvestmentReturn('怎么入会'));
});
t('边界：法律税务 / 代发邮件', () => {
  assert.ok(asksLegalTax('买房要交多少税'));
  assert.ok(asksLegalTax('Can you give me legal advice?'));
  assert.ok(asksSendOnBehalf('帮我发邮件给王总'));
  assert.ok(asksSendOnBehalf('Please send an email to Andy for me'));
  assert.ok(!asksSendOnBehalf('你们的邮箱是多少'));
});
t('报名 / 入会意图', () => {
  assert.ok(wantsRegister('帮我报名'));
  assert.ok(wantsRegister('sign me up please'));
  assert.ok(wantsJoin('我想入会'));
});
t('线索收集顺序：需求 → 地区 → 时间 → 约电话 → 联系方式 → 确认', () => {
  let l = mergeLead({}, extractLeadSlots('我想在洛杉矶做一个 ADU 开发项目', null, {}));
  assert.ok(l.need && l.region === '洛杉矶');
  assert.equal(leadNextStep(l), 'timeline');
  l = mergeLead(l, extractLeadSlots('明年上半年', 'timeline', l));
  assert.equal(leadNextStep(l), 'call');
  l = mergeLead(l, extractLeadSlots('好的', 'call', l));
  assert.equal(l.wantsCall, true);
  assert.equal(leadNextStep(l), 'contact');
  l = mergeLead(l, extractLeadSlots('我叫王磊，电话 626-555-1234', 'contact', l));
  assert.equal(l.name, '王磊');
  assert.equal(leadNextStep(l), 'ready');
});
t('1.2：笼统一句先追问需求；答非所问不硬塞；报名不当线索', () => {
  let l = mergeLead({}, extractLeadSlots('我们手上有一个开发项目，想找资金合作', null, {}));
  assert.equal(leadNextStep(l), 'need');
  l = mergeLead(l, extractLeadSlots('是一个 20 套公寓的新建项目', 'need', l));
  assert.ok(l.need?.includes('20 套公寓') && l.need.includes('开发项目'));
  l = mergeLead(l, extractLeadSlots('还在看', 'region', l));
  assert.equal(l.region, '还在看');
  const l2 = mergeLead({ need: 'x' }, extractLeadSlots('在洛杉矶', 'timeline', { need: 'x', region: '加州' }));
  assert.ok(!l2.timeline);
  const l3 = mergeLead({ need: '开发项目' }, extractLeadSlots('是一个 20 套公寓的新建项目', 'region', { need: '开发项目' }));
  assert.ok(!l3.region && l3.need?.includes('20 套公寓'));
  assert.ok(wantsRegister('帮我报名洛杉矶小型开发项目那场'));
  assert.ok(asksSendOnBehalf('帮我给你们创始人发个邮件说我想合作'));
});
t('不愿约电话也能留联系方式', () => {
  const l = mergeLead({ need: 'x', region: 'LA', timeline: '明年' }, extractLeadSlots('先不用', 'call', { need: 'x', region: 'LA', timeline: '明年' }));
  assert.equal(l.wantsCall, false);
  assert.equal(leadNextStep(l), 'contact');
});

console.log('knowledge / bm25');
t('分段', () => {
  const c = chunkText('第一句。'.repeat(200), 450);
  assert.ok(c.length > 1 && c.every((x) => x.length <= 450));
});
t('BM25 检索', () => {
  const idx = new Bm25([
    { id: '1', source: 'page', title: '入会流程', url: '/zh/join', text: '选择档位 确认协议 在线付款' },
    { id: '2', source: 'page', title: 'ED1 政策', url: '/zh/research/ed1', text: '洛杉矶 ED1 经济适用房 审批' }
  ]);
  assert.equal(idx.search('ED1 审批要多久')[0]?.id, '2');
});
t('静态知识库建得起来，且不含会员价格', () => {
  const chunks = buildStaticChunks();
  assert.ok(chunks.length > 50, `chunks=${chunks.length}`);
  const membership = chunks.filter((c) => c.source === 'membership');
  assert.ok(membership.length >= 5);
  assert.ok(membership.every((c) => !/\$\s?\d|美元/.test(c.text)), '会员权益段落不应含价格');
  const idx = getIndex([], []);
  const hits = idx.search('EB-5 投资移民 排期');
  assert.ok(hits.length > 0 && hits.length <= 4);
});

console.log('faq');
const FAQ = [
  { id: 1, intent: 'event_time', title: '活动', keywords: ['活动+时间', '近期活动', '下一场'], answer_zh: '{next_event}', answer_en: '{next_event}', priority: 20 },
  { id: 2, intent: 'address', title: '地址', keywords: ['地址', '在哪'], answer_zh: '500 S Hacienda Blvd', answer_en: null, priority: 10 },
  { id: 3, intent: 'how_join', title: '入会', keywords: ['怎么入会', '加入商会'], answer_zh: '/zh/join', answer_en: null, priority: 15 }
];
t('意图匹配与活动占位符', () => {
  assert.equal(matchFaq('下一场活动什么时间', FAQ)?.faq.intent, 'event_time');
  assert.equal(matchFaq('商会地址在哪', FAQ)?.faq.intent, 'address');
  assert.equal(matchFaq('今天天气不错', FAQ), null);
  assert.equal(matchFaq('我想详细了解一下你们商会在洛杉矶的各种合作方式、会员的不同档位以及如何加入商会才能参与项目判断，另外我在国内也有一些资源想对接，想知道具体流程', FAQ), null, '长问题不走常见问题库');
  const ans = renderFaq(FAQ[0], 'zh', [{ slug: 'a', title: '十一月沙龙', summary: null, startsAt: '2026-11-20T02:00:00Z', timezone: 'America/Los_Angeles', locationName: '商会办公室', address: null, registrationOpen: true, status: 'scheduled' }]);
  assert.ok(ans.includes('十一月沙龙') && ans.includes('/zh/e/a'));
  assert.ok(renderFaq(FAQ[0], 'zh', []).includes('/zh/events'));
});

console.log('budget');
t('三档：70 / 90 / 100', () => {
  assert.equal(computeBudget(30, 10e6, 0, null).level, 'ok');
  assert.equal(computeBudget(30, 21e6, 0, null).level, 'warn');
  assert.equal(computeBudget(30, 27e6, 0, null).level, 'restrict');
  assert.equal(computeBudget(30, 30e6, 0, null).level, 'stop');
  // 每日预算 = 1 美元：今天花 0.95 → 95%
  assert.equal(computeBudget(30, 1e6, 0.95e6, null).level, 'restrict');
  // 测试开关优先
  assert.equal(computeBudget(30, 0, 0, 100).level, 'stop');
  assert.equal(computeBudget(30, 0, 0, 70).level, 'warn');
});
t('价格表与花费', () => {
  assert.equal(costMicros('claude-sonnet-5-5', { input: 1000, output: 200, cacheRead: 2000, cacheWrite: 0 }), 1000 * 2 + 200 * 10 + 2000 * 0.2);
  assert.equal(priceFor('mock:gemini-2.5-flash').input, 0.3);
  assert.ok(priceFor('some-new-model').input >= 2, '未知模型按偏贵价估算');
});

console.log('guard');
t('秒级连发 / 重复', () => {
  const now = new Date('2026-11-05T10:00:00Z');
  let r = emptyRow('v:x');
  let reasons: string[] = [];
  for (let i = 0; i < 5; i++) {
    const a = assess(r, new Date(now.getTime() + i * 1600), 'h' + i, { meaningless: false, long: false });
    r = a.row;
    reasons = a.reasons;
  }
  assert.ok(reasons.includes('burst'));
  const a1 = assess(emptyRow('v:y'), now, 'same', { meaningless: false, long: false });
  const a2 = assess(a1.row, new Date(now.getTime() + 5000), 'same', { meaningless: false, long: false });
  const a3 = assess(a2.row, new Date(now.getTime() + 10000), 'same', { meaningless: false, long: false });
  assert.ok(!a2.reasons.includes('repeat') && a3.reasons.includes('repeat'));
  const fast = assess(a1.row, new Date(now.getTime() + 300), 'other', { meaningless: false, long: false });
  assert.ok(fast.reasons.includes('interval'));
});

console.log('prompt / output');
t('系统提示词固定（不含日期等变量），含边界', () => {
  assert.ok(!/\d{4}-\d{2}-\d{2}/.test(SYSTEM_PROMPT));
  assert.ok(SYSTEM_PROMPT.includes('不谈投资回报') && SYSTEM_PROMPT.includes('不给法律、税务意见') && SYSTEM_PROMPT.includes('不替任何人发邮件'));
  assert.ok(SYSTEM_PROMPT.length > 1200, '足够长才会被提示缓存');
});
t('结构化输出解析', () => {
  const o = parseModelOutput(JSON.stringify({ reply: '好的', lang: 'zh', intent: 'lead', lead: { need: 'ADU', region: '', timeline: '', wantsCall: 'yes', name: '', phone: '', email: '', wechat: '' }, action: 'lead', eventSlug: '' }));
  assert.equal(o?.action, 'lead');
  assert.equal(parseModelOutput('{bad'), null);
  assert.equal(parseModelOutput('纯文本回答')?.reply, '纯文本回答');
  const g = geminiSchema() as { type: string; properties: Record<string, { type: string }> };
  assert.equal(g.type, 'OBJECT');
  assert.equal(g.properties.lead.type, 'OBJECT');
  assert.ok(OUTPUT_SCHEMA.required.includes('reply'));
});
t('回答安全网：长度上限、回报数字', () => {
  assert.ok(finalizeReply('字'.repeat(1000), 'zh').length <= 400);
  assert.ok(finalizeReply('这个项目年化回报约 12% 左右', 'zh').includes('不谈'));
  assert.equal(finalizeReply('活动在 11 月 20 日', 'zh'), '活动在 11 月 20 日');
});

console.log(`\n${passed} passed`);
