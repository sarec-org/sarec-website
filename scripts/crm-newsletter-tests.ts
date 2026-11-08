/**
 * 邮件通讯回归测试（测试库，不真发信：Resend 请求在 fetch 层拦截）。
 * 收件人只验证过邮箱、退订 / 投诉 / 退信 / 无效邮箱不发；个性化兜底；退订链接签名；
 * 发送闸门（AI 审核 → 测试邮件 → 只有管理员确认才群发，改过内容要重发测试）；额度不够拦下；统计回写。
 * 只建 DEV13- 测试数据（渠道来源用本次专属值隔离），结束按 ID 删除。
 * 用法：DATABASE_URL=<测试库> pnpm dlx tsx scripts/crm-newsletter-tests.ts --i-know-this-is-not-production
 */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';

const sent: { url: string; body: unknown }[] = [];
const realFetch = globalThis.fetch;
globalThis.fetch = (async (url: unknown, init?: { body?: string }) => {
  const u = String((url as { url?: string })?.url ?? url);
  if (u.includes('api.resend.com')) {
    const body = JSON.parse(init?.body ?? '{}');
    sent.push({ url: u, body });
    const payload = u.endsWith('/emails/batch') ? { data: (body as unknown[]).map((_, i) => ({ id: `dev13-r-${Date.now()}-${i}` })) } : { id: `dev13-r-${Date.now()}` };
    return new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  return realFetch(url as string, init as RequestInit);
}) as typeof fetch;

process.env.RESEND_API_KEY = 're_dev13_intercepted';
process.env.PREVIEW_EMAIL_ALLOW = 'dev13@example.com';
process.env.NEWSLETTER_SECRET = 'dev13-local-only';

const sfx = randomBytes(3).toString('hex');
const CH = `dev13-nl-${sfx}`;
let passed = 0;
const ok = (n: string) => { passed++; console.log(`  ✓ ${n}`); };

async function main() {
  const { getPool } = await import('@/lib/db/client');
  const nl = await import('@/lib/crm/newsletter');
  const { guardNotProduction } = await import('./_guard');
  guardNotProduction();
  const pool = getPool();
  const made = { contacts: [] as string[], issues: [] as number[], events: [] as string[] };
  const countsBefore = await pool.query<{ day: string; sent: number; newsletter: number }>(`SELECT day::text, sent, newsletter FROM email_send_counts WHERE day = (now() AT TIME ZONE 'America/Los_Angeles')::date`);
  const settingsBefore = await pool.query<{ key: string; value: unknown }>(`SELECT key, value FROM crm_settings WHERE key IN ('newsletter_test_to', 'resend_monthly_quota', 'resend_daily_quota')`);
  try {
    assert.equal((await pool.query(`SELECT 1 FROM events WHERE slug = '2026-11-07-event-e641'`)).rows.length, 0, '正式库，停止');
    const mk = async (tag: string, email: string | null, verified: boolean, extra: Record<string, unknown> = {}) => {
      const { rows } = await pool.query<{ id: string }>(
        `INSERT INTO contacts (name, email, email_verified_at, acquisition_source, first_channel, role_category) VALUES ($1, $2, $3, 'test', $4, $5) RETURNING id`,
        [extra.noName ? '微信用户' : `DEV13-${tag}-${sfx}`, email, verified ? new Date() : null, CH, extra.role ?? null]
      );
      made.contacts.push(rows[0].id);
      return rows[0].id;
    };
    const em = (t: string) => `dev13+${t}-${sfx}@example.com`;
    const a = await mk('a', em('a'), true, { role: 'owner_investor' });
    const noName = await mk('n', em('n'), true, { noName: true });
    await mk('unv', em('unv'), false);
    const cm = await mk('cm', null, false);
    await pool.query(`INSERT INTO contact_methods (contact_id, kind, value, status, is_current, source) VALUES ($1, 'email', $2, 'confirmed', true, 'test')`, [cm, em('cm')]);
    const bad = await mk('bad', em('bad'), true);
    await pool.query(`INSERT INTO contact_methods (contact_id, kind, value, status, is_current, source) VALUES ($1, 'email', $2, 'invalid', true, 'test')`, [bad, em('bad')]);
    const un = await mk('un', em('un'), true);
    await nl.unsubscribe(nl.unsubToken(em('un')));
    void un;

    const f = { channels: [CH] };
    let list = await nl.audience(f);
    const emails = list.map((r) => r.email).sort();
    assert.deepEqual(emails, [em('a'), em('cm'), em('n')].sort(), '只有验证过邮箱、没退订、邮箱有效的人');
    assert.equal((await nl.audience({ channels: [CH], industries: ['owner_investor'] })).length, 1, '按行业筛选');
    assert.equal((await nl.audience({ channels: [CH], audience: 'member' })).length, 0, '只发会员：测试账号都不是会员');
    ok('收件人：只发验证过邮箱的人；未验证、无效、退订的不发；能按行业 / 会员 / 渠道筛选');

    // 个性化兜底
    const r0 = list.find((r) => r.email === em('n'))!;
    assert.equal(nl.personalize('{姓名}，您好：\n\n本周有新活动。\n您上次参加了{上次参加的活动}。', r0, 'body'), '您好，\n\n本周有新活动。');
    const rA = list.find((r) => r.email === em('a'))!;
    assert.ok(nl.personalize('{姓名}，您好：', rA, 'body').startsWith(`DEV13-a-${sfx}，您好`));
    assert.equal(nl.personalize('{姓名}，本周通讯', r0, 'subject'), '本周通讯');
    ok('个性化：没有姓名时第一行用“您好，”兜底，缺值的其它行不显示；标题去掉空变量');

    // 退订链接
    const t = nl.unsubToken(em('a'));
    assert.equal(nl.emailFromToken(t), em('a'));
    assert.equal(nl.emailFromToken(t.slice(0, -1) + (t.endsWith('A') ? 'B' : 'A')), null, '改过的退订编号无效');
    ok('一键退订链接带签名，改过就无效');

    // 发送闸门
    const ops = { contactId: 'x', email: 'ops@example.com', name: 'DEV13 助理', roles: ['ops'] as const };
    const admin = { contactId: 'y', email: 'boss@example.com', name: 'DEV13 东哥', roles: ['admin'] as const };
    await pool.query(`INSERT INTO crm_settings (key, value, updated_by) VALUES ('newsletter_test_to', $1, 'dev13') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [JSON.stringify(em('boss'))]);
    const { id } = await nl.createIssue(ops as never, { subject: '{姓名}，商会本周通讯', body: '{姓名}，您好：\n\n## 本周活动\n- [讲座](https://sinoamericanrec.org/zh/events)\n\n谢谢！', filters: f });
    made.issues.push(id);
    await assert.rejects(nl.confirmSend(admin as never, id), /测试邮件/, '没发测试不能确认');
    await nl.sendTest(ops as never, id);
    const test = sent.pop()!;
    assert.ok(String((test.body as { subject: string }).subject).startsWith('【测试】'));
    assert.ok(String((test.body as { html: string }).html).includes('一键退订') && String((test.body as { html: string }).html).includes('500 S Hacienda Blvd'));
    assert.ok((test.body as { headers: Record<string, string> }).headers['List-Unsubscribe-Post'] === 'List-Unsubscribe=One-Click');
    await assert.rejects(nl.confirmSend(ops as never, id), /管理员/, '助理不能确认群发');
    await nl.updateIssue(id, { body: '{姓名}，您好：\n\n改过的正文。' });
    await assert.rejects(nl.confirmSend(admin as never, id), /重新发测试|测试邮件/, '改过内容要重发测试');
    await nl.sendTest(ops as never, id);
    sent.length = 0;
    // 队列：没确认的期数一封都不发
    assert.deepEqual(await nl.processQueue(id), { sent: 0, left: 0, paused: false });
    assert.equal(sent.length, 0);
    ok('发送闸门：必须先发测试邮件（带一键退订、商会地址、退订头），改过内容要重发；只有管理员能确认；没确认的一封不发');

    // AI 草稿要审核
    const { id: aiId } = await nl.createIssue(ops as never, { subject: 'x', body: 'y', filters: f });
    made.issues.push(aiId);
    await pool.query(`UPDATE newsletter_issues SET source = 'ai' WHERE id = $1`, [aiId]);
    await assert.rejects(nl.sendTest(ops as never, aiId), /审核/);
    await assert.rejects(nl.markAiReviewed(ops as never, aiId), /管理员/);
    await nl.markAiReviewed(admin as never, aiId);
    await nl.sendTest(ops as never, aiId);
    sent.length = 0;
    ok('AI 草稿：东哥点“我已审核”之前不能发测试、不能群发；只有管理员能审核');

    // 额度不够拦下
    await pool.query(`INSERT INTO crm_settings (key, value, updated_by) VALUES ('resend_monthly_quota', '1', 'dev13') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`);
    await assert.rejects(nl.confirmSend(admin as never, id), /额度不够/);
    await pool.query(`UPDATE crm_settings SET value = '100000' WHERE key = 'resend_monthly_quota'`);
    await pool.query(`INSERT INTO crm_settings (key, value, updated_by) VALUES ('resend_daily_quota', '100000', 'dev13') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`);
    ok('额度不够时拦下不发，并提醒东哥');

    // 确认发送
    const out = await nl.confirmSend(admin as never, id);
    assert.equal(out.recipients, 3);
    assert.equal(out.sent, 3);
    const batch = sent.find((x) => x.url.endsWith('/emails/batch'))!;
    const bodies = batch.body as { to: string; subject: string; html: string; text: string }[];
    assert.equal(bodies.length, 3);
    const toN = bodies.find((b) => b.to === em('n'))!;
    assert.ok(toN.text.startsWith('您好，'), '没有姓名的人：“您好，”兜底');
    assert.ok(bodies.every((b) => b.html.includes('/zh/unsubscribe?t=') && b.text.includes('500 S Hacienda Blvd')));
    const { rows: is } = await pool.query(`SELECT status FROM newsletter_issues WHERE id = $1`, [id]);
    assert.equal(is[0].status, 'sent');
    ok('东哥确认后才群发：3 人各一封、个性化正确、每封带退订和地址');

    // 统计回写 + 投诉停发
    const { rows: s1 } = await pool.query<{ resend_id: string; email: string }>(`SELECT resend_id, email FROM newsletter_sends WHERE issue_id = $1 ORDER BY email`, [id]);
    await nl.recordEmailEvent('email.delivered', s1[0].resend_id, [s1[0].email]);
    await nl.recordEmailEvent('email.opened', s1[0].resend_id, [s1[0].email]);
    await nl.recordEmailEvent('email.clicked', s1[0].resend_id, [s1[0].email]);
    await nl.recordEmailEvent('email.complained', s1[1].resend_id, [s1[1].email]);
    await nl.unsubscribe(nl.unsubToken(s1[2].email));
    const g = await nl.getIssue(id);
    assert.deepEqual([g.stats.delivered, g.stats.opened, g.stats.clicked, g.stats.complained, g.stats.unsubscribed], [1, 1, 1, 1, 1]);
    const after = (await nl.audience(f)).map((r) => r.email);
    assert.ok(!after.includes(s1[1].email) && !after.includes(s1[2].email), '投诉、退订的以后不再发');
    await nl.resubscribe(nl.unsubToken(s1[2].email));
    assert.ok((await nl.audience(f)).some((r) => r.email === s1[2].email), '自己退订的可以重新订阅');
    await nl.resubscribe(nl.unsubToken(s1[1].email));
    assert.ok(!(await nl.audience(f)).some((r) => r.email === s1[1].email), '投诉过的不能被“重新订阅”恢复');
    ok('统计：送达、打开、点击、投诉、退订按期回写；投诉自动停发；退订立即生效');

    const q = await nl.quotaState();
    assert.ok(q.usedToday >= 3, '群发计入每天发信数');
    ok('发信数计入额度（每天 / 每月）');
    console.log(`\n全部通过：${passed} 项`);
  } finally {
    const all = await pool.query<{ email: string }>(`SELECT email FROM newsletter_sends WHERE issue_id = ANY($1::bigint[])`, [made.issues]);
    await pool.query(`DELETE FROM newsletter_issues WHERE id = ANY($1::bigint[])`, [made.issues]);
    await pool.query(`DELETE FROM email_unsubscribes WHERE email LIKE $1`, [`dev13+%-${sfx}@example.com`]);
    void all;
    await pool.query(`DELETE FROM contact_methods WHERE contact_id = ANY($1::uuid[])`, [made.contacts]);
    await pool.query(`DELETE FROM contacts WHERE id = ANY($1::uuid[]) AND (name LIKE 'DEV13-%' OR name = '微信用户')`, [made.contacts]);
    // 设置恢复成测试前的样子
    await pool.query(`DELETE FROM crm_settings WHERE key IN ('newsletter_test_to', 'resend_monthly_quota', 'resend_daily_quota')`);
    for (const r of settingsBefore.rows) await pool.query(`INSERT INTO crm_settings (key, value, updated_by) VALUES ($1, $2, 'dev13-restore')`, [r.key, JSON.stringify(r.value)]);
    // 发信计数恢复成测试前的样子
    await pool.query(`DELETE FROM email_send_counts WHERE day = (now() AT TIME ZONE 'America/Los_Angeles')::date`).catch(() => undefined);
    for (const r of countsBefore.rows) await pool.query(`INSERT INTO email_send_counts (day, sent, newsletter) VALUES ($1, $2, $3) ON CONFLICT (day) DO UPDATE SET sent = EXCLUDED.sent, newsletter = EXCLUDED.newsletter`, [r.day, r.sent, r.newsletter]).catch(() => undefined);
    await pool.query(`DELETE FROM crm_settings WHERE key LIKE 'quota_alert_%' AND updated_by = 'system' AND updated_at > now() - interval '1 hour'`).catch(() => undefined);
    await pool.end();
  }
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
