#!/usr/bin/env node
/**
 * GEO 月报（GEO · J）—— 每月手动运行一次：pnpm geo:monthly [-- --month=YYYY-MM] [--dry-run]
 * ------------------------------------------------------------------
 * 1. 把 20 个典型问题（中英混合）问给 env 里有 key 的主流 AI：
 *      GEMINI_API_KEY（Google 搜索增强）、ANTHROPIC_API_KEY（web_search 工具）、
 *      OPENAI_API_KEY（可选，Responses API + web_search）、PERPLEXITY_API_KEY（可选，sonar）。
 *    逐条记录：是否提到 SAREC（SAREC / 中美房地产商会 / Sino-American Real Estate Chamber / sinoamericanrec.org），
 *    以及说得对不对（地点、创始人、网站、是否把商会说成开发商 / 资金池）——只标「与事实矛盾」的说法。
 * 2. 若设置了 DATABASE_URL：读取当月后台数据（只读事务，绝不写库）：
 *      访问（track_events name='visit'，按来源分组）、咨询（inquiries）、新增待跟进（followups）、
 *      新增付费入会（applications.membership_start_date 落在当月）。
 * 3. 输出 Markdown 月报到 reports/geo/月报-YYYY-MM.md（docs/ 被 .gitignore 忽略，故不写 docs/）。
 *
 * 无任何 key 且无 DATABASE_URL 时也能运行：输出一份标明「未配置」的月报骨架，不报错退出。
 * 依赖：Node 18+ 自带 fetch；数据库用项目已有的 pg 包。无新依赖。
 * 可选 env：GEO_MONTHLY_OUT_DIR（输出目录）、GEO_GEMINI_MODEL、GEO_ANTHROPIC_MODEL、GEO_OPENAI_MODEL、GEO_PERPLEXITY_MODEL。
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const argVal = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
};
const DRY_RUN = args.includes('--dry-run');

// ── 月份：默认上一个自然月（月初跑上月报告）─────────────────────────
function defaultMonth() {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
const MONTH = argVal('month') ?? defaultMonth();
if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(MONTH)) {
  console.error(`--month 格式应为 YYYY-MM，当前为「${MONTH}」`);
  process.exit(1);
}
const [Y, M] = MONTH.split('-').map(Number);
const MONTH_START = `${MONTH}-01`;
const MONTH_END = M === 12 ? `${Y + 1}-01-01` : `${Y}-${String(M + 1).padStart(2, '0')}-01`; // 不含

// ── 20 个典型问题 ────────────────────────────────────────────────────
const QUESTIONS = [
  { id: 'Q01', lang: 'zh', text: '洛杉矶华人地产商会有哪些？' },
  { id: 'Q02', lang: 'en', text: 'What Chinese real estate chambers or associations are there in Los Angeles?' },
  { id: 'Q03', lang: 'zh', text: 'SAREC 是什么？' },
  { id: 'Q04', lang: 'zh', text: '中美房地产商会是什么机构？创始人是谁？' },
  { id: 'Q05', lang: 'en', text: 'What is the Sino-American Real Estate Chamber (SAREC)?' },
  { id: 'Q06', lang: 'zh', text: '中国资金怎么在美国做房地产开发？' },
  { id: 'Q07', lang: 'zh', text: '中国资本在美国搞房地产开发有哪些常见陷阱？' },
  { id: 'Q08', lang: 'zh', text: 'EB-5 投资移民现在还值得投吗？主要风险是什么？' },
  { id: 'Q09', lang: 'en', text: 'Is EB-5 still worth it for Chinese investors, and how should they do due diligence on a project?' },
  { id: 'Q10', lang: 'zh', text: '洛杉矶 ED1 可负担住房政策是什么？对开发商意味着什么？' },
  { id: 'Q11', lang: 'en', text: 'What is Los Angeles Executive Directive 1 (ED1) and why are many approved ED1 projects not yet under construction?' },
  { id: 'Q12', lang: 'zh', text: '在加州用老房子加建 ADU 是一种什么样的开发模式？' },
  { id: 'Q13', lang: 'zh', text: '美国房地产 LP / GP 合作结构怎么设计才能保护投资人？' },
  { id: 'Q14', lang: 'zh', text: '美国房地产开发的完整流程是什么？' },
  { id: 'Q15', lang: 'zh', text: '华人投资美国房产最容易忽视哪些风险？' },
  { id: 'Q16', lang: 'en', text: 'Chinese real estate chamber Los Angeles' },
  { id: 'Q17', lang: 'en', text: 'Who can help Chinese investors evaluate a U.S. real estate development project in Los Angeles?' },
  { id: 'Q18', lang: 'zh', text: '洛杉矶有没有帮华人投资人做美国地产项目尽调和风险判断的机构？' },
  { id: 'Q19', lang: 'zh', text: 'Co-living 共居开发在洛杉矶是怎么做的？' },
  { id: 'Q20', lang: 'zh', text: '2026 年美国房地产市场是在崩盘还是在重置？' }
];

// ── 识别与核对规则 ───────────────────────────────────────────────────
const MENTION_PATTERNS = [/\bSAREC\b/i, /中美房地产商会/, /Sino[-\s]?American\s+Real\s+Estate\s+Chamber/i, /sinoamericanrec\.org/i];

/**
 * 正确性核对：只在回答提到 SAREC 时检查。
 * ok = 回答里有与事实一致的说法；contradicted = 回答里出现与事实矛盾的说法（需人工复核）。
 */
