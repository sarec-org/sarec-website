/**
 * 双语地基(阶段① · 数据化双写,先不接 i18n 框架)
 * ------------------------------------------------------------------
 * 所有"人能看到的字符串"用 LocalizedText { zh, en } 数据化双写。
 * 阶段①渲染只读 .zh(英文躺在数据里不渲染,预览页除外)。
 * 阶段 1.5 接 next-intl 时,这些双语对象平移进字典文件,组件零返工。
 *
 * ⚠️ 函数命名为 localize(),不要用 t() —— 避免与 next-intl 的 t() 冲突。
 */

export type Locale = 'zh' | 'en';

export type LocalizedText = { zh: string; en: string };

/** 路由方案 A:阶段①只填 zh,en 阶段 1.5 再补;组件阶段①一律读 route.zh */
export type LocalizedRoute = { zh: string; en?: string };

/** 取某语言文案,缺省回退到中文 */
export const localize = (x: LocalizedText, locale: Locale = 'zh'): string => x[locale] ?? x.zh;
