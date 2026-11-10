/**
 * 名片模板库：一个模板一个文件（templates/tNNN.ts），主程序只读这个接口。
 * html 是卡面内部结构（照设计稿），用 {{key}} 填字、{{#key}}…{{/key}} 有值才显示 / 列表逐项、{{^key}}…{{/key}} 没值才显示、{{{key}}} 原样插入（已生成好的标签）。
 * 可用的字段见 view.ts 的 CardView。css 只写本模板自己的样式（选择器以 .<cls> 开头），公共样式在 base.ts。
 */
export type CardTemplate = {
  id: number; // 编号，与设计稿一致
  name: string;
  desc: string;
  cat: string; // 分类：商务精选 / 商务经典 / 设计经典 / 大胆款 / 第一批
  batch: number; // 上线批次：1 = 67–105，2 = 1–66
  cls: string; // 卡面根元素 class（设计稿里的 d1 / q3 / k12 …）
  css: string;
  html: string;
};
