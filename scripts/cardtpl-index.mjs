// 重新生成 lib/cardtpl/templates/index.ts（加模板：在 templates/ 放一个 tNNN.ts，然后跑 node scripts/cardtpl-index.mjs）
import { readdirSync, writeFileSync } from 'node:fs';
const dir = new URL('../lib/cardtpl/templates/', import.meta.url);
const files = readdirSync(dir).filter((f) => /^t\d{3}\.ts$/.test(f)).sort();
const src =
  '// 自动生成，勿手改：node scripts/cardtpl-index.mjs\n' +
  "import type { CardTemplate } from '../types';\n" +
  files.map((f, i) => `import m${i} from './${f.replace(/\.ts$/, '')}';`).join('\n') +
  `\n\nexport const ALL_TEMPLATES: CardTemplate[] = [${files.map((_, i) => `m${i}`).join(', ')}];\n`;
writeFileSync(new URL('index.ts', dir), src);
console.log(`${files.length} templates`);
