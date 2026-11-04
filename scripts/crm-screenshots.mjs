/**
 * 会员系统关键页面 iPhone 尺寸截图 + 浏览器里走一遍完整流程（含 Stripe 测试卡入会）。
 * 用法：BASE=<预览网址> CHECKIN_K_FREE=… node scripts/crm-screenshots.mjs
 * 前提：预览环境 CRM_DEV_ECHO_CODES=1（验证码随响应返回，自动填入）；STAFF_EMAIL 已开通 admin。
 * 截图输出：docs/specs/screenshots/web-*.png
 */
import { chromium, devices } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = (process.env.BASE ?? 'http://localhost:3400').replace(/\/$/, '');
const STAFF_EMAIL = process.env.STAFF_EMAIL ?? 'e2e-staff@example.com';
const OUT = 'docs/specs/screenshots';
const RUN = Date.now().toString(36);
const log = (...a) => console.log(...a);
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const iphone = { ...devices['iPhone 13'], locale: 'zh-CN', timezoneId: 'America/Los_Angeles' };
const shots = [];
async function shot(page, name, full = true) {
  await page.waitForTimeout(600);
  const p = `${OUT}/web-${name}.png`;
  await page.screenshot({ path: p, fullPage: full });
  shots.push(p);
  log('  📸', p);
}
async function step(name, fn) {
  try {
    await fn();
    log(`✓ ${name}`);
  } catch (e) {
    log(`✗ ${name}: ${e.message.split('\n')[0]}`);
  }
}

/** 通过页面完成邮箱验证码（测试环境验证码会自动填入） */
async function fillEmailCode(page, email) {
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.getByRole('button', { name: '获取验证码' }).click();
  await page.waitForFunction(() => {
    const el = document.querySelector('input[autocomplete="one-time-code"]');
    return el && el.value.length === 6;
  }, null, { timeout: 15000 });
}

async function apiLogin(ctx, email) {
  const r = await ctx.request.post(`${BASE}/api/v1/auth/code/send`, { data: { channel: 'email', target: email } });
  let j = await r.json();
  if (j.error?.code === 'too_soon') {
    await new Promise((x) => setTimeout(x, 61000));
    j = await (await ctx.request.post(`${BASE}/api/v1/auth/code/send`, { data: { channel: 'email', target: email } })).json();
  }
  const v = await ctx.request.post(`${BASE}/api/v1/auth/code/verify`, { data: { channel: 'email', target: email, code: j.devCode } });
  return v.json();
}

// ── 工作人员：建两场活动 ───────────────────────────────────────────
const staffCtx = await browser.newContext(iphone);
await apiLogin(staffCtx, STAFF_EMAIL);
const start = new Date(Date.now() + 5 * 864e5);
start.setUTCHours(2, 0, 0, 0); // 洛杉矶晚上 7 点前后
const setZelle = async (v) => {
  const j = await (await staffCtx.request.post(`${BASE}/api/v1/staff/settings`, { data: { kind: 'setting', key: 'zelle_enabled', value: v } })).json();
  if (!j.ok) throw new Error('切换 Zelle 开关失败');
};
const mk = async (body) => (await (await staffCtx.request.post(`${BASE}/api/v1/staff/events`, { data: body })).json()).event;
const freeEv = await mk({ title: 'ADU 加建与小型开发讲座', slug: `adu-${RUN}`, summary: '从政策、成本到施工节奏，一晚讲清楚 ADU 怎么做。', startsAt: start.toISOString(), endsAt: new Date(start.getTime() + 2 * 3600e3).toISOString(), locationName: 'SAREC 会议室', address: '1 E Huntington Dr, Arcadia, CA 91006', capacity: 60, feeCents: 0, topicTags: ['adu'] });
const paidEv = await mk({ title: 'AI 与房地产实战课（收费）', slug: `ai-${RUN}`, summary: '用 AI 做市场分析与客户运营。', startsAt: start.toISOString(), endsAt: new Date(start.getTime() + 3 * 3600e3).toISOString(), locationName: 'SAREC 会议室', address: '1 E Huntington Dr, Arcadia, CA 91006', capacity: 30, feeCents: 5000, topicTags: ['ai'] });
const det = async (id) => (await (await staffCtx.request.get(`${BASE}/api/v1/staff/events/${id}`)).json()).event;
const freeK = (await det(freeEv.id)).checkin_secret;
const paidK = (await det(paidEv.id)).checkin_secret;
log('活动：', freeEv.slug, paidEv.slug);

