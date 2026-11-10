/**
 * 名片模板自检出图：每款模板用三套资料（短 / 中 / 长）各出一张，文字超出或重叠时自动缩字重排，仍溢出的列清单。
 * 用法：npx tsx scripts/cardtpl-samples.ts [输出目录] [编号,编号…]
 * 不连数据库，二维码用示例码。
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import QRCode from 'qrcode';
import { ALL_TEMPLATES } from '../lib/cardtpl/registry';
import { closeBrowser, renderCard } from '../lib/cardtpl/render';
import { SAMPLES, cardView } from '../lib/cardtpl/view';

(async () => {
  const out = process.argv[2] || `${homedir()}/Desktop/SAREC-名片-样张`;
  const only = process.argv[3] ? new Set(process.argv[3].split(',').map(Number)) : null;
  mkdirSync(out, { recursive: true });
  const qr = 'data:image/png;base64,' + (await QRCode.toBuffer('https://sinoamericanrec.org/', { margin: 1, width: 360 })).toString('base64');
  const report: string[] = [];
  const list = ALL_TEMPLATES.filter((t) => !only || only.has(t.id)).sort((a, b) => b.id - a.id);
  for (const t of list) {
    for (const [k, label] of [['short', '短'], ['mid', '中'], ['long', '长']] as const) {
      const { buf, fit, ms } = await renderCard(t, cardView(SAMPLES[k], qr), { scale: 1 });
      const name = `${String(t.id).padStart(3, '0')}_${t.name}_${label}.png`;
      writeFileSync(`${out}/${name}`, buf);
      const line = `${t.id}\t${t.name}\t${label}\t${fit.ok ? 'OK' : '仍溢出'}\t${ms}ms\t缩字:${fit.shrunk.join(' | ') || '-'}\t${fit.overflow.join(' | ')}`;
      report.push(line);
      console.log(line);
    }
  }
  writeFileSync(`${out}/_自检结果.tsv`, '编号\t名称\t资料\t结果\t耗时\t缩字的块\t仍溢出\n' + report.join('\n') + '\n');
  await closeBrowser();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
