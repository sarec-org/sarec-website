/**
 * 联系方式真实性（2026-11-04）集成测试（本地库）。
 * 用法：DATABASE_URL=postgres://postgres@127.0.0.1:5544/sarec_crm_dev pnpm dlx tsx scripts/crm-contact-tests.ts
 * 自建测试数据（随机后缀），不清空其他数据；需已执行 0001–0006。Twilio / 微信接口用本地假响应，不发真短信、不推真消息。
 */
import assert from 'node:assert/strict';
import { createHmac, randomBytes } from 'node:crypto';
import { getPool, withTransaction } from '@/lib/db/client';
import { approveQrLogin, createQrLogin, sendLoginCode, verifyLoginCode } from '@/lib/crm/auth';
import {
  checkPhoneCode,
  confirmEmailToken,
  confirmStillValid,
  getContactInfo,
  issueEmailToken,
  markEmailBounced,
  maskEmail,
  maskPhone,
  sendPhoneCode,
  updateMyContact
} from '@/lib/crm/contactInfo';
import { CrmError } from '@/lib/crm/events';
import { register } from '@/lib/crm/flow';
import { runEventReminders, saveSubscriptions } from '@/lib/crm/reminders';
import { contactDetail, onsiteRegister, searchContacts } from '@/lib/crm/staff';
import { verifySvix } from '@/lib/crm/svix';
import type { Staff } from '@/lib/crm/auth';
import { guardNotProduction } from './_guard';

guardNotProduction();
process.env.CRM_DEV_ECHO_CODES = '1';
const pool = getPool();
const sfx = randomBytes(3).toString('hex');
const P = String(200 + (randomBytes(2).readUInt16BE() % 700)); // 测试号码中段随机，避免与以前的测试数据冲突
let passed = 0;
const ok = (n: string) => {
  passed++;
  console.log(`  ✓ ${n}`);
};
const code = (c: string) => (e: unknown) => e instanceof CrmError && e.code === c;

