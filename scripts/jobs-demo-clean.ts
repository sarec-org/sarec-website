/**
 * 清理找工人 · 接活 演示数据（scripts/jobs-demo-seed.ts 放的）。只能对测试库跑。
 * 按「演示-」前缀（且邮箱是 demo-jobs-…@example.com）找身份；也可以在后面给 ID（身份 / 接活人 / 活儿），只删名字以「演示-」开头的。
 * 用法：DATABASE_URL=<测试库> pnpm dlx tsx scripts/jobs-demo-clean.ts --i-know-this-is-not-production [ID ...]
 */
import { getPool } from '@/lib/db/client';
import { guardNotProduction } from './_guard';
import { assertTestDb, removeDemo } from './jobs-demo-lib';

guardNotProduction();
assertTestDb();
const ids = process.argv.slice(2).filter((a) => !a.startsWith('--'));
removeDemo(getPool(), ids)
  .then((r) => console.log('已删除：', r))
  .catch((e) => { console.error('✗ 失败：', e); process.exitCode = 1; })
  .finally(() => getPool().end());
