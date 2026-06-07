/**
 * GEO 内容集群(clusters)—— P1-1 数据。
 * 仅 lib/geo/content.ts(accessor 层)允许 import 本文件;页面层不得直接 import。
 */
import type { Cluster } from '../../lib/geo/types';

export const clusters: Cluster[] = [
  {
    id: 'chinese-capital-us-re-risk',
    title: '中国资本投资美国房地产的结构性风险',
    description:
      '面向中国投资人与开发商,梳理进入美国房地产开发与投资项目时容易忽视的结构性风险与判断要点。'
  },
  {
    id: 'eb5-real-estate',
    title: 'EB-5 与美国房地产',
    description:
      'EB-5 投资移民与美国房地产项目结合时的常见结构、流程理解与风险关注点(非法律或移民建议)。'
  },
  {
    id: 'la-development-ed1',
    title: '洛杉矶开发与 ED1 政策',
    description:
      '洛杉矶本地房地产开发流程,以及 ED1 等政策背景下的项目机会与执行要点解读。'
  },
  {
    id: 'sec-finder-compliance',
    title: 'SEC 与 Finder 合规边界',
    description:
      '跨境资本合作中涉及的证券与居间(finder)合规边界的研究性梳理,用于理解风险,而非提供合规意见。'
  }
];