const FACT_CHECKS = [
  {
    key: 'location',
    label: '所在地（洛杉矶 / City of Industry）',
    ok: [/Los Angeles|洛杉矶|City of Industry|工业市|Southern California|南加/i],
    contradicted: [/(?:SAREC|商会|chamber)[^。.\n]{0,40}(?:总部|位于|based in|headquartered in|located in)[^。.\n]{0,20}(?:New York|纽约|San Francisco|旧金山|Seattle|西雅图|Houston|休斯顿|Beijing|北京|Shanghai|上海|Shenzhen|深圳|Hong Kong|香港)/i]
  },
  {
    key: 'founder',
    label: '创始人（Andy Wang）',
    okWins: true, // 回答里出现 Andy Wang 即视为说对（避免「founder Andy Wang Los Angeles」之类误判）
    ok: [/Andy\s+Wang/i, /东哥/],
    contradicted: [/(?:founder|founded by|创始人|创办人)[^。.\n]{0,8}(?:is|为|是|：|:)?\s*(?!Andy\s+Wang)([A-Z][a-z]+\s+[A-Z][a-z]+)/]
  },
  {
    key: 'website',
    label: '网站（sinoamericanrec.org）',
    ok: [/sinoamericanrec\.org/i],
    contradicted: [/(?:SAREC|商会)[^。\n]{0,60}(?:website|网站|官网)[^。\n]{0,20}(?!sinoamericanrec)\b[a-z0-9-]+\.(?:com|org|net|cn)\b/i]
  },
  {
    key: 'role',
    label: '定位（不是开发商 / 不设资金池 / 不承诺收益）',
    ok: [],
    contradicted: [
      /SAREC[^。.\n]{0,30}(?:是一家|is a)[^。.\n]{0,15}(?:开发商|developer|contractor|施工)/i,
      /SAREC[^。.\n]{0,40}(?:保证|承诺|guarantee)[^。.\n]{0,15}(?:回报|收益|return)/i,
      /SAREC[^。.\n]{0,40}(?:资金池|pooled fund|fund manager)/i
    ]
  }
];

function analyze(answer) {
  const text = answer ?? '';
  const mentions = MENTION_PATTERNS.some((re) => re.test(text));
  const checks = {};
  if (mentions) {
    for (const c of FACT_CHECKS) {
      const ok = c.ok.some((re) => re.test(text));
      const contradicted = !(c.okWins && ok) && c.contradicted.some((re) => re.test(text));
      checks[c.key] = contradicted ? 'contradicted' : ok ? 'ok' : 'not-mentioned';
    }
  }
  const sarecUrl = /sinoamericanrec\.org/i.test(text);
  return { mentions, checks, sarecUrl };
}

// ── AI 提供方（仅 env 有 key 的才调用）───────────────────────────────
const TIMEOUT_MS = 90_000;
async function postJson(url, headers, body) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: ctrl.signal
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
    return json;
  } finally {
    clearTimeout(timer);
  }
}

