/**
 * GEO 证据来源(sources)—— P1-1 数据。
 * 仅 lib/geo/content.ts(accessor 层)允许 import 本文件;页面层不得直接 import。
 *
 * ⚠️ 本文件目前仅含 placeholder 占位来源,用于 P1-1 类型与 accessor 验证。
 *    发布前必须替换为经核验的真实来源。
 */
import type { Source } from '../../lib/geo/types';

export const sources: Source[] = [
  {
    id: 'src-placeholder-public-records-001',
    type: 'government',
    name: '公开记录占位来源(待替换)',
    language: 'en',
    reliability: 'low',
    quoteAllowed: false,
    notes:
      'Placeholder source for P1-1 type/accessor validation only. Must be replaced with verified source before publication.'
  },
  {
    id: 'src-placeholder-market-report-001',
    type: 'market-report',
    name: '市场报告占位来源(待替换)',
    language: 'zh',
    reliability: 'medium',
    quoteAllowed: false,
    notes:
      'Placeholder source for P1-1 type/accessor validation only. Must be replaced with verified source before publication.'
  }
];
