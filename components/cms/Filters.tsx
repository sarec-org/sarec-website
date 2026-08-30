'use client';

/**
 * CMS V2 列表筛选 —— 可选工具,不强迫先选。
 * ------------------------------------------------------------------
 * ⚠️ 组件不带任何自有样式:全部 className 由调用方传入,一律指向页面自己
 *    CSS module 里的既有规格(.filterBtn 的字体规格 = 该页 .eyebrow)。
 * 设计取舍:卡片本身仍是 Server Component,这里只接收已渲染好的 node 数组
 * 加上用于过滤的标量维度,客户端只管切换显示 —— 整片列表不进客户端 bundle,
 * 且无任何数据请求,页面仍是 SSG。
 *
 * ⚠️ 会员项目筛选只开放「地区 / 类型」两个维度。
 *    项目阶段(stage)刻意不做筛选:按阶段筛项目是挂牌板的典型形态特征,属合规红线。
 */
import { useState, type ReactNode } from 'react';

export type FilterOption = { value: string; label: string };
export type FilterClasses = {
  row: string;
  btn: string;
  btnActive: string;
  stack: string;
  empty: string;
};

const ALL = '__all__';

function Chips({
  options,
  active,
  onChange,
  label,
  classes
}: {
  options: FilterOption[];
  active: string;
  onChange: (v: string) => void;
  label: string;
  classes: FilterClasses;
}) {
  return (
    <div className={classes.row} role="group" aria-label={label}>
      <button
        type="button"
        className={`${classes.btn} ${active === ALL ? classes.btnActive : ''}`}
        aria-pressed={active === ALL}
        onClick={() => onChange(ALL)}
      >
        全部
      </button>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`${classes.btn} ${active === o.value ? classes.btnActive : ''}`}
          aria-pressed={active === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** 新闻流:单维分类筛选(含「活动回顾」—— 该值只存在于展示层,不是 news 分类)。 */
export function FilterableStream({
  options,
  items,
  classes,
  emptyText = '暂无符合条件的内容。'
}: {
  options: FilterOption[];
  items: Array<{ key: string; filter: string; node: ReactNode }>;
  classes: FilterClasses;
  emptyText?: string;
}) {
  const [active, setActive] = useState<string>(ALL);
  const shown = items.filter((i) => active === ALL || i.filter === active);

  return (
    <>
      {options.length > 0 ? (
        <Chips
          options={options}
          active={active}
          onChange={setActive}
          label="按分类筛选"
          classes={classes}
        />
      ) : null}
      {shown.length === 0 ? (
        <p className={classes.empty}>{emptyText}</p>
      ) : (
        <div className={classes.stack}>
          {shown.map((i) => (
            <div key={i.key}>{i.node}</div>
          ))}
        </div>
      )}
    </>
  );
}

/** 会员项目:地区 + 类型两个维度,互相叠加。 */
export function FilterableProjectGrid({
  regionOptions,
  typeOptions,
  items,
  classes
}: {
  regionOptions: FilterOption[];
  typeOptions: FilterOption[];
  items: Array<{ key: string; region: string; projectType: string; node: ReactNode }>;
  classes: FilterClasses;
}) {
  const [region, setRegion] = useState<string>(ALL);
  const [type, setType] = useState<string>(ALL);
  const shown = items.filter(
    (i) => (region === ALL || i.region === region) && (type === ALL || i.projectType === type)
  );

  return (
    <>
      <Chips
        options={regionOptions}
        active={region}
        onChange={setRegion}
        label="按地区筛选"
        classes={classes}
      />
      <Chips
        options={typeOptions}
        active={type}
        onChange={setType}
        label="按项目类型筛选"
        classes={classes}
      />
      {shown.length === 0 ? (
        <p className={classes.empty}>暂无符合条件的项目。可清除筛选查看全部。</p>
      ) : (
        <div className={classes.stack}>
          {shown.map((i) => (
            <div key={i.key}>{i.node}</div>
          ))}
        </div>
      )}
    </>
  );
}
