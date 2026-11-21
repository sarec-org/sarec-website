/**
 * 子任务 C 的待办来源放这里（入会 3 天未缴费、筹备清单今天到期、照片名片待审、重复档案待确认、投诉、失败异常）
 * 和「今天现场」。接口见 ../types.ts。B 只留空数组，C 往里加，合并不冲突。
 */
import type { TodayLiveProvider, TodayProvider } from '../types';

export const C_PROVIDERS: TodayProvider[] = [];
export const C_LIVE_PROVIDERS: TodayLiveProvider[] = [];
