/**
 * 1.6.0 活动工具：固定文字（主办方数据承诺、报名页告知、模板）。小程序和后台都从这里取，一处改、处处一样。
 * 《主办方数据承诺》按方案 11/23 修正 第 6 条：写清用途、谁能看、怎么导出和删除、哪些必须保留，写参加者本人的权利；不写绝对话。
 * 指挥窗口暂定、东哥可改（文字待东哥过目）。
 */
export const PROMISE_VERSION = '2026-11-23';

export const PROMISE_TITLE = '主办方数据承诺';
export const PROMISE_SECTIONS: { h: string; p: string[] }[] = [
  {
    h: '一、报名信息用来做什么',
    p: [
      '参加者报名你的活动时填的姓名、手机号、人数和报名表里的回答，只用于这场活动的报名、联系、签到和统计。',
      'SAREC 中美房地产商会（下面叫"商会"）只提供报名工具，不会因为参加了你的活动去联系参加者、不会把他们放进商会的跟进名单、群发名单或邮件通讯，也不会给他们记商会积分。'
    ]
  },
  {
    h: '二、谁能看到',
    p: [
      '负责人：能看到你的活动的完整名单，并能导出。',
      '帮手：只能看到现场需要的信息（姓名、手机尾号、人数、是否到场、是否已交费），能签到、能标"已交费"，不能导出全部联系方式。',
      '其他参加者：看不到别人的手机号。接龙名单是否公开称呼由你选；手机号任何时候都不公开。',
      '商会工作人员：平时看不到名单明细。只有在处理举报投诉、你请商会帮忙、系统维护或法律要求时，由指定的管理员查看，每次查看都会记录（谁、何时、为什么）。'
    ]
  },
  {
    h: '三、怎么导出',
    p: [
      '只有负责人能导出名单。导出要在小程序里登录后操作，生成的下载地址 10 分钟内有效、只能下载一次，每次导出都有记录。',
      '导出到你手里的名单，由你自己负责保管，只用于这场活动和与参加者的正常联系，不出售、不转给别人。'
    ]
  },
  {
    h: '四、怎么删除，哪些要保留',
    p: [
      '你可以请商会删除你的某场活动的名单；删除后你和商会都看不到。',
      '为了处理投诉纠纷、防止滥用、配合法律要求，商会可能需要在一段时间内保留必要的记录（例如活动的发布和下架记录、导出记录、举报记录），保留期满后删除。具体保留多久，以商会《隐私保护指引》为准。',
      '停用主办方后，活动会下架，名单仍可以在 30 天内由负责人导出。'
    ]
  },
  {
    h: '五、参加者本人的权利',
    p: [
      '参加者可以在报名页随时取消自己的报名；可以通过主办方或商会查看、更正、删除自己的报名信息；可以举报不当内容。',
      '参加者以后自己报名商会的活动或申请入会，商会只拿到他那时候自己填给商会的信息，不会拿到他在你的活动里的报名表回答和备注。'
    ]
  },
  {
    h: '六、你也要做到',
    p: [
      '活动是真实的线下活动；不发布违法、赌博、色情、虚假内容。',
      '小程序里不收钱：活动收费的，只写"本活动收费，现场交／联系主办方"，不在小程序里放收款码、付款链接、收款账号。名单上的"已交费"是你自己手动标的记号，不是支付确认。',
      '不把名单用于和这场活动无关的推销。'
    ]
  }
];

/** 指令 81：开通页上显示的《主办方数据承诺》要点（短句，全文仍看 PROMISE_SECTIONS / GET /api/v1/org/promise）。改全文时这里一起对一下 */
export const PROMISE_POINTS: string[] = [
  '报名信息只用于这场活动的报名、联系和签到；商会不拿去联系参加者、不放进商会的名单。',
  '完整名单只有负责人能看和导出；帮手只看现场需要的信息；手机号不公开。',
  '参加者可以随时取消报名，可以要求查看、更正、删除自己的信息。',
  '活动要真实；不发违法、赌博、色情、虚假内容；小程序里不收钱、不放收款码。',
  '发布的内容经过安全检测；被举报核实的会下架，严重的停用主办方。'
];

export const promiseText = () => PROMISE_SECTIONS.map((s) => `${s.h}\n${s.p.join('\n')}`).join('\n\n');

/** 报名页按钮上方的告知小字（{org} 换成主办方名字） */
export const disclosure = (org: string) =>
  `报名后，你填的姓名、手机号和人数会提供给主办方「${org}」，只用于这场活动的联系和签到。SAREC 中美房地产商会只提供报名工具，不会因为这场活动联系你。`;

export const FEE_LABEL = {
  free: '免费',
  // 方案 11/23 修正：先按老底线，小程序里不显示金额数字（和指令 49 B1"可写金额"冲突，写进待东哥定）
  onsite: '本活动收费，现场交（详情联系主办方）',
  contact: '本活动收费，详情联系主办方'
} as const;

export type Template = { key: string; label: string; title: string; description: string; capacity: number | null; hours: number; fields: string[]; mode?: 'chain' };
export const TEMPLATES: Template[] = [
  { key: 'talk', label: '讲座', title: '讲座：', description: '欢迎参加本次讲座，现场有问答交流。请准时到场签到。', capacity: 50, hours: 2, fields: ['company'] },
  { key: 'dinner', label: '聚餐', title: '聚餐', description: '一起吃个饭、聊聊天。请报名时写清一共几位，方便订位。', capacity: 20, hours: 2, fields: ['party'] },
  { key: 'cards', label: '牌局', title: '掼蛋局', description: '以牌会友，欢迎新老朋友。请准时到场。', capacity: 16, hours: 3, fields: ['party'] },
  { key: 'tour', label: '看房团', title: '看房团', description: '集合后一起看房，请报名时写清一共几位。', capacity: 20, hours: 3, fields: ['party'] },
  { key: 'outdoor', label: '户外', title: '户外活动', description: '请穿舒适的鞋，注意防晒。', capacity: 30, hours: 3, fields: ['party'] },
  { key: 'other', label: '其他', title: '', description: '', capacity: null, hours: 2, fields: [] }
];
/** 接龙模式的模板（开关 org_chain_on 打开才给） */
export const CHAIN_TEMPLATE: Template = { key: 'chain', label: '接龙', title: '接龙：', description: '群里点开就能接，写一共几位。', capacity: 20, hours: 2, fields: ['party'], mode: 'chain' };

export const FORM_FIELDS: Record<string, string> = { party: '一共几位（含自己）', company: '公司', wechat: '微信号', question: '自定义问题' };

/** 主办方填的字先拦这些（钱、赌、收款相关；和俱乐部组局同一类拦截字） */
export const BANNED = ['收款码', '付款码', '扫码付款', '扫码支付', '转账到', '输赢', '筹码', '彩头', '赌', '博彩', '代购', '返现', '加微信领'];
export function bannedWord(text: string): string | null {
  const t = text.replace(/\s+/g, '');
  return BANNED.find((w) => t.includes(w)) ?? null;
}
