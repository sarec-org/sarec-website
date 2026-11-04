/**
 * 题库 V1.1 第九部分验收例子 1–7 + V3.1 入场判断 / 核款 / 会议室先定先得。
 * 用法：DATABASE_URL=postgres://... pnpm dlx tsx scripts/crm-acceptance.ts
 * 只在本地或测试库运行：会清空 CRM 相关表。
 */
import assert from 'node:assert/strict';
import { getPool, withTransaction } from '@/lib/db/client';
import {
  checkIn,
  findOrCreateContact,
  getEventBySlug,
  startRegistration,
  submitAnswers,
  verifyPayment,
  type EventRow
} from '@/lib/crm/events';
import { afterRequiredMessage, itemBadge } from '@/lib/crm/engine';
import { pointsBalance, profileCenterTask, recordAnswer, recordSkip, type Task } from '@/lib/crm/profile';
import { bookRoom } from '@/lib/crm/rooms';
import type { AnswerValue } from '@/lib/crm/questionBank';

const pool = getPool();
let passed = 0;
function ok(name: string) {
  passed++;
  console.log(`  ✓ ${name}`);
}

async function reset() {
  await pool.query(`TRUNCATE points_ledger, profile_skips, profile_settlements, profile_answers, profile_tasks,
    room_bookings, room_passes, rooms, orders, registrations, events, contact_tags, contact_companies, companies,
    sessions, login_codes, crm_audit_log RESTART IDENTITY CASCADE`);
  await pool.query(`DELETE FROM applications; DELETE FROM contacts;`);
  const now = Date.now();
  await pool.query(
    `INSERT INTO events (slug, title, starts_at, ends_at, topic_tags, fee_cents, capacity) VALUES
     ('adu-talk', 'ADU 加建讲座', $1, $2, '{adu}', 0, 100),
     ('ai-course', 'AI 收费课程', $1, $2, '{ai}', 5000, 30),
     ('loan-talk', '贷款讲座', $1, $2, '{financing}', 0, NULL),
     ('tiny', '小班', $1, $2, '{}', 0, 1)`,
    [new Date(now + 864e5), new Date(now + 864e5 + 7200e3)]
  );
  await pool.query(`INSERT INTO rooms (name, hourly_cents) VALUES ('大会议室', 5000)`);
}

const tx = withTransaction;
const ev = async (slug: string) => (await getEventBySlug(pool, slug)) as EventRow;
const A = (code: string, value: AnswerValue) => ({ code, value });

async function newcomer(name: string, phone: string, sub: string, category: string) {
  return tx(async (db) => {
    const c = await findOrCreateContact(db, { phone }, name);
    const out = await startRegistration(db, await ev('adu-talk'), c.id);
    await submitAnswers(db, c.id, out.task, [
      A('Q01', { text: name }),
      A('Q02', { phone }),
      A('Q03', { category, sub })
    ]);
    return { id: c.id, task: out.task, required: out.required };
  });
}

async function taskOf(contactId: string, slug: string): Promise<Task> {
  const e = await ev(slug);
  const { rows } = await pool.query<Task>(`SELECT * FROM profile_tasks WHERE contact_id = $1 AND event_id = $2`, [contactId, e.id]);
  return rows[0];
}

