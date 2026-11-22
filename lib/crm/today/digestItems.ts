/**
 * 每日汇总用的“今天几件事”：直接用「今天」页同一份待办（B 的 registry：B 的待办 + C 的待办），按管理员能看到的全部算。
 */
import { collectToday } from './registry';
import type { DigestItem } from '../staffNotify';

export async function digestItems(now = new Date()): Promise<DigestItem[]> {
  const { items } = await collectToday({ email: 'system', name: '每日汇总', roles: ['admin'] }, { now });
  return items.map((i) => ({ title: i.title, priority: i.priority }));
}
