/**
 * 指令 103：讲座结束 2 小时后，工作台「今天」出一条「上传这场的课件」——这场还没挂课件、14 天内、没点过「这场没有课件」。
 * 点进去直达这场活动页的「传课件」（网站 /zh/staff/events/<id>?slides=1；小程序工作台活动页）。挂上课件后下一次读就没有了。
 */
import { eventsNeedingSlides, md } from '@/lib/docs/slides';
import { PRIORITY, type TodayItem, type TodayProvider } from '../types';

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) + '…' : s);

export const slidesProvider: TodayProvider = {
  kind: 'slides_upload',
  roles: ['ops'],
  async list(ctx): Promise<TodayItem[]> {
    const rows = await eventsNeedingSlides(ctx.now);
    return rows.map((e) => {
      const href = `/zh/staff/events/${e.id}?slides=1`;
      return {
        id: `slides:${e.id}`,
        kind: 'slides_upload' as const,
        priority: PRIORITY.review + 50,
        title: `上传这场的课件：${md(e.starts_at)}「${clip(e.title, 30)}」`,
        suggestion: '讲座结束了，把讲者的 PPT 另存为 PDF 传上来，大家就能在小程序里看、下载、转发；这场没有课件就点「这场没有课件」',
        actions: [
          { type: 'link' as const, label: '上传这场的课件', href, primary: true },
          { type: 'post' as const, label: '这场没有课件', endpoint: `/api/v1/staff/events/${e.id}/slides`, body: { skip: true }, done: '好的，这场不再提醒' }
        ],
        href,
        tags: ['课件'],
        at: new Date(e.starts_at).toISOString()
      };
    });
  }
};

export const SLIDES_PROVIDERS: TodayProvider[] = [slidesProvider];
