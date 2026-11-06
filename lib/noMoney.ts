/**
 * 小程序 1.2 不显示任何价格或金额：工作人员写的文字（活动简介、会议室介绍 / 设备）给小程序时，逐句去掉带金额的句子。
 * 网站照常显示原文。
 */
const NUM = '(?:\\d[\\d,.]*|[零一二两三四五六七八九十百千万]+)';
const MONEY_RE = new RegExp(
  [
    '[$＄￥¥]\\s*\\d', // $30、￥200
    `${NUM}\\s*(?:美元|美金|元|块钱|刀|dollars?|usd|rmb|bucks)`, // 30 美元、三十元、30 dollars
    `${NUM}\\s*块(?=[\\s，。,.;；!！?？)）]|$)`, // “30 块”，但不是“3 块地”
    '(?:usd|rmb)\\s*\\d',
    `(?:会费|票价|门票|入场费|报名费|收费标准|价格|费用)\\s*[:：为是]?\\s*${NUM}`, // 入场费 30、费用：200
    '会费|票价|收费标准',
    `${NUM}\\s*(?:/|每)\\s*(?:小时|天|人|位|h\\b)`, // 50/小时、30 每人
    '(?:每小时|每天|每人)\\s*' + NUM
  ].join('|'),
  'i'
);

export function hasMoney(text: string): boolean {
  return MONEY_RE.test(text);
}

/** 逐句（。！？；换行，以及“，”分隔的短句）去掉带金额的部分；全部去掉时返回 null */
export function noMoney(text: string | null | undefined): string | null {
  if (!text) return text ?? null;
  if (!MONEY_RE.test(text)) return text;
  const kept = text
    .split(/(?<=[。！？；;!?\n]|\.\s)/)
    .map((sentence) => {
      if (!MONEY_RE.test(sentence)) return sentence;
      // 句子里只有一小段带金额（“会员免费，非会员 $30。”）：按逗号再切，留下不带金额的部分
      const parts = sentence.split(/(?<=[，,、])/).filter((p) => !MONEY_RE.test(p));
      return parts.join('');
    })
    .join('')
    .replace(/[，,、；;\s]+([。！？!?])/g, '$1')
    .replace(/[，,、；;\s]+$/, '')
    .trim();
  return kept || null;
}

/** 递归处理对象里所有 summary 字段（活动列表、首页服务台） */
export function noMoneySummaries<T>(v: T): T {
  const walk = (x: unknown): unknown => {
    if (Array.isArray(x)) return x.map(walk);
    if (x && typeof x === 'object') {
      const o: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(x as Record<string, unknown>)) {
        o[k] = k === 'summary' && (typeof val === 'string' || val === null) ? noMoney(val as string | null) : walk(val);
      }
      return o;
    }
    return x;
  };
  return walk(v) as T;
}