async function main() {
  await reset();

  console.log('例 1：新人首次报名，填写 6 项，获得 30 积分');
  {
    const p = await newcomer('张三', '+16265550001', 'investor', 'owner_investor');
    assert.equal(p.required.length, 0, '首次报名不出额外必答');
    assert.equal(await pointsBalance(pool, p.id), 0);
    let t = await taskOf(p.id, 'adu-talk');
    assert.equal(afterRequiredMessage(t), '报名已完成！继续填写，每项奖励 10 积分');
    assert.deepEqual(itemBadge(t, false), { label: '+10', points: 10 });
    await tx((db) => submitAnswers(db, p.id, t, [A('Q07', { choices: ['东区（核桃、钻石吧、罗兰岗等）', '橙县'] }), A('R11', { choices: ['买房出租'] })]));
    await recordSkip(pool, p.id, t.id, 'Q05');
    t = await taskOf(p.id, 'adu-talk');
    await tx((db) => submitAnswers(db, p.id, t, [A('S01', { text: '做出租房投资，想找东区的项目' })]));
    assert.equal(await pointsBalance(pool, p.id), 30);
    ok('前 3 项 0 分，后 3 项合计 30 分；Q05 跳过不发分');
  }

  console.log('例 2：老会员报名 ADU 讲座，3 项必答 + 2 项选填，获得 20 积分');
  {
    const p = await tx(async (db) => {
      const c = await findOrCreateContact(db, { phone: '+16265550002' }, '李四');
      const out = await startRegistration(db, await ev('loan-talk'), c.id);
      await submitAnswers(db, c.id, out.task, [
        A('Q01', { text: '李四' }), A('Q02', { phone: '+16265550002' }), A('Q03', { category: 'owner_investor', sub: 'owner' }),
        A('Q04', { choices: ['没有其他角色'] }), A('Q05', { choice: '洛杉矶县' }), A('Q06', { choices: ['不经常往返'] }),
        A('Q07', { choices: ['南湾'] }), A('Q10', { choices: ['目前没有'] }), A('Q11', { choice: '刚开始了解' }),
        A('Q12', { text: '个人/自由职业' }), A('Q13', { choices: ['微信'] })
      ]);
      return c.id;
    });
    const before = await pointsBalance(pool, p);
    const reg = await tx(async (db) => startRegistration(db, await ev('adu-talk'), p));
    assert.deepEqual(reg.required.map((q) => q.code).sort(), ['Q08', 'Q09', 'R01']);
    assert.ok(reg.required.some((q) => q.code === 'R01'), 'ADU 主题 + 自住业主角色 → R01 出现在必答');
    await tx((db) => submitAnswers(db, p, reg.task, [A('R01', { choice: '有，一年内想做' }), A('Q08', { choices: ['ADU 加建'] }), A('Q09', { choices: ['寻找设计或工程'] })]));
    const t = await taskOf(p, 'adu-talk');
    await tx((db) => submitAnswers(db, p, t, [A('R02', { choice: '独栋' }), A('C02', { month: 5, day: 12 })]));
    assert.equal((await pointsBalance(pool, p)) - before, 20);
    ok('必答 0 分，选填 2 项 +20');
  }

  console.log('例 3：中途退出、重复扫码、重复提交');
  {
    const p = await newcomer('王五', '+16265550003', 'agent', 'transaction');
    const first = await tx(async (db) => startRegistration(db, await ev('loan-talk'), p.id));
    assert.equal(first.required.length, 3);
    await tx((db) => submitAnswers(db, p.id, first.task, first.required.slice(0, 2).map((q) => A(q.code, q.options ? { choices: [q.options[0]] } : { text: '测试内容' }))));
    const again = await tx(async (db) => startRegistration(db, await ev('loan-talk'), p.id));
    assert.equal(again.task.id, first.task.id, '同一活动只有一个任务');
    assert.equal(again.alreadyRegistered, true);
    assert.equal(again.required.length, 1, '直接进入第 3 道必答');
    await tx((db) => submitAnswers(db, p.id, again.task, again.required.map((q) => A(q.code, q.options ? { choices: [q.options[0]] } : { text: '测试内容' }))));
    const t = await taskOf(p.id, 'loan-talk');
    const before = await pointsBalance(pool, p.id);
    await tx((db) => submitAnswers(db, p.id, t, [A('C06', { choices: ['普通话'] })]));
    await tx((db) => submitAnswers(db, p.id, t, [A('C06', { choices: ['普通话', '英文'] })]));
    assert.equal((await pointsBalance(pool, p.id)) - before, 10);
    const { rows } = await pool.query(`SELECT count(*)::int n FROM points_ledger WHERE contact_id = $1 AND event_key LIKE '%:C06'`, [p.id]);
    assert.equal(rows[0].n, 1);
    ok('接续原进度，不重开前 3 项；重复提交不重复发分');
  }

  console.log('例 4：已报名会员到场签到');
  {
    const { rows } = await pool.query<{ id: string }>(`SELECT id FROM contacts WHERE name = '张三'`);
    const r1 = await tx(async (db) => checkIn(db, await ev('adu-talk'), rows[0].id));
    assert.equal(r1.kind, 'checked_in');
    const r2 = await tx(async (db) => checkIn(db, await ev('adu-talk'), rows[0].id));
    assert.equal(r2.kind, 'already');
    const { rows: pts } = await pool.query(`SELECT count(*)::int n FROM points_ledger WHERE contact_id = $1 AND category = 'checkin'`, [rows[0].id]);
    assert.equal(pts[0].n, 1);
    ok('扫码即签到，重复扫码不重复签到、不重复发分');
  }

  console.log('例 5：适用的未填核心资料只剩 2 项');
  {
    const p = await tx(async (db) => {
      const c = await findOrCreateContact(db, { email: 'five@example.com' }, 'Alice');
      const out = await startRegistration(db, await ev('loan-talk'), c.id);
      await submitAnswers(db, c.id, out.task, [
        A('Q01', { text: 'Alice' }), A('Q02', { email: 'five@example.com' }), A('Q03', { category: 'other', sub: 'other' }),
        A('Q04', { choices: ['没有其他角色'] }), A('Q05', { choice: '橙县' }), A('Q06', { choices: ['上海'] }),
        A('Q07', { choices: ['橙县'] }), A('Q08', { choices: ['商业地产'] }), A('Q09', { choices: ['目前没有具体需求'] }),
        A('Q10', { choices: ['目前没有'] }), A('Q11', { choice: '刚开始了解' })
      ]);
      return c.id;
    });
    const reg = await tx(async (db) => startRegistration(db, await ev('adu-talk'), p));
    assert.deepEqual(reg.required.map((q) => q.code).sort(), ['Q12', 'Q13'], '“其他”角色核心为 13 项，只剩 2 道');
    await tx((db) => submitAnswers(db, p, reg.task, [A('Q12', { text: 'ABC 地产 经理' }), A('Q13', { choices: ['邮件'] })]));
    let t = await taskOf(p, 'adu-talk');
    assert.equal(afterRequiredMessage(t), '报名已完成！再完成 1 项，之后每项奖励 10 积分');
    const before = await pointsBalance(pool, p);
    await tx((db) => submitAnswers(db, p, t, [A('C06', { choices: ['英文'] })]));
    t = await taskOf(p, 'adu-talk');
    await tx((db) => submitAnswers(db, p, t, [A('C03', { choice: '朋友推荐' })]));
    assert.equal((await pointsBalance(pool, p)) - before, 10);
    ok('不凑第 3 道必答；第一道选填补名额 0 分，第二道 +10');
  }

  console.log('例 6：多选、否定回答、暂不方便提供、自我介绍与 AI 提取');
  {
    const p = await newcomer('赵六', '+16265550006', 'developer', 'developer');
    const t = await taskOf(p.id, 'adu-talk');
    const r = await tx((db) =>
      submitAnswers(db, p.id, t, [
        A('Q07', { choices: ['橙县', '南湾', '北加州', '德州'] }),
        A('Q09', { choices: ['目前没有具体需求'] }),
        A('Q12', { text: '暂不方便提供' }),
        A('S01', { text: '做多户开发，在找出资人' })
      ])
    );
    assert.equal(r.pointsAwarded, 30, '多选算 1 项、否定回答同样 +10、暂不方便提供 0 分、自我介绍 +10');
    await tx(async (db) => {
      const task = await profileCenterTask(db, p.id);
      const x = await recordAnswer(db, { contactId: p.id, task, itemCode: 'Q06', value: { choices: ['上海'] }, source: 'ai_confirmed', settle: false });
      assert.equal(x.pointsAwarded, 0, 'AI 提取经确认不单独加分');
    });
    const before = await pointsBalance(pool, p.id);
    const center = await tx((db) => profileCenterTask(db, p.id));
    await tx((db) => submitAnswers(db, p.id, center, [A('Q12', { text: 'Zhao Development 总经理' })]));
    assert.equal((await pointsBalance(pool, p.id)) - before, 10, '待补的题补成真实答案，按原位置（第 6 项）发 +10');
    ok('多选/否定/待补/自我介绍/AI 提取全部按表结算');
  }

  console.log('例 7：本人新回答与工作人员旧备注冲突');
  {
    const { rows } = await pool.query<{ id: string }>(`SELECT id FROM contacts WHERE name = '王五'`);
    const id = rows[0].id;
    const { rows: pre } = await pool.query(`SELECT count(*)::int n FROM profile_answers WHERE contact_id = $1 AND item_code = 'Q05'`, [id]);
    await tx(async (db) => {
      const task = await profileCenterTask(db, id);
      await recordAnswer(db, { contactId: id, task, itemCode: 'Q05', value: { choice: '橙县', detail: '尔湾' }, source: 'staff', recordedBy: 'staff:小李' });
      await recordAnswer(db, { contactId: id, task, itemCode: 'Q05', value: { choice: '洛杉矶县', detail: '阿卡迪亚' }, source: 'self_select' });
      const r = await recordAnswer(db, { contactId: id, task, itemCode: 'Q05', value: { choice: '橙县' }, source: 'staff', recordedBy: 'staff:小李' });
      assert.equal(r.stored, 'pending_confirm', '工作人员记录不覆盖本人确认');
    });
    const { rows: cur } = await pool.query(`SELECT value, source FROM profile_answers WHERE contact_id = $1 AND item_code = 'Q05' AND status = 'current'`, [id]);
    assert.equal(cur[0].value.detail, '阿卡迪亚');
    const { rows: hist } = await pool.query(`SELECT count(*)::int n FROM profile_answers WHERE contact_id = $1 AND item_code = 'Q05'`, [id]);
    assert.equal(hist[0].n, pre[0].n + 3, '历史全部保留');
    ok('本人新回答成为当前值；工作人员新记录标“待本人确认”；历史保留');
  }

  console.log('补充：前 3 名额内的题删除重填仍 0 分');
  {
    const { rows } = await pool.query<{ id: string }>(`SELECT id FROM contacts WHERE name = '张三'`);
    const id = rows[0].id;
    await pool.query(`UPDATE profile_answers SET status = 'history' WHERE contact_id = $1 AND item_code = 'Q03'`, [id]);
    const before = await pointsBalance(pool, id);
    const center = await tx((db) => profileCenterTask(db, id));
    await tx((db) => submitAnswers(db, id, center, [A('Q03', { category: 'owner_investor', sub: 'investor' })]));
    assert.equal(await pointsBalance(pool, id), before);
    ok('结算记录保留，不重开奖励');
  }

  console.log('补充：收费活动入场判断与核款');
  {
    const { rows } = await pool.query<{ id: string }>(`SELECT id FROM contacts WHERE name = '李四'`);
    const id = rows[0].id;
    const reg = await tx(async (db) => startRegistration(db, await ev('ai-course'), id));
    assert.ok(reg.orderNo);
    const r = await tx(async (db) => checkIn(db, await ev('ai-course'), id));
    assert.equal(r.kind, 'pending_payment', '未付款不显示签到成功');
    assert.equal(await verifyPayment(reg.orderNo!, 'finance', 'ZELLE-123'), true);
    assert.equal(await verifyPayment(reg.orderNo!, 'finance', 'ZELLE-123'), false, '重复确认不重复处理');
    const { rows: rg } = await pool.query(`SELECT arrival_status FROM registrations r JOIN events e ON e.id = r.event_id WHERE e.slug = 'ai-course' AND contact_id = $1`, [id]);
    assert.equal(rg[0].arrival_status, 'checked_in', '核款后到场待处理的人自动完成签到');
    ok('已报名 ≠ 已付款；核款后完成签到');
  }

  console.log('补充：满员候补与现场临时报名');
  {
    const ids = (await pool.query<{ id: string }>(`SELECT id FROM contacts ORDER BY created_at LIMIT 2`)).rows.map((r) => r.id);
    const a = await tx(async (db) => checkIn(db, await ev('tiny'), ids[0]));
    assert.equal(a.kind, 'checked_in', '老会员现场临时报名 + 签到一次完成');
    const b = await tx(async (db) => checkIn(db, await ev('tiny'), ids[1]));
    assert.equal(b.kind, 'waitlisted', '满员不放行');
    ok('名额已满时显示实际状态');
  }

  console.log('补充：会议室先定先得');
  {
    const ids = (await pool.query<{ id: string }>(`SELECT id FROM contacts ORDER BY created_at LIMIT 2`)).rows.map((r) => r.id);
    const s = new Date(Date.UTC(2026, 11, 1, 18)), e = new Date(Date.UTC(2026, 11, 1, 20));
    let n = 0;
    const no = () => `T-${++n}`;
    const x = await tx((db) => bookRoom(db, { contactId: ids[0], roomId: 1, startsAt: s, endsAt: e, orderNo: no }));
    assert.equal(x.kind, 'held');
    const y = await tx((db) => bookRoom(db, { contactId: ids[1], roomId: 1, startsAt: new Date(s.getTime() + 3600e3), endsAt: new Date(e.getTime() + 3600e3), orderNo: no }));
    assert.equal(y.kind, 'taken');
    ok('同一时段只能一个预约');
  }

  console.log(`\n全部通过：${passed} 组验收`);
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  await pool.end();
  process.exit(1);
});
