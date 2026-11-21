/** 找工人 · 接活儿：网站页面里的点选选项（身份、工种、城市、时间等从 /api/v1/jobs/meta 的 options 来；这里只放 meta 没有的） */
export const BUDGETS = ['$500 以下', '$500–2,000', '$2,000–10,000', '$10,000–50,000', '$50,000 以上', '还不确定'];
export const HEADCOUNTS = [{ key: '1', label: '1 人' }, { key: '2', label: '2 人' }, { key: '3', label: '3 人' }, { key: '5', label: '4–6 人' }, { key: '8', label: '7 人以上' }];
export const DURATIONS = ['1 天', '2–3 天', '1 周以内', '1 个月以内', '1 个月以上'];
export const YEARS = [{ key: '1', label: '1 年以内' }, { key: '3', label: '1–3 年' }, { key: '5', label: '3–5 年' }, { key: '10', label: '5–10 年' }, { key: '15', label: '10 年以上' }];
export const TEAM_SIZES = [{ key: '1', label: '1 人' }, { key: '3', label: '2–5 人' }, { key: '8', label: '6–10 人' }, { key: '15', label: '11–20 人' }, { key: '30', label: '20 人以上' }];
export const PRO_ROLE_HINT: Record<string, string> = {
  company: '有加州承包商牌照的公司或施工队',
  licensed: '自己持有执照的个人师傅',
  pro_service: '设计、测量、检查、律师、会计等专业服务',
  worker: '跟施工队干活的工人，免费登记，不用填牌照'
};
export const POST_STATUS_LABEL: Record<string, string> = { open: '找人中', found: '已找到', closed: '已关闭', removed: '已下架' };
export const PRO_STATUS_LABEL: Record<string, string> = { draft: '还没提交', pending: '核验中', verified: '核验通过', returned: '已退回', removed: '已下架' };
