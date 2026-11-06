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
    `${NUM}\\s*/\\s*(?:小时|天|人|位|h\\b)`, // 50/小时、30/人
    // 每小时 50、每人 30（后面不是“点 / 小时 / 人”等计量词，避免“每天 6 小时”“每天 9 点”）
    `(?:每小时|每人|每位)\\s*${NUM}(?!\\s*(?:点|小时|分钟|人|位|场|次|个|天))`
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
      // 句子后半段才带金额（“会员免费，非会员 $30。”）：留前半段并补回句末标点；
      // 金额在句首（“门票 $30，含晚餐。”）：剩下的半句读不通，整句去掉
      const parts = sentence.split(/(?<=[，,、])/);
      const firstBad = parts.findIndex((p) => MONEY_RE.test(p));
      if (firstBad <= 0) return '';
      const end = (sentence.match(/[。！？；;!?.]\s*$/) ?? ['。'])[0].trim();
      return parts.slice(0, firstBad).join('').replace(/[，,、\s]+$/, '') + end;
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
    // 只处理普通对象；Date（pg 返回的时间）、Buffer 等原样返回，否则会被重建成 {}
    if (x && typeof x === 'object' && Object.getPrototypeOf(x) === Object.prototype) {
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
