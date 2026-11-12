/** 1.3.3：活动“一句话介绍”会显示在小程序里，这些词可能影响小程序审核（后台只提醒，不拦截；海报上可以写） */
const MP_SENSITIVE = ['德州扑克', '扑克', '麻将', '赌', '博彩', '彩票', '筹码', '现金', '奖金', '赢钱'];
export function summaryWarn(text: string): string {
  const hits = MP_SENSITIVE.filter((w) => text.includes(w)).filter((w, _i, arr) => !(w === '扑克' && arr.includes('德州扑克')));
  return hits.join('、');
}
