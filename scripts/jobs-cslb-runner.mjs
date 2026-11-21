#!/usr/bin/env node
/**
 * 指令 7 · D20：每周牌照比对的 runner 端（GitHub Actions 上跑：.github/workflows/jobs-cslb-weekly.yml；本地也能手动跑来模拟）。
 * 1) 问服务器要这次要查的牌照号：GET  {BASE}/api/cron/jobs/cslb-ingest?mode=weekly|queued
 * 2) 没有要查的就结束（不下载）；有就流式下载 CSLB 官方 License Master 总表（CSV，几十 MB），只留表头 + 对得上的那几行
 * 3) POST 回服务器 { mode, header, lines, scanned }（scanned = 一共读了多少行，服务器用它判断是不是下完整了）
 *    下载失败：POST { failed:true, error }，服务器记一条待跟进给工作人员。
 * 用法：BASE=https://sinoamericanrec.org SECRET=<密钥> MODE=weekly node scripts/jobs-cslb-runner.mjs
 * 不打印密钥，不打印牌照号以外的任何资料（只打印个数）。没有第三方依赖（Node 20 自带 fetch）。
 */
const CSLB_MASTER_URL = 'https://www.cslb.ca.gov/OnlineServices/DataPortal/DownLoadFile.ashx?fName=MasterLicenseData&type=C';
const BASE = (process.env.BASE || 'https://sinoamericanrec.org').replace(/\/$/, '');
const SECRET = process.env.SECRET || '';
const MODE = process.env.MODE === 'queued' ? 'queued' : 'weekly';
const TIMEOUT_MS = Number(process.env.CSLB_TIMEOUT_MS) || 15 * 60_000;

if (!SECRET) {
  console.log('SECRET not set, skip');
  process.exit(0);
}
const auth = { Authorization: `Bearer ${SECRET}` };
const endpoint = `${BASE}/api/cron/jobs/cslb-ingest`;

async function numbers() {
  const res = await fetch(`${endpoint}?mode=${MODE}`, { headers: auth });
  if (!res.ok) throw new Error(`numbers http ${res.status}`);
  const j = await res.json();
  return new Set((j.numbers || []).map((n) => String(n).replace(/\D/g, '')).filter(Boolean));
}

async function scan(want) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(CSLB_MASTER_URL, { headers: { 'User-Agent': 'SAREC-license-check/1.0' }, signal: ac.signal });
    if (!res.ok || !res.body) throw new Error(`cslb master http ${res.status}`);
    const dec = new TextDecoder();
    let buf = '';
    let header = null;
    let scanned = 0;
    let bytes = 0;
    const lines = [];
    const take = (raw) => {
      const l = raw.replace(/\r$/, '');
      if (!l) return;
      if (header === null) { header = l.replace(/^﻿/, ''); return; }
      scanned++;
      const no = l.slice(0, l.indexOf(',')).replace(/"/g, '').trim();
      if (want.has(no)) lines.push(l);
    };
    for await (const chunk of res.body) {
      bytes += chunk.byteLength;
      buf += dec.decode(chunk, { stream: true });
      const parts = buf.split('\n');
      buf = parts.pop() ?? '';
      for (const p of parts) take(p);
    }
    buf += dec.decode();
    if (buf) take(buf);
    if (header === null) throw new Error('cslb master: empty file');
    return { header, lines, scanned, mb: (bytes / 1e6).toFixed(1) };
  } finally {
    clearTimeout(timer);
  }
}

async function post(body) {
  const res = await fetch(endpoint, { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await res.json().catch(() => ({}));
  return { status: res.status, j };
}

async function main() {
  const want = await numbers();
  console.log(`mode=${MODE} numbers=${want.size}`);
  if (!want.size) return;
  let r;
  try {
    r = await scan(want);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`download failed: ${msg}`);
    await post({ failed: true, error: msg.slice(0, 200) }).catch(() => undefined);
    process.exitCode = 1;
    return;
  }
  console.log(`downloaded ${r.mb}MB rows=${r.scanned} matched=${r.lines.length}`);
  const out = await post({ mode: MODE, header: r.header, lines: r.lines, scanned: r.scanned });
  const { checked, found, notActive } = out.j;
  console.log(`ingest http=${out.status} checked=${checked} found=${found} notActive=${notActive}${out.j.error ? ` error=${out.j.error.message}` : ''}`);
  if (out.status !== 200) process.exitCode = 1;
}

main().catch((e) => {
  console.log(`failed: ${e instanceof Error ? e.message : e}`);
  process.exitCode = 1;
});
