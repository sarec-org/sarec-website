/** 极简模板：{{x}} 转义填字，{{{x}}} 原样，{{#x}}…{{/x}} 有值显示 / 数组逐项，{{^x}}…{{/x}} 没值显示。名字可带点：{{a.b}} */
type Ctx = Record<string, unknown>;
type Node = string | { t: 'v' | 'raw'; k: string } | { t: '#' | '^'; k: string; kids: Node[] };

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function parse(src: string): Node[] {
  const root: Node[] = [];
  const stack: { k: string; kids: Node[] }[] = [{ k: '', kids: root }];
  const re = /\{\{\{\s*([\w.]+)\s*\}\}\}|\{\{\s*([#^/]?)\s*([\w.]+)\s*\}\}/g;
  let last = 0;
  for (let m; (m = re.exec(src)); ) {
    const top = stack[stack.length - 1];
    if (m.index > last) top.kids.push(src.slice(last, m.index));
    last = re.lastIndex;
    if (m[1]) top.kids.push({ t: 'raw', k: m[1] });
    else if (m[2] === '#' || m[2] === '^') {
      const n = { t: m[2] as '#' | '^', k: m[3], kids: [] as Node[] };
      top.kids.push(n);
      stack.push(n);
    } else if (m[2] === '/') {
      if (stack.length < 2 || top.k !== m[3]) throw new Error(`card template: unexpected {{/${m[3]}}}`);
      stack.pop();
    } else top.kids.push({ t: 'v', k: m[3] });
  }
  if (stack.length > 1) throw new Error(`card template: unclosed {{#${stack[stack.length - 1].k}}}`);
  if (last < src.length) root.push(src.slice(last));
  return root;
}

function look(ctxs: Ctx[], k: string): unknown {
  const [h, ...rest] = k.split('.');
  for (let i = ctxs.length - 1; i >= 0; i--) {
    if (ctxs[i] && Object.prototype.hasOwnProperty.call(ctxs[i], h)) {
      let v: unknown = ctxs[i][h];
      for (const r of rest) v = v && typeof v === 'object' ? (v as Ctx)[r] : undefined;
      return v;
    }
  }
  return undefined;
}

const truthy = (v: unknown) => (Array.isArray(v) ? v.length > 0 : !!v);

function run(nodes: Node[], ctxs: Ctx[]): string {
  let out = '';
  for (const n of nodes) {
    if (typeof n === 'string') out += n;
    else if (n.t === 'v') out += esc(look(ctxs, n.k));
    else if (n.t === 'raw') out += String(look(ctxs, n.k) ?? '');
    else if (n.t === '#' || n.t === '^') {
      const v = look(ctxs, n.k);
      if (n.t === '^') {
        if (!truthy(v)) out += run(n.kids, ctxs);
      } else if (Array.isArray(v)) for (const it of v) out += run(n.kids, [...ctxs, (it ?? {}) as Ctx]);
      else if (truthy(v)) out += run(n.kids, typeof v === 'object' ? [...ctxs, v as Ctx] : ctxs);
    }
  }
  return out;
}

const cache = new Map<string, Node[]>();
export function renderTpl(src: string, ctx: Ctx): string {
  let p = cache.get(src);
  if (!p) cache.set(src, (p = parse(src)));
  return run(p, [ctx]);
}