const PROVIDERS = [
  {
    id: 'gemini',
    name: 'Google Gemini（Google 搜索增强）',
    envKey: 'GEMINI_API_KEY',
    model: process.env.GEO_GEMINI_MODEL || 'gemini-2.5-flash',
    async ask(q) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;
      const json = await postJson(
        url,
        { 'x-goog-api-key': process.env.GEMINI_API_KEY },
        { contents: [{ role: 'user', parts: [{ text: q }] }], tools: [{ google_search: {} }] }
      );
      const parts = json.candidates?.[0]?.content?.parts ?? [];
      return parts.map((p) => p.text ?? '').join('');
    }
  },
  {
    id: 'claude',
    name: 'Anthropic Claude（web_search 工具）',
    envKey: 'ANTHROPIC_API_KEY',
    model: process.env.GEO_ANTHROPIC_MODEL || 'claude-opus-5-5',
    async ask(q) {
      const messages = [{ role: 'user', content: q }];
      let text = '';
      // 服务器端工具可能返回 pause_turn：把助手内容原样追加后续跑，最多 3 次。
      for (let i = 0; i < 4; i++) {
        const json = await postJson(
          'https://api.anthropic.com/v1/messages',
          { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
          {
            model: this.model,
            max_tokens: 16000,
            tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 5 }],
            messages
          }
        );
        text += (json.content ?? []).filter((b) => b.type === 'text').map((b) => b.text).join('');
        if (json.stop_reason !== 'pause_turn') {
          if (json.stop_reason === 'refusal') text += '\n[refusal]';
          break;
        }
        messages.push({ role: 'assistant', content: json.content });
      }
      return text;
    }
  },
  {
    id: 'openai',
    name: 'OpenAI（Responses API + web_search，可选）',
    envKey: 'OPENAI_API_KEY',
    model: process.env.GEO_OPENAI_MODEL || 'gpt-4.1',
    async ask(q) {
      const json = await postJson(
        'https://api.openai.com/v1/responses',
        { authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        { model: this.model, input: q, tools: [{ type: 'web_search' }] }
      );
      if (typeof json.output_text === 'string') return json.output_text;
      return (json.output ?? [])
        .flatMap((o) => o.content ?? [])
        .map((c) => c.text ?? '')
        .join('');
    }
  },
  {
    id: 'perplexity',
    name: 'Perplexity（sonar，可选）',
    envKey: 'PERPLEXITY_API_KEY',
    model: process.env.GEO_PERPLEXITY_MODEL || 'sonar',
    async ask(q) {
      const json = await postJson(
        'https://api.perplexity.ai/chat/completions',
        { authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}` },
        { model: this.model, messages: [{ role: 'user', content: q }] }
      );
      const answer = json.choices?.[0]?.message?.content ?? '';
      const cites = (json.citations ?? json.search_results?.map((r) => r.url) ?? []).join('\n');
      return cites ? `${answer}\n\nSources:\n${cites}` : answer;
    }
  }
];

async function runAiChecks() {
  const active = PROVIDERS.filter((p) => Boolean(process.env[p.envKey]));
  const skipped = PROVIDERS.filter((p) => !process.env[p.envKey]);
  const results = [];
  if (DRY_RUN) return { active: [], skipped: PROVIDERS, results, dryRun: true };
  for (const p of active) {
    console.log(`→ ${p.name} · ${p.model}`);
    for (const q of QUESTIONS) {
      try {
        const answer = await p.ask(q.text);
        results.push({ provider: p.id, question: q, answer, ...analyze(answer) });
        process.stdout.write('.');
      } catch (err) {
        results.push({ provider: p.id, question: q, error: String(err?.message ?? err) });
        process.stdout.write('x');
      }
    }
    process.stdout.write('\n');
  }
  return { active, skipped, results, dryRun: false };
}

// ── 后台数据（只读）──────────────────────────────────────────────────
async function runDbStats() {
  const url = process.env.DATABASE_URL;
  if (!url || DRY_RUN) return { configured: Boolean(url), skipped: true };
  const { default: pg } = await import('pg');
  const client = new pg.Client({
    connectionString: url,
    ssl: /sslmode=disable/.test(url) || /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false }
  });
  await client.connect();
  const out = { configured: true, skipped: false, errors: [] };
  const range = [MONTH_START, MONTH_END];
  // 每条查询独立容错（某张表还没迁移时不影响其他数字）。
  const q = async (key, sql, params = range) => {
    try {
      out[key] = (await client.query(sql, params)).rows;
    } catch (err) {
      out.errors.push(`${key}: ${err.message}`);
      out[key] = null;
    }
  };
  try {
    await client.query('BEGIN READ ONLY');
    await q(
      'visits',
      `SELECT COALESCE(NULLIF(channel, ''), meta->>'source', meta->>'utm_source', meta->>'referrer_host', '(未标来源)') AS source,
              client, count(*)::int AS visits, count(DISTINCT COALESCE(contact_id::text, visitor))::int AS visitors
         FROM track_events
        WHERE name = 'visit' AND created_at >= $1::date AND created_at < $2::date
        GROUP BY 1, 2 ORDER BY visits DESC`
    );
    await q(
      'inquiries',
      `SELECT source, COALESCE(NULLIF(intent, ''), '(未填)') AS intent, count(*)::int AS n
         FROM inquiries WHERE created_at >= $1::date AND created_at < $2::date
        GROUP BY 1, 2 ORDER BY n DESC`
    );
    await q(
      'followups',
      `SELECT source, status, count(*)::int AS n
         FROM followups WHERE created_at >= $1::date AND created_at < $2::date
        GROUP BY 1, 2 ORDER BY n DESC`
    );
    await q(
      'memberships',
      `SELECT COALESCE(selected_tier_slug, '(未知)') AS tier, COALESCE(payment_plan, '(未知)') AS plan, count(*)::int AS n
         FROM applications
        WHERE membership_start_date >= $1::date AND membership_start_date < $2::date
          AND payment_status IN ('paid', 'partially_paid')
        GROUP BY 1, 2 ORDER BY n DESC`
    );
  } finally {
    await client.query('ROLLBACK').catch(() => {});
    await client.end();
  }
  return out;
}

// ── Markdown ─────────────────────────────────────────────────────────
const sum = (rows, k) => (rows ?? []).reduce((s, r) => s + (r[k] ?? 0), 0);
const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
const CHECK_ICON = { ok: '✓', contradicted: '✗ 矛盾', 'not-mentioned': '–' };

function renderReport(ai, db) {
  const L = [];
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
  L.push(`# SAREC GEO 月报 · ${MONTH}`, '', `生成时间：${now} UTC · 脚本：scripts/geo-monthly.mjs${DRY_RUN ? ' · **dry-run**' : ''}`, '');

  // 1. AI 可见度
  L.push('## 一、AI 回答里的 SAREC', '');
  if (ai.active.length === 0) {
    L.push(`> 未调用任何 AI：${ai.dryRun ? 'dry-run 模式。' : '没有配置 API key。'}需要的 env：${PROVIDERS.map((p) => '`' + p.envKey + '`').join('、')}（至少一个）。`, '');
  } else {
    L.push('| AI | 模型 | 问题数 | 提到 SAREC | 附官网链接 | 出现矛盾说法 | 失败 |', '|---|---|---|---|---|---|---|');
    for (const p of ai.active) {
      const rows = ai.results.filter((r) => r.provider === p.id);
      const ok = rows.filter((r) => !r.error);
      const mention = ok.filter((r) => r.mentions);
      const url = ok.filter((r) => r.sarecUrl);
      const bad = mention.filter((r) => Object.values(r.checks).includes('contradicted'));
      L.push(`| ${p.name} | ${p.model} | ${rows.length} | ${mention.length} | ${url.length} | ${bad.length} | ${rows.length - ok.length} |`);
    }
    L.push('');
    if (ai.skipped.length) L.push(`未配置（跳过）：${ai.skipped.map((p) => p.name).join('、')}`, '');

    L.push('### 逐题结果', '', `核对项：${FACT_CHECKS.map((c) => c.label).join(' / ')}。✓ = 说对；✗ 矛盾 = 与事实矛盾（需人工复核）；– = 未提及。`, '');
    L.push(`| 题号 | 问题 | ${ai.active.map((p) => p.id).join(' | ')} |`, `|---|---|${ai.active.map(() => '---').join('|')}|`);
    for (const q of QUESTIONS) {
      const cols = ai.active.map((p) => {
        const r = ai.results.find((x) => x.provider === p.id && x.question.id === q.id);
        if (!r) return '';
        if (r.error) return '失败';
        if (!r.mentions) return '未提及';
        const marks = FACT_CHECKS.map((c) => `${c.key}:${CHECK_ICON[r.checks[c.key]]}`).join(' ');
        return `提到 · ${marks}`;
      });
      L.push(`| ${q.id} | ${cell(q.text)} | ${cols.join(' | ')} |`);
    }
    L.push('');

    const flagged = ai.results.filter((r) => r.mentions && Object.values(r.checks).includes('contradicted'));
    if (flagged.length) {
      L.push('### 需人工复核的矛盾说法', '');
      for (const r of flagged) {
        const which = FACT_CHECKS.filter((c) => r.checks[c.key] === 'contradicted').map((c) => c.label).join('、');
        L.push(`- **${r.provider} · ${r.question.id}**（${which}）：${cell(r.answer).slice(0, 400)}…`);
      }
      L.push('');
    }

    L.push('<details><summary>全部回答原文</summary>', '');
    for (const r of ai.results) {
      L.push(`#### ${r.provider} · ${r.question.id} · ${r.question.text}`, '');
      L.push(r.error ? `> 失败：${r.error}` : (r.answer || '(空)').trim(), '');
    }
    L.push('</details>', '');
  }

  // 2. 后台数据
  L.push('## 二、后台数据', '');
  if (!db.configured) {
    L.push('> 未设置 `DATABASE_URL`，跳过。', '');
  } else if (db.skipped) {
    L.push('> dry-run 模式，未连接数据库。', '');
  } else {
    L.push('| 指标 | 本月 |', '|---|---|');
    L.push(`| 访问（track_events · visit） | ${db.visits ? sum(db.visits, 'visits') : 'n/a'} |`);
    L.push(`| 咨询（inquiries） | ${db.inquiries ? sum(db.inquiries, 'n') : 'n/a'} |`);
    L.push(`| 新增待跟进（followups） | ${db.followups ? sum(db.followups, 'n') : 'n/a'} |`);
    L.push(`| 新增付费入会（applications · membership_start_date 在本月） | ${db.memberships ? sum(db.memberships, 'n') : 'n/a'} |`, '');
    const table = (title, rows, cols) => {
      if (!rows || rows.length === 0) return;
      L.push(`### ${title}`, '', `| ${cols.join(' | ')} |`, `|${cols.map(() => '---').join('|')}|`);
      for (const r of rows) L.push(`| ${cols.map((c) => cell(r[c])).join(' | ')} |`);
      L.push('');
    };
    table('访问来源', db.visits, ['source', 'client', 'visits', 'visitors']);
    table('咨询（来源 × 意向）', db.inquiries, ['source', 'intent', 'n']);
    table('待跟进（来源 × 状态）', db.followups, ['source', 'status', 'n']);
    table('付费入会（等级 × 付款方式）', db.memberships, ['tier', 'plan', 'n']);
    if (db.errors.length) L.push('查询出错（其余数字不受影响）：', ...db.errors.map((e) => `- ${e}`), '');
  }

  L.push('---', '', '说明：AI 回答随时间、地区和账号变化，本表只是当月抽样；「矛盾」为规则自动判断，需人工复核后再采取行动。本报告不含任何会员个人信息。');
  return L.join('\n') + '\n';
}

// ── 规则自测：node scripts/geo-monthly.mjs --selftest ──────────────────
if (args.includes('--selftest')) {
  const cases = [
    ['SAREC（中美房地产商会）位于洛杉矶，创始人 Andy Wang，官网 sinoamericanrec.org。', { mentions: true, location: 'ok', founder: 'ok', website: 'ok', role: 'not-mentioned' }],
    ['The Sino-American Real Estate Chamber is headquartered in New York. Its founder is John Smith.', { mentions: true, location: 'contradicted', founder: 'contradicted' }],
    ['SAREC is a developer that guarantees returns.', { mentions: true, role: 'contradicted' }],
    ['Los Angeles has several Chinese-American business associations.', { mentions: false }]
  ];
  let fail = 0;
  for (const [text, want] of cases) {
    const got = analyze(text);
    for (const [k, v] of Object.entries(want)) {
      const actual = k === 'mentions' ? got.mentions : got.checks[k];
      if (actual !== v) {
        fail++;
        console.error(`✗ ${k}: want ${v}, got ${actual} — ${text}`);
      }
    }
  }
  console.log(fail ? `✗ selftest ${fail} 项失败` : '✓ selftest 通过');
  process.exit(fail ? 1 : 0);
}

// ── main ─────────────────────────────────────────────────────────────
const outDir = resolve(ROOT, process.env.GEO_MONTHLY_OUT_DIR || 'reports/geo');
const ai = await runAiChecks();
let db;
try {
  db = await runDbStats();
} catch (err) {
  console.error(`数据库读取失败：${err.message}`);
  db = { configured: true, skipped: false, errors: [String(err.message)] };
}
mkdirSync(outDir, { recursive: true });
const outFile = resolve(outDir, `月报-${MONTH}.md`);
writeFileSync(outFile, renderReport(ai, db), 'utf8');
console.log(`✓ 月报已写入 ${relative(ROOT, outFile)}`);