// ── 新人：先看后填 → 首次报名三项同屏 → 成功页 → 补资料 ───────────────
const ctx = await browser.newContext(iphone);
const page = await ctx.newPage();
const email = `demo-${RUN}@example.com`;
let t0;
await step('首次注册 + 报名', async () => {
  await page.goto(`${BASE}/zh/e/${freeEv.slug}`);
  await page.getByRole('button', { name: '报名', exact: true }).waitFor();
  await shot(page, '01-event-before-login');
  t0 = Date.now();
  await page.getByRole('button', { name: '报名', exact: true }).click();
  await page.getByPlaceholder('中文或英文名都可以').fill('王小明');
  await fillEmailCode(page, email);
  await page.getByRole('button', { name: '个人投资人' }).click();
  await shot(page, '02-first-signup-one-screen');
  await page.getByRole('button', { name: '完成报名' }).click();
  await page.waitForURL(/\/done/, { timeout: 20000 });
  await page.getByText('报名成功').first().waitFor();
  log(`  首次注册 + 报名用时（自动化，不含人阅读时间）：${((Date.now() - t0) / 1000).toFixed(1)} 秒`);
  await shot(page, '03-register-success-voucher');
});
await step('成功页补资料（提示与发分一致）', async () => {
  await page.getByText('保存介绍').waitFor({ timeout: 15000 });
  await page.locator('textarea').first().fill('在橙县做出租房投资，想找东区的项目，也能介绍贷款资源。');
  await page.getByRole('button', { name: '保存介绍' }).click();
  await page.getByText('+10 积分').first().waitFor({ timeout: 10000 });
  await shot(page, '04-profile-question-badge');
  // 回答一道选填题
  const firstChip = page.locator('div[class*="card"] button[class*="chip"]').first();
  await firstChip.click();
  await page.getByRole('button', { name: '保存，下一题' }).click();
  await page.waitForTimeout(1500);
  await shot(page, '05-profile-next-question', false);
});
await step('现场扫码签到', async () => {
  await page.goto(`${BASE}/zh/checkin/${freeEv.slug}?k=${freeK}`);
  await page.getByText('签到成功').first().waitFor({ timeout: 10000 });
  await shot(page, '06-checkin-success', false);
  await page.goto(`${BASE}/zh/checkin/${freeEv.slug}?k=${freeK}`);
  await page.getByText('无需重复操作').first().waitFor({ timeout: 10000 });
  await shot(page, '07-checkin-repeat', false);
});
let paidOrder;
await step('收费活动：再次报名（必答同屏）→ 付款页', async () => {
  await page.goto(`${BASE}/zh/e/${paidEv.slug}`);
  await page.waitForTimeout(1500);
  const required = page.getByText(/还需回答 \d 题/);
  if (await required.count()) {
    await shot(page, '08-returning-required-questions');
    const cards = page.locator('form div[class*="card"]');
    const n = await cards.count();
    for (let i = 0; i < n; i++) await cards.nth(i).locator('button[class*="chip"]').first().click();
  } else {
    await page.getByRole('button', { name: /一键报名|报名/ }).first().click();
  }
  await page.getByRole('button', { name: /完成报名|一键报名/ }).first().click();
  await page.waitForURL(/\/done/, { timeout: 20000 });
  await page.getByRole('link', { name: /去付款/ }).click();
  await page.waitForURL(/\/zh\/pay\//);
  paidOrder = page.url().split('/zh/pay/')[1].split('?')[0];
  // 后台开关“Zelle 付款”关闭：付款页只显示银行卡
  await setZelle(false);
  await page.reload();
  await page.getByRole('heading', { name: '银行卡在线支付' }).waitFor();
  if (await page.getByText('付款备注请填订单号').count()) throw new Error('Zelle 关闭时不应显示 Zelle');
  await shot(page, '09a-pay-card-only');
  // 打开后显示 Zelle + 银行卡
  await setZelle(true);
  await page.reload();
  await page.getByText('付款备注请填订单号').waitFor();
  await shot(page, '09-pay-zelle-and-card');
});
await step('收费活动未核款扫码 → 显示待付款 / 待核款', async () => {
  await page.goto(`${BASE}/zh/pay/${paidOrder}`);
  await page.getByRole('button', { name: /我已用 Zelle 付款/ }).click();
  await page.getByText('已提交，待确认到账').first().waitFor();
  await shot(page, '10-pay-submitted', false);
  await page.goto(`${BASE}/zh/checkin/${paidEv.slug}?k=${paidK}`);
  await page.getByText('待付款 / 待核款').waitFor({ timeout: 10000 });
  await shot(page, '11-checkin-pending-payment', false);
});
await step('工作人员核款工作台 → 一键确认', async () => {
  const sp = await staffCtx.newPage();
  await sp.goto(`${BASE}/zh/staff/payments`);
  await sp.getByText(paidOrder).first().waitFor({ timeout: 15000 });
  await shot(sp, '12-staff-payments');
  await staffCtx.request.post(`${BASE}/api/v1/staff/orders/${paidOrder}/verify`, { data: { reference: 'ZELLE-DEMO' } });
  await page.goto(`${BASE}/zh/checkin/${paidEv.slug}?k=${paidK}`);
  await page.getByText('签到成功').first().waitFor({ timeout: 10000 });
  await shot(page, '13-checkin-after-verify', false);
});
await step('会议室三步预约 + 撞时段', async () => {
  await page.goto(`${BASE}/zh/rooms`);
  // 选空位最多的一天（预览库里有之前测试留下的预约）
  const tabs = page.locator('button[class*="tab"]');
  const slots = page.locator('button[class*="slot"]:not([disabled])');
  let best = 1, most = -1;
  for (let i = 1; i < Math.min(await tabs.count(), 14); i++) {
    await tabs.nth(i).click();
    await page.waitForTimeout(400);
    const n = await slots.count();
    if (n > most) { most = n; best = i; }
  }
  await tabs.nth(best).click();
  await page.waitForTimeout(800);
  await slots.nth(2).click();
  await slots.nth(4).click();
  await page.getByText('您的价格').first().waitFor();
  await shot(page, '14-rooms-select-price');
  await page.getByRole('button', { name: /确认/ }).click();
  await page.waitForURL(/\/zh\/pay\//, { timeout: 15000 });
  await shot(page, '15-rooms-pay', false);
});
await step('我的', async () => {
  await page.goto(`${BASE}/zh/me`);
  await page.getByText('积分余额').waitFor();
  await shot(page, '16-me-registered-user');
});

// ── 网上自助入会：填表 → 协议 → 银行卡（Stripe 测试卡）→ 立即成为正式会员 ──
const jctx = await browser.newContext(iphone);
const jp = await jctx.newPage();
const jEmail = `join-${RUN}@example.com`;
await step('入会表单 → 付款页', async () => {
  await jp.goto(`${BASE}/zh/join?tier=member#apply`);
  await jp.locator('#tierSlug').selectOption('member');
  await jp.locator('#contactName').fill('李入会');
  await jp.locator('#email').fill(jEmail);
  await jp.locator('#phone').fill('6265550123');
  await jp.locator('#agree').check();
  await jp.locator('form#apply').screenshot({ path: `${OUT}/web-17-join-form.png` });
  shots.push(`${OUT}/web-17-join-form.png`);
  await jp.locator('form#apply button[type="submit"]').click();
  await jp.waitForURL(/\/zh\/pay\//, { timeout: 20000 });
  await jp.getByText('付款备注请填订单号').waitFor();
  await shot(jp, '18-join-pay-page');
});
await step('Stripe 测试卡 4242 付款 → 回到订单 → 已到账', async () => {
  await jp.getByRole('button', { name: /银行卡支付/ }).click();
  await jp.waitForURL(/checkout\.stripe\.com/, { timeout: 30000 });
  await jp.waitForTimeout(2500);
  await shot(jp, '19-stripe-checkout', false);
  const live = await jp.getByText(/live mode/i).count();
  if (live) throw new Error('预览环境 Stripe 是正式模式，停止，不输入卡号');
  const cardOpt = jp.locator('[data-testid="card-accordion-item"]');
  if (await cardOpt.count()) await cardOpt.click({ position: { x: 40, y: 30 } });
  await jp.locator('#cardNumber').waitFor({ timeout: 15000 });
  await jp.locator('#cardNumber').fill('4242424242424242');
  await jp.locator('#cardExpiry').fill('12 / 34');
  await jp.locator('#cardCvc').fill('123');
  if (await jp.locator('#billingName').count()) await jp.locator('#billingName').fill('Li Test');
  await jp.locator('#billingPostalCode').fill('91006');
  const link = jp.locator('#enableStripePass');
  if ((await link.count()) && (await link.isChecked())) await link.uncheck({ force: true }); // 不保存到 Stripe Link（否则要求填手机号）
  await shot(jp, '20-stripe-test-card-filled', false);
  await jp.locator('[data-testid="hosted-payment-submit-button"]').click();
  await jp.waitForURL(/\/zh\/pay\/.*stripe=success/, { timeout: 60000 });
  await jp.getByText('付款已到账').waitFor({ timeout: 30000 });
  await shot(jp, '21-join-paid-success');
});
await step('我的：会员身份与到期日', async () => {
  await jp.goto(`${BASE}/zh/me`);
  await jp.getByText('有效期至').waitFor({ timeout: 15000 });
  await shot(jp, '22-me-member-card');
});

// ── 工作人员后台页面 ───────────────────────────────────────────────
await step('后台页面', async () => {
  const sp = await staffCtx.newPage();
  await sp.goto(`${BASE}/zh/staff`);
  await sp.waitForTimeout(1500);
  await shot(sp, '23-staff-home');
  await sp.goto(`${BASE}/zh/staff/settings`);
  await sp.getByText('Zelle 付款').first().waitFor();
  await shot(sp, '23a-staff-settings-zelle-switch');
  await sp.goto(`${BASE}/zh/staff/events/${freeEv.id}`);
  await sp.waitForTimeout(2500);
  await shot(sp, '24-staff-event-qr');
  const q = await (await staffCtx.request.get(`${BASE}/api/v1/staff/contacts?q=${encodeURIComponent(email)}`)).json();
  const cid = (q.contacts ?? q.rows ?? [])[0]?.id;
  await sp.goto(`${BASE}/zh/staff/contacts/${cid}`);
  await sp.waitForTimeout(2500);
  await shot(sp, '25-staff-contact-timeline');
  await sp.goto(`${BASE}/zh/staff/checkin`);
  await sp.waitForTimeout(2000);
  await shot(sp, '26-staff-checkin-desk');
});
await step('登录页（含小程序扫码登录）', async () => {
  const lc = await browser.newContext(iphone);
  const lp = await lc.newPage();
  await lp.goto(`${BASE}/zh/signin`);
  await lp.getByText('用 SAREC 小程序扫码登录').waitFor({ timeout: 15000 });
  await lp.getByText('用 SAREC 小程序扫码登录').click();
  await lp.locator('img[alt="扫码登录二维码"]').waitFor({ timeout: 10000 });
  await shot(lp, '27-login-qr');
});

log(`\n截图 ${shots.length} 张`);
await browser.close();