async function wechatUser(tag: string): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO contacts (name, wechat_openid, acquisition_source) VALUES ('微信用户', $1, 'miniprogram') RETURNING id`,
    [`test-openid-${tag}-${sfx}`]
  );
  return rows[0].id;
}
async function method(contactId: string, kind: 'email' | 'phone') {
  const { rows } = await pool.query<{ id: string; value: string; status: string }>(
    `SELECT id, value, status FROM contact_methods WHERE contact_id = $1 AND kind = $2 AND is_current`,
    [contactId, kind]
  );
  return rows[0];
}

async function main() {
  const starts = new Date(Date.now() + 3 * 86400_000);
  const { rows: ev } = await pool.query<{ id: string; slug: string }>(
    `INSERT INTO events (slug, title, starts_at, ends_at, fee_cents, capacity) VALUES ($1, '联系方式测试讲座', $2, $3, 0, 100) RETURNING id, slug`,
    [`contact-test-${sfx}`, starts, new Date(starts.getTime() + 3 * 3600_000)]
  );
  const slug = ev[0].slug;

  console.log('打码');
  assert.equal(maskPhone('+16265551234'), '+1 626****1234');
  assert.equal(maskPhone('+8613800001111'), '+86 138****1111');
  assert.equal(maskEmail('wangxiaoming@gmail.com'), 'wa***@gmail.com');
  ok('手机、邮箱中间打码');

  console.log('报名必填姓名、手机号、邮箱：只检查格式，不发验证码、不挡报名');
  const a = await wechatUser('a');
  const emailA = `a-${sfx}@example.com`;
  await assert.rejects(register(slug, a, { name: '张三', roleSub: 'agent', phone: '123', email: emailA }), code('bad_phone'));
  await assert.rejects(register(slug, a, { name: '张三', roleSub: 'agent', phone: `626${P}0001`, email: 'not-an-email' }), code('bad_email'));
  await assert.rejects(register(slug, a, { name: '张三', roleSub: 'agent', phone: '', email: emailA }), code('bad_phone'));
  const ra = await register(slug, a, { name: '张三', roleSub: 'agent', phone: `(626) ${P}-0001`, email: emailA.toUpperCase() });
  assert.equal(ra.status, 'registered');
  assert.equal(ra.notify.phone, '+1 626****0001');
  assert.equal(ra.notify.email, maskEmail(emailA));
  assert.equal((await method(a, 'email')).status, 'unconfirmed');
  assert.equal((await method(a, 'phone')).status, 'unconfirmed');
  const { rows: ca } = await pool.query(`SELECT email, phone_e164 FROM contacts WHERE id = $1`, [a]);
  assert.equal(ca[0].email, null, '未验证的邮箱不写进档案身份');
  assert.equal(ca[0].phone_e164, null, '未验证的手机号不写进档案身份');
  ok('格式不对给出提示；格式对直接报名成功，状态为未确认 / 未验证，不进入身份');

  const old = await wechatUser('old');
  const rOld = await register(slug, old, { name: '老版本', roleSub: 'agent' });
  assert.equal(rOld.status, 'registered');
  ok('旧版小程序（不传手机号、邮箱）照常报名（审核期间不受影响）');

  console.log('只有已验证的邮箱 / 手机号才能登录网站、合并档案');
  await sendLoginCode('email', emailA).then(async (s) => {
    const v = await verifyLoginCode('email', emailA, s.devCode!, { name: '网站用户' });
    assert.notEqual(v.contactId, a, '别人填过的未验证邮箱：验证码登录得到的是自己的新档案，不会进入小程序档案');
    await pool.query(`DELETE FROM sessions WHERE contact_id = $1`, [v.contactId]);
    await pool.query(`DELETE FROM contact_methods WHERE contact_id = $1`, [v.contactId]);
    await pool.query(`DELETE FROM profile_answers WHERE contact_id = $1`, [v.contactId]);
    await pool.query(`DELETE FROM contacts WHERE id = $1`, [v.contactId]);
  });
  const qr = await createQrLogin();
  await assert.rejects(approveQrLogin(qr.code, old), code('need_verified'), '只有微信身份：不能扫码登录网站');
  ok('报名填的邮箱未确认前，不能用来登录进入这份档案；只有微信身份不能扫码登录网站');

  console.log('确认邮箱：一键确认 → 已确认，并写进身份（之后可用它登录网站）');
  const tokA = await issueEmailToken(pool, (await method(a, 'email')).id);
  const cf = await confirmEmailToken(tokA);
  assert.equal(cf.ok, true);
  assert.equal((await method(a, 'email')).status, 'confirmed');
  const { rows: ca2 } = await pool.query(`SELECT email, email_verified_at FROM contacts WHERE id = $1`, [a]);
  assert.equal(ca2[0].email, emailA);
  assert.ok(ca2[0].email_verified_at);
  await pool.query(`UPDATE login_codes SET created_at = created_at - interval '2 minutes' WHERE target = $1`, [emailA]);
  const s2 = await sendLoginCode('email', emailA);
  assert.equal((await verifyLoginCode('email', emailA, s2.devCode!)).contactId, a, '确认后用这个邮箱登录网站，进入同一份档案');
  assert.equal((await confirmEmailToken('x'.repeat(32))).ok, false);
  ok('确认后可登录网站并进入同一份档案；无效链接给出提示');

  console.log('确认的邮箱已属于另一份档案：不自动合并，记待人工合并');
  const b = await wechatUser('b');
  await register(slug, b, { name: '李四', roleSub: 'agent', phone: `626${P}0002`, email: emailA });
  const cfb = await confirmEmailToken(await issueEmailToken(pool, (await method(b, 'email')).id));
  assert.equal(cfb.ok, true);
  const { rows: cb } = await pool.query(`SELECT email FROM contacts WHERE id = $1`, [b]);
  assert.equal(cb[0].email, null);
  const { rows: au } = await pool.query(`SELECT 1 FROM crm_audit_log WHERE action = 'merge_needed' AND target_id = $1`, [b]);
  assert.ok(au[0]);
  ok('不凭邮箱自动合并两份档案，交给工作人员核验');

  console.log('Resend 退信 → 无效；下次打开提示修改；修改后重新验证，旧值保留为历史');
  const emailC = `bounce-${sfx}@example.com`;
  const c = await wechatUser('c');
  await register(slug, c, { name: '王五', roleSub: 'agent', phone: `626${P}0003`, email: emailC });
  assert.equal(await markEmailBounced(emailC, '退信（测试）'), 1);
  let info = await getContactInfo(pool, c);
  assert.equal(info.email?.status, 'invalid');
  assert.equal(info.needsUpdate, true);
  const up = await updateMyContact(c, { email: `new-${sfx}@example.com` }, 'http://localhost');
  assert.equal(up.emailChanged, true);
  assert.equal(up.contactInfo.email?.status, 'unconfirmed');
  assert.equal(up.contactInfo.needsUpdate, false);
  const { rows: hist } = await pool.query(`SELECT value, status, is_current FROM contact_methods WHERE contact_id = $1 AND kind = 'email' ORDER BY created_at`, [c]);
  assert.equal(hist.length, 2);
  assert.deepEqual([hist[0].value, hist[0].status, hist[0].is_current], [emailC, 'invalid', false]);
  ok('退信标无效、提示更新；改后为未确认；旧邮箱留在历史');

  const secret = 'whsec_' + Buffer.from('test-secret-key-123456').toString('base64');
  const body = JSON.stringify({ type: 'email.bounced', data: { to: [emailC] } });
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = createHmac('sha256', Buffer.from('test-secret-key-123456')).update(`msg_1.${ts}.${body}`).digest('base64');
  assert.equal(verifySvix(secret, 'msg_1', ts, body, `v1,${sig}`), true);
  assert.equal(verifySvix(secret, 'msg_1', ts, body + ' ', `v1,${sig}`), false);
  assert.equal(verifySvix(secret, 'msg_1', String(Number(ts) - 900), body, `v1,${sig}`), false);
  ok('退信通知签名校验：正确通过、篡改 / 过期拒绝');

  console.log('满 6 个月再确认一次');
  await pool.query(`UPDATE contacts SET contact_info_confirmed_at = now() - interval '7 months' WHERE id = $1`, [c]);
  assert.equal((await getContactInfo(pool, c)).needsReconfirm, true);
  await confirmStillValid(c);
  assert.equal((await getContactInfo(pool, c)).needsReconfirm, false);
  ok('满 6 个月提示；点“没变”记下确认时间');

  console.log('手机号：Twilio 未配置时为“未验证”；配置后首次验证、限频、已验证不再验证');
  await assert.rejects(sendPhoneCode(c), code('sms_unavailable'));
  const realFetch = globalThis.fetch;
  process.env.TWILIO_ACCOUNT_SID = 'ACtest';
  process.env.TWILIO_AUTH_TOKEN = 'test';
  process.env.TWILIO_VERIFY_SERVICE_SID = 'VAtest';
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    const u = String(url);
    if (u.includes('verify.twilio.com')) {
      const p = new URLSearchParams(String(init?.body));
      if (u.endsWith('/VerificationCheck')) return new Response(JSON.stringify({ status: p.get('Code') === '123456' ? 'approved' : 'pending' }), { status: 200 });
      if (/099[89]$/.test(p.get('To') ?? '')) return new Response(JSON.stringify({ code: 60200 }), { status: 400 });
      return new Response(JSON.stringify({ status: 'pending' }), { status: 201 });
    }
    return realFetch(url, init);
  }) as typeof fetch;
  try {
    const sent = await sendPhoneCode(c);
    assert.equal(sent.alreadyVerified, false);
    await assert.rejects(sendPhoneCode(c), code('too_soon'), '60 秒内只能发一次');
    await pool.query(`UPDATE phone_verify_sends SET created_at = created_at - interval '2 minutes' WHERE contact_id = $1`, [c]);
    await assert.rejects(checkPhoneCode(c, '000000'), code('code_wrong'));
    await checkPhoneCode(c, '123456');
    assert.equal((await method(c, 'phone')).status, 'confirmed');
    const { rows: cp } = await pool.query(`SELECT phone_e164, phone_verified_at FROM contacts WHERE id = $1`, [c]);
    assert.equal(cp[0].phone_e164, `+1626${P}0003`);
    assert.ok(cp[0].phone_verified_at);
    // 改成别的号再改回来：已验证过的号码不再验证
    await updateMyContact(c, { phone: `626${P}0004` }, 'http://localhost');
    assert.equal((await method(c, 'phone')).status, 'unconfirmed');
    await updateMyContact(c, { phone: `626${P}0003` }, 'http://localhost');
    assert.equal((await method(c, 'phone')).status, 'confirmed', '已验证过的号码改回来直接算已验证');
    // 一天最多 10 次
    const d = await wechatUser('d');
    await register(slug, d, { name: '赵六', roleSub: 'agent', phone: `626${P}0005`, email: `d-${sfx}@example.com` });
    await pool.query(
      `INSERT INTO phone_verify_sends (phone, contact_id, ok, created_at) SELECT $2, $1, true, now() - interval '2 hours' FROM generate_series(1, 10)`,
      [d, `+1626${P}0005`]
    );
    await assert.rejects(sendPhoneCode(d), code('too_many_attempts'));
    // 号码发不到：标“发送失败”，提示更新
    const e = await wechatUser('e');
    await register(slug, e, { name: '钱七', roleSub: 'agent', phone: `626${P}0999`, email: `e-${sfx}@example.com` });
    await assert.rejects(sendPhoneCode(e), code('sms_failed'));
    assert.equal((await getContactInfo(pool, e)).needsUpdate, true);
    ok('首次验证一次；60 秒一次、一天 10 次；已验证不再验证；发送失败标红');

    // 手机号登录（与邮箱并列）：已验证的号码登录进入同一份档案；发不出时提示改用邮箱
    const lc = await sendLoginCode('sms', `626${P}0003`);
    assert.equal(lc.devCode, undefined, 'Twilio 发码，不回传验证码');
    await assert.rejects(verifyLoginCode('sms', `626${P}0003`, '000000'), code('code_wrong'));
    const sl = await verifyLoginCode('sms', `626${P}0003`, '123456');
    assert.equal(sl.contactId, c, '手机号登录与原档案是同一个人');
    await assert.rejects(sendLoginCode('sms', `626${P}0998`), (e: unknown) => e instanceof CrmError && e.code === 'sms_failed' && e.message === '短信暂时发不出，请改用邮箱验证');
    ok('手机号验证码登录走 Twilio Verify；进入同一档案；发不出提示改用邮箱');
  } finally {
    globalThis.fetch = realFetch;
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_VERIFY_SERVICE_SID;
  }

  console.log('工作人员代录：只按已验证的联系方式认人');
  const staff: Staff = { contactId: a, email: 'staff@example.com', name: '测试', roles: ['admin'] };
  const on1 = await onsiteRegister(staff, ev[0].id, { name: '冒名', phone: `626${P}0001`, roleSub: 'agent' });
  assert.notEqual(on1.contactId, a, '张三的手机号未验证：代录同号不会并进张三的档案');
  const on2 = await onsiteRegister(staff, ev[0].id, { name: '王五', phone: `626${P}0003`, roleSub: 'agent' });
  assert.equal(on2.contactId, c, '王五手机号已验证：代录认到原档案');
  ok('代录不凭未验证的值合并档案');

  console.log('后台客户列表显示邮箱状态；档案里能看到联系方式历史');
  const list = await searchContacts({ q: sfx });
  const rowC = list.find((r) => r.id === c)!;
  assert.equal(rowC.email_status_text, '未确认');
  assert.ok(list.find((r) => r.id === a)!.email_status_text === '已确认');
  const onlyInvalid = await searchContacts({ q: sfx, emailStatus: 'invalid' });
  assert.ok(onlyInvalid.every((r) => r.email_status === 'invalid'));
  const det = await contactDetail(c);
  assert.ok(det.contactMethods.some((m: { is_current: boolean; status: string }) => !m.is_current && m.status === 'invalid'));
  ok('列表按已确认 / 未确认 / 无效显示与筛选；历史可查');

  console.log('微信订阅消息：开课前 1 天、前 2 小时各推一次，不重复');
  await saveSubscriptions(a, slug, ['day_before', 'two_hours']);
  await pool.query(`UPDATE event_reminder_subs SET accepted_at = now() - interval '3 days' WHERE contact_id = $1`, [a]);
  const notConfigured = await runEventReminders(new Date(starts.getTime() - 23 * 3600_000));
  assert.equal(notConfigured.configured, false);
  process.env.WX_APPID = 'wxtest';
  process.env.WX_SECRET = 'test';
  process.env.WX_SUBSCRIBE_TEMPLATES = JSON.stringify({
    day_before: { id: 'TMPL_DAY', fields: { title: 'thing1', time: 'time2', place: 'thing3', note: 'thing4' } },
    two_hours: { id: 'TMPL_2H', fields: { title: 'thing1', time: 'time2', place: 'thing3', note: 'thing4' } }
  });
  const pushed: { template_id: string; data: Record<string, { value: string }> }[] = [];
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    const u = String(url);
    if (u.includes('stable_token')) return new Response(JSON.stringify({ access_token: 'tok', expires_in: 7200 }));
    if (u.includes('subscribe/send')) {
      pushed.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify({ errcode: 0 }));
    }
    return realFetch(url, init);
  }) as typeof fetch;
  try {
    const early = await runEventReminders(new Date(starts.getTime() - 30 * 3600_000));
    assert.equal(pushed.length, 0, '还没到前 1 天，不推');
    void early;
    await runEventReminders(new Date(starts.getTime() - 23 * 3600_000));
    await runEventReminders(new Date(starts.getTime() - 22 * 3600_000));
    assert.equal(pushed.filter((p) => p.template_id === 'TMPL_DAY').length, 1, '前 1 天只推一次');
    await runEventReminders(new Date(starts.getTime() - 110 * 60_000));
    await runEventReminders(new Date(starts.getTime() - 100 * 60_000));
    assert.equal(pushed.filter((p) => p.template_id === 'TMPL_2H').length, 1, '前 2 小时只推一次');
    assert.equal(pushed[0].data.thing1.value, '联系方式测试讲座');
    assert.match(pushed[0].data.time2.value, /^\d{4}年\d{2}月\d{2}日 \d{2}:\d{2}$/);
    await assert.rejects(saveSubscriptions(old, `nope-${sfx}`, ['day_before']), code('not_registered'));
    ok('到点推送、每种只推一次；未报名不能订阅');
  } finally {
    globalThis.fetch = realFetch;
    delete process.env.WX_APPID;
    delete process.env.WX_SECRET;
    delete process.env.WX_SUBSCRIBE_TEMPLATES;
  }

  await withTransaction(async (db) => {
    await db.query(`UPDATE events SET event_status = 'cancelled', is_listed = false WHERE id = $1`, [ev[0].id]);
  });
  console.log(`\n全部通过：${passed} 组联系方式测试`);
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  await pool.end();
  process.exit(1);
});
