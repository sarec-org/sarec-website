/**
 * SAREC GEO CMS —— Keystatic 配置（Gate 3A-1 PoC；Gate 3C-1/2 展示层中文化）
 * ------------------------------------------------------------------
 * - 仅本地编辑（storage.kind = 'local'）：内容写入 git 仓库，无数据库、无 GitHub App、无 OAuth。
 * - 内容存储格式 = YAML（format.data = 'yaml'），每篇文章一个 .yaml 文件。
 * - 本 PoC 只定义 articles collection（不含 cases / events / sources collection）。
 * - blocks[] 用 select(判别器) + conditional(分支) 表达 10 种 block，
 *   schema 形状与 lib/geo/types.ts 的 Block 判别联合一一对应；
 *   conditional 序列化为 { discriminant, value }，由 lib/geo/keystatic-adapter.ts 还原成 { type, data }。
 * - prose.md 用 multiline text（不使用 document / MDX 富文本），保持 md:string 契约，前台 renderer 零改动。
 * - assetBreak 媒体用 url/text（不启用图片上传），不动现有 R2/CDN 媒体管线。
 * - qaUnit.evidence / sources / caseSlug / sourceSlug 等「id 引用」本 PoC 用 text/array(text)；
 *   relationship 需要先定义 sources/cases collection，留待后续 Gate（见迁移报告「风险」一节）。
 *
 * ⚠️ Gate 3C-1/2 只改展示层（label / description / select option 的 label）：
 *    所有字段 key、字段 type、select option 的 value、defaultValue、slugField、path、YAML 结构均未改，
 *    故现有 YAML 仍合法、adapter / content.ts / 前台渲染 / sitemap 行为完全不变。
 */
import { config, fields, collection } from '@keystatic/core';

const CLUSTER_OPTIONS = [
  { label: '中国资本赴美房地产风险', value: 'chinese-capital-us-re-risk' },
  { label: 'EB-5 与房地产', value: 'eb5-real-estate' },
  { label: '洛杉矶开发与 ED1', value: 'la-development-ed1' },
  { label: 'SEC Finder 合规', value: 'sec-finder-compliance' },
] as const;

// ── blocks[]：10 种 block 的判别联合（select 判别 + conditional 分支）──────────
const blocksField = fields.array(
  fields.conditional(
    fields.select({
      label: '区块类型',
      description: '选择本区块的类型，选好后在下方填写对应内容。',
      options: [
        { label: '正文段落', value: 'prose' },
        { label: '小标题', value: 'sectionHeading' },
        { label: '要点列表', value: 'keyPoints' },
        { label: '数据表', value: 'dataTable' },
        { label: '重点引用', value: 'pullQuote' },
        { label: '风险 / 重点提示', value: 'callout' },
        { label: '问答单元（生成 FAQ）', value: 'qaUnit' },
        { label: '案例引用', value: 'caseRef' },
        { label: '图片 / 媒体块', value: 'assetBreak' },
        { label: '行动按钮', value: 'cta' },
        { label: '指标卡（大数字）', value: 'metricCards' },
        { label: '对比 / 数据表（多列）', value: 'chartTable' },
        { label: '柱状 / 折线图', value: 'barLineChart' },
      ],
      defaultValue: 'prose',
    }),
    {
      prose: fields.object({
        md: fields.text({
          label: '正文内容（Markdown）',
          description: '一段正文。支持 Markdown：空行分段、**加粗** 等。',
          multiline: true,
          validation: { isRequired: true },
        }),
      }),
      sectionHeading: fields.object({
        text: fields.text({ label: '小标题文字', validation: { isRequired: true } }),
        id: fields.text({ label: '锚点 id（可选）', description: '留空即可；用于页面内跳转定位。' }),
      }),
      keyPoints: fields.object({
        title: fields.text({ label: '小标题（可选）' }),
        items: fields.array(fields.text({ label: '要点' }), {
          label: '要点列表',
          description: '每行一条要点。',
          itemLabel: (p) => p.value,
        }),
      }),
      dataTable: fields.object({
        caption: fields.text({ label: '表标题（可选）' }),
        rows: fields.array(
          fields.object({
            label: fields.text({ label: '左列（标签）' }),
            value: fields.text({ label: '右列（数值 / 说明）' }),
          }),
          { label: '数据行', description: '逐行填写表格内容。' }
        ),
      }),
      pullQuote: fields.object({
        text: fields.text({
          label: '引文内容',
          description: '需要强调的一句话引用。',
          multiline: true,
          validation: { isRequired: true },
        }),
        attribution: fields.text({ label: '出处 / 署名（可选）' }),
      }),
      callout: fields.object({
        tone: fields.select({
          label: '提示类型',
          description: '风险=红线提示；说明=普通补充；法律=法律相关提示。',
          options: [
            { label: '风险', value: 'risk' },
            { label: '说明', value: 'note' },
            { label: '法律', value: 'legal' },
          ],
          defaultValue: 'note',
        }),
        md: fields.text({
          label: '提示内容（Markdown）',
          multiline: true,
          validation: { isRequired: true },
        }),
      }),
      qaUnit: fields.object(
        {
          id: fields.text({ label: '问答编号', description: '本问答的唯一编号，例如 qa-1。', validation: { isRequired: true } }),
          question: fields.text({ label: '问题', validation: { isRequired: true } }),
          judgment: fields.text({ label: '判断（核心回答）', multiline: true, validation: { isRequired: true } }),
          // PoC：evidence 为 source id 列表，用 array(text)；relationship 待 sources collection 落地后切换。
          evidence: fields.array(fields.text({ label: '证据来源 ID' }), {
            label: '证据来源 ID 列表',
            description: '引用的来源编号（如 src-uscis-eb5-i526e）。不确定可先留空。',
            itemLabel: (p) => p.value,
          }),
          boundary: fields.text({ label: '适用边界', multiline: true }),
          riskNote: fields.text({ label: '风险提示（可选）', multiline: true }),
        },
        {
          description:
            '问答单元：会自动生成适合搜索引擎 / AI 抓取的 FAQ 问答结构。不懂可先按示例简单填，或先不用本区块。',
        }
      ),
      caseRef: fields.object({
        caseSlug: fields.text({
          label: '案例 slug',
          description: '引用的案例标识（如 oceanwide-plaza）。',
          validation: { isRequired: true },
        }),
      }),
      assetBreak: fields.object({
        kind: fields.select({
          label: '媒体类型',
          options: [
            { label: '图片', value: 'image' },
            { label: '视频', value: 'video' },
          ],
          defaultValue: 'image',
        }),
        // M1（批次 3）：本地图片直传。拖拽 / 选择文件后由 Keystatic 提交进仓库。
        // 二选一：优先「上传图片」；未上传时才用「媒体链接 URL」（贴 CDN / R2 / 远程图 / 视频链接）。
        upload: fields.image({
          label: '上传本地图片（拖拽 / 选择文件）',
          description: '直接从电脑拖图或选文件上传；上传后无需再填「媒体链接 URL」。视频仍用下方 URL。',
          directory: 'public/images/research/uploads',
          publicPath: '/images/research/uploads',
        }),
        src: fields.text({ label: '媒体链接 URL（未上传时用）', description: '未上传本地图片时，粘贴 CDN / R2 图片或视频链接。' }),
        poster: fields.text({ label: 'Poster 封面 URL（可选）' }),
        alt: fields.text({
          label: '替代文本 alt',
          description: '图片的文字描述，利于无障碍与 SEO。必填。',
          validation: { isRequired: true },
        }),
        eyebrow: fields.text({ label: 'Eyebrow 小字（可选）' }),
        title: fields.text({ label: '标题（可选）' }),
        body: fields.text({ label: '说明文字（可选）', multiline: true }),
        // 内部标记（前台不展示，后台可查）：标注配图来源，便于合规审计（M2）。
        generated: fields.select({
          label: '配图来源标记（内部，前台不展示）',
          description: '普通=真实/自摄/授权图；品牌插画=SAREC 内置插画库；AI 插画=AI 生成的抽象插画。',
          options: [
            { label: '普通（默认）', value: 'none' },
            { label: 'SAREC 品牌插画', value: 'illustration' },
            { label: 'AI 生成插画', value: 'ai' },
          ],
          defaultValue: 'none',
        }),
      }),
      cta: fields.object({
        intent: fields.select({
          label: '意图',
          options: [{ label: '风险初诊', value: 'risk-review' }],
          defaultValue: 'risk-review',
        }),
        label: fields.text({ label: '按钮文字', validation: { isRequired: true } }),
        sourceSlug: fields.text({ label: '来源标记', description: '用于统计该按钮来自哪篇文章。', validation: { isRequired: true } }),
      }),
      // ── M4 图表块 ────────────────────────────────────────────────
      metricCards: fields.object(
        {
          title: fields.text({ label: '小标题（可选）' }),
          items: fields.array(
            fields.object({
              label: fields.text({ label: '指标名', validation: { isRequired: true } }),
              value: fields.text({ label: '大数字（含单位/符号，如 +0.8%）', validation: { isRequired: true } }),
              change: fields.text({ label: '同比 / 环比（可选，如 同比 +0.7%）' }),
              trend: fields.select({
                label: '涨跌方向',
                options: [
                  { label: '— 中性', value: 'flat' },
                  { label: '▲ 上升', value: 'up' },
                  { label: '▼ 下降', value: 'down' },
                ],
                defaultValue: 'flat',
              }),
              note: fields.text({ label: '注释（可选）' }),
            }),
            { label: '指标卡', description: '一行若干个大数字指标。', itemLabel: (p) => p.fields.label.value }
          ),
        },
        { description: '一组大数字指标卡（数据追踪栏目的核心指标）。' }
      ),
      chartTable: fields.object(
        {
          caption: fields.text({ label: '表标题（可选）' }),
          headers: fields.array(fields.text({ label: '列头' }), {
            label: '表头',
            description: '每列一个列头；支持任意列数（超越两列旧数据表）。',
            itemLabel: (p) => p.value,
          }),
          rows: fields.array(
            fields.object({
              cells: fields.array(fields.text({ label: '单元格' }), {
                label: '本行各列',
                description: '按表头顺序逐列填写。',
                itemLabel: (p) => p.value,
              }),
              highlight: fields.checkbox({ label: '高亮此行', defaultValue: false }),
            }),
            { label: '数据行' }
          ),
        },
        { description: '带表头的多列对比表，可高亮重点行。' }
      ),
      barLineChart: fields.object(
        {
          caption: fields.text({ label: '图标题（可选）' }),
          variant: fields.select({
            label: '图形态',
            options: [
              { label: '柱状图', value: 'bar' },
              { label: '折线图', value: 'line' },
            ],
            defaultValue: 'bar',
          }),
          unit: fields.text({ label: '数值单位（可选，如 %）' }),
          series: fields.array(
            fields.object({
              label: fields.text({ label: '横轴标签', validation: { isRequired: true } }),
              value: fields.text({ label: '数值（可含负号/小数）', validation: { isRequired: true } }),
            }),
            { label: '数据点', itemLabel: (p) => p.fields.label.value }
          ),
          source: fields.text({ label: '来源（可选）' }),
        },
        { description: '同一组数据两种形态：柱状或折线。' }
      ),
    }
  ),
  {
    label: '正文区块',
    // 折叠列表行显示「中文类型：内容摘要」，便于管理大量区块。
    // 取值路径经 Gate 3C-3A 实测确认：p.discriminant + p?.value?.fields?.<key>?.value。
    // 不读取未验证的嵌套数组（keyPoints.items / dataTable.rows），仅用已验证的标量字段。
    itemLabel: (p) => {
      const CN: Record<string, string> = {
        prose: '正文段落',
        sectionHeading: '小标题',
        keyPoints: '要点列表',
        dataTable: '数据表',
        pullQuote: '重点引用',
        callout: '风险 / 重点提示',
        qaUnit: '问答单元',
        caseRef: '案例引用',
        assetBreak: '图片 / 媒体块',
        cta: '行动按钮',
        metricCards: '指标卡',
        chartTable: '对比 / 数据表',
        barLineChart: '柱状 / 折线图',
      };
      // 安全截断：仅处理 string，trim，最多约 24 个字，超长加 …，空值返回 ''。
      const cut = (s: unknown): string => {
        if (typeof s !== 'string') return '';
        // 显示层清洗：字面量 "\n" → 空格；真实换行 / tab / 多空格 → 单空格；trim。
        const t = s
          .replace(/\\n/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (!t) return '';
        return t.length > 24 ? t.slice(0, 24) + '…' : t;
      };
      try {
        const x = p as any;
        const d: string = x?.discriminant;
        const read = (key: string): string => {
          try {
            return cut(x?.value?.fields?.[key]?.value);
          } catch {
            return '';
          }
        };
        const cn = CN[d] ?? (typeof d === 'string' && d ? d : '区块');
        let summary = '';
        switch (d) {
          case 'prose':
          case 'callout':
            summary = read('md');
            break;
          case 'sectionHeading':
          case 'pullQuote':
            summary = read('text');
            break;
          case 'qaUnit':
            summary = read('question');
            break;
          case 'caseRef':
            summary = read('caseSlug');
            break;
          case 'cta':
            summary = read('label');
            break;
          case 'keyPoints':
            // 仅取已验证的标量 title；无 title 则只显示类型（不读未验证的 items 嵌套数组）。
            summary = read('title');
            break;
          case 'dataTable':
            // 仅取已验证的标量 caption；无 caption 则只显示类型（不读未验证的 rows 嵌套数组）。
            summary = read('caption');
            break;
          case 'assetBreak':
            summary = read('title') || read('alt') || read('src');
            break;
          case 'chartTable':
          case 'barLineChart':
            // 仅取已验证的标量 caption;无 caption 则只显示类型。
            summary = read('caption');
            break;
          case 'metricCards':
            summary = read('title');
            break;
          default:
            summary = '';
        }
        return summary ? `${cn}：${summary}` : cn;
      } catch {
        return '区块';
      }
    },
  }
);

// ══════════════════════════════════════════════════════════════════
// CMS V2(PR-1)共享字段工厂 —— 新闻 / 活动 / 会员项目 / 会员单位
// ------------------------------------------------------------------
// 与 articles 同构:GitHub storage、一条内容一个 .yaml、format.data='yaml'。
// 约定:
//  - 所有日期字段一律 fields.date()(日期选择器 + 写出裸 ISO,如 2026-08-15)。
//  - body / recapBody 一律 multiline text 存 Markdown(不引 markdoc / document),
//    前台由 components/cms/CmsMarkdown.tsx 以与 GEO 同构的零依赖方式渲染。
//  - select / multiselect 的 value 一律英文标识,label 一律中文(同 articles)。
// ══════════════════════════════════════════════════════════════════

/** 图集:多图,每张 alt 必填(无障碍 + SEO 硬要求)。 */
const galleryField = (directory: string, publicPath: string) =>
  fields.array(
    fields.object({
      image: fields.image({
        label: '图片',
        directory,
        publicPath,
        validation: { isRequired: true },
      }),
      alt: fields.text({
        label: '替代文本 alt',
        description: '这张图在讲什么。必填 —— 无障碍与 SEO 都依赖它。',
        validation: { isRequired: true },
      }),
    }),
    {
      label: '图集',
      description: '可放多张图片;每张都必须填写 alt,否则无法保存。',
      itemLabel: (p) => p.fields.alt.value || '图片',
    }
  );

export default config({
  // GitHub 模式(批次 1)：内容读写走 GitHub App + OAuth，编辑在 cms/ 前缀分支上进行并经 PR 合并。
  // 运行需 env：KEYSTATIC_GITHUB_CLIENT_ID/SECRET、KEYSTATIC_SECRET、NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG。
  // repo 指向 public 主仓;登录与写权限由 Keystatic GitHub App + 仓库协作者权限强制(无写权限不能提交)。
  storage: {
    kind: 'github',
    repo: { owner: 'sarec-org', name: 'sarec-website' },
    branchPrefix: 'cms/',
  },
  ui: {
    brand: { name: 'SAREC GEO CMS' },
  },
  collections: {
    articles: collection({
      label: '研究文章（GEO Articles）',
      slugField: 'slug',
      path: 'content/geo/articles/*',
      format: { data: 'yaml' },
      schema: {
        slug: fields.slug({
          name: { label: '内部标识（用于后台列表显示）', validation: { isRequired: true } },
          slug: {
            label: 'URL 标识（slug）',
            description: '文章网址 /zh/research/<此处>。发布后请勿更改，否则旧链接会失效。',
          },
        }),
        locale: fields.select({
          label: '语言',
          description: '文章语言，默认中文。',
          options: [
            { label: '中文', value: 'zh' },
            { label: 'English', value: 'en' },
          ],
          defaultValue: 'zh',
        }),
        cluster: fields.select({
          label: '内容集群',
          description: '文章所属的主题分类。',
          options: CLUSTER_OPTIONS,
          defaultValue: 'chinese-capital-us-re-risk',
        }),
        tier: fields.select({
          label: '层级',
          description: '支柱=核心长文；卫星=配套文章；笔记=简短说明。',
          options: [
            { label: '支柱（pillar）', value: 'pillar' },
            { label: '卫星（satellite）', value: 'satellite' },
            { label: '笔记（note）', value: 'note' },
          ],
          defaultValue: 'pillar',
        }),
        // ── 栏目 / 模板（M2）—— 三选一，选后展开该栏目专属字段（字段结构定死，员工填空）。──
        // 序列化为 { discriminant, value }；adapter 还原为 Article.template + 扁平元字段。
        template: fields.conditional(
          fields.select({
            label: '栏目 / 模板',
            description: '深度=长研究（数据+判断+FAQ）；快评=单一事件快速判断；数据追踪=数据周期+指标。',
            options: [
              { label: 'SAREC 深度', value: 'deep' },
              { label: 'SAREC 快评', value: 'brief' },
              { label: 'SAREC 数据追踪', value: 'data' },
            ],
            defaultValue: 'deep',
          }),
          {
            deep: fields.object({
              tldr: fields.array(fields.text({ label: 'TL;DR / 核心判断要点' }), {
                label: 'TL;DR / 核心判断',
                description: '开篇最重要的几条判断，每行一条。',
                itemLabel: (p) => p.value,
              }),
              dataCutoff: fields.text({ label: '数据截止日', description: '格式 YYYY-MM-DD。' }),
              judgmentChecklist: fields.array(fields.text({ label: '清单项' }), {
                label: 'SAREC 判断清单',
                description: '文末给读者的自检清单，每行一条（可留空）。',
                itemLabel: (p) => p.value,
              }),
            }),
            brief: fields.object({
              oneLine: fields.text({ label: '一句话结论', validation: { isRequired: true } }),
              background: fields.text({ label: '背景', multiline: true }),
              impact: fields.text({ label: '影响', multiline: true }),
              judgment: fields.text({ label: 'SAREC 判断', multiline: true }),
            }),
            data: fields.object({
              dataPeriod: fields.text({
                label: '数据周期',
                description: '如 2026 年 6 月 / 2026Q2。',
                validation: { isRequired: true },
              }),
              dataCutoff: fields.text({ label: '数据截止日', description: '格式 YYYY-MM-DD。' }),
              changeNote: fields.text({ label: '变化说明', multiline: true }),
            }),
          }
        ),
        // ── 版式（M3，批次 3）—— 只影响渲染呈现，不改内容字段结构。老文章默认经典版。──
        layout: fields.select({
          label: '版式',
          description:
            '经典=现状样式；报告=侧边目录/章节导航（适合 8000 字+ 长文）；简报=紧凑排版、TL;DR 置顶卡、数据前置。',
          options: [
            { label: '经典版', value: 'classic' },
            { label: '报告版（侧边目录）', value: 'report' },
            { label: '简报版（TL;DR 置顶）', value: 'compact' },
          ],
          defaultValue: 'classic',
        }),
        status: fields.select({
          label: '状态',
          description: '草稿=不公开、不进网站地图（sitemap）；发布=公开显示、进入网站地图。不确认前请保持草稿。',
          options: [
            { label: '草稿（draft）', value: 'draft' },
            { label: '已发布（published）', value: 'published' },
          ],
          defaultValue: 'draft',
        }),
        title: fields.text({ label: '标题', description: '文章主标题。', validation: { isRequired: true } }),
        description: fields.text({
          label: 'SEO 描述',
          description: '用于搜索引擎结果与分享卡片的简介，1–2 句话概括文章。',
          multiline: true,
          validation: { isRequired: true },
        }),
        audience: fields.text({ label: '目标读者（可选）', description: '本文主要写给谁看。', multiline: true }),
        intent: fields.text({ label: '文章目的（可选）', description: '读者读完应获得什么。', multiline: true }),
        author: fields.object(
          {
            name: fields.text({ label: '作者名', validation: { isRequired: true } }),
            title: fields.text({ label: '作者头衔（可选）' }),
            profileUrl: fields.text({ label: '作者主页链接（可选）' }),
          },
          { label: '作者', description: '文章署名信息。' }
        ),
        publishedAt: fields.text({
          label: '发布日期',
          description: '格式 YYYY-MM-DD，例如 2026-05-01。',
          validation: { isRequired: true },
        }),
        updatedAt: fields.text({ label: '更新日期（可选）', description: '格式 YYYY-MM-DD。' }),
        summary: fields.array(fields.text({ label: '速览要点' }), {
          label: '30 秒速览',
          description: '列出文章最关键的结论，供读者与 AI 快速抓要点；每行一条。',
          itemLabel: (p) => p.value,
        }),
        blocks: blocksField,
        faq: fields.array(
          fields.object({
            question: fields.text({ label: '问题', validation: { isRequired: true } }),
            answer: fields.text({ label: '回答', multiline: true, validation: { isRequired: true } }),
          }),
          {
            label: '常见问答 FAQ（可选）',
            description: '留空时，系统会用上方「问答单元」自动合成 FAQ。',
          }
        ),
        sources: fields.array(fields.text({ label: '证据来源 ID' }), {
          label: '引用证据 ID',
          description:
            '文中引用的权威来源编号（如 src-uscis-eb5-i526e）。目前先按已有 ID 填写，后续会单独优化为更友好的选择方式。',
          itemLabel: (p) => p.value,
        }),
        sourceList: fields.array(
          fields.object({
            name: fields.text({ label: '来源名称', validation: { isRequired: true } }),
            url: fields.text({ label: '链接 URL（可选）', description: '权威来源原文链接，前台可点击。' }),
            accessedAt: fields.text({ label: '抓取日期（可选）', description: '格式 YYYY-MM-DD。' }),
          }),
          {
            label: '数据来源（自由文本）',
            description: '文末「数据来源」区逐条显示；适合无预置 ID 的一般来源。含链接与抓取日期。',
            itemLabel: (p) => p.fields.name.value,
          }
        ),
        relatedSlugs: fields.array(fields.text({ label: '相关文章 slug' }), {
          label: '相关文章（可选）',
          description: '填写相关文章的 slug；文末自动渲染「相关阅读」（标题+摘要+链接）。',
          itemLabel: (p) => p.value,
        }),
        // 文章级 CTA / heroMedia 为可选对象：用 checkbox 判别「是否启用」，未启用 → empty。
        cta: fields.conditional(
          fields.checkbox({ label: '启用文章底部行动按钮（CTA）', defaultValue: false }),
          {
            false: fields.empty(),
            true: fields.object({
              intent: fields.select({
                label: '意图',
                options: [{ label: '风险初诊', value: 'risk-review' }],
                defaultValue: 'risk-review',
              }),
              label: fields.text({ label: '按钮文字' }),
              sourceSlug: fields.text({ label: '来源标记' }),
            }),
          }
        ),
        heroMedia: fields.conditional(
          fields.checkbox({ label: '启用头图 / 头部媒体', defaultValue: false }),
          {
            false: fields.empty(),
            true: fields.object({
              kind: fields.select({
                label: '媒体类型',
                options: [
                  { label: '图片', value: 'image' },
                  { label: '视频', value: 'video' },
                ],
                defaultValue: 'image',
              }),
              src: fields.text({ label: '媒体链接 URL' }),
              poster: fields.text({ label: 'Poster 封面 URL（可选）' }),
              alt: fields.text({ label: '替代文本 alt', validation: { isRequired: true } }),
            }),
          }
        ),
      },
    }),

    // ══════════════════════════════════════════════════════════════
    // CMS V2 · 1A —— 新闻(news)
    // 前台:/zh/news(列表)、/zh/news/<slug>(详情)、/zh/events(聚合页左栏)
    // ⚠️ 分类里没有「活动回顾」:回顾写在对应活动条目的「活动回顾正文」字段,
    //    聚合页会自动把已结束的活动作为回顾卡片混入新闻流,不在这里另建文章。
    // ══════════════════════════════════════════════════════════════
    news: collection({
      label: '新闻(News)',
      slugField: 'title',
      path: 'content/news/*',
      format: { data: 'yaml' },
      columns: ['publishedAt', 'category'],
      schema: {
        title: fields.slug({
          name: { label: '标题', validation: { isRequired: true } },
          slug: {
            label: 'URL 标识(slug)',
            description: '新闻网址 /zh/news/<此处>。发布后请勿更改,否则旧链接会失效。',
          },
        }),
        category: fields.select({
          label: '分类',
          description: '活动回顾不在此列 —— 回顾请写在对应「活动」条目里。',
          options: [
            { label: '商会新闻', value: 'chamber-news' },
            { label: '会员动态', value: 'member-update' },
            { label: '合作进展', value: 'partnership-progress' },
          ],
          defaultValue: 'chamber-news',
        }),
        publishedAt: fields.date({
          label: '发布日期',
          description: '用于时间流排序与结构化数据。',
          validation: { isRequired: true },
        }),
        summary: fields.text({
          label: '摘要',
          description:
            '用于列表卡片与搜索引擎描述(meta description)。建议 60–80 个汉字,原则上不超过 100 个汉字。',
          multiline: true,
          validation: { isRequired: true },
        }),
        coverImage: fields.image({
          label: '封面图',
          description: '列表卡片与详情页头部使用。',
          directory: 'public/images/news/uploads',
          publicPath: '/images/news/uploads',
        }),
        gallery: galleryField('public/images/news/uploads', '/images/news/uploads'),
        body: fields.text({
          label: '正文(Markdown)',
          description:
            '空行分段。支持 ## / ### 小标题、- 列表、**加粗**、[文字](链接)。',
          multiline: true,
          validation: { isRequired: true },
        }),
      },
    }),

    // ══════════════════════════════════════════════════════════════
    // CMS V2 · 1B —— 活动(events)
    // 一场活动始终一个 URL /zh/events/<slug>:
    // 举办前展示主题/时间/地点/报名;结束后同一页面更新为回顾,不生成第二个页面。
    // 「活动状态」与「报名状态」是两个独立维度,不合并成一个枚举。
    // ══════════════════════════════════════════════════════════════
    events: collection({
      label: '活动(Events)',
      slugField: 'title',
      path: 'content/events/*',
      format: { data: 'yaml' },
      columns: ['startAt', 'eventStatus'],
      schema: {
        title: fields.slug({
          name: { label: '活动名称', validation: { isRequired: true } },
          slug: {
            label: 'URL 标识(slug)',
            description: '活动网址 /zh/events/<此处>。发布后请勿更改,否则旧链接会失效。',
          },
        }),
        summary: fields.text({
          label: '摘要',
          description:
            '用于列表卡片与搜索引擎描述。建议 60–80 个汉字,原则上不超过 100 个汉字。',
          multiline: true,
          validation: { isRequired: true },
        }),
        startAt: fields.datetime({
          label: '开始时间',
          description: '当地时间。时区在下方单独选择。',
          validation: { isRequired: true },
        }),
        endAt: fields.datetime({
          label: '结束时间(可选)',
          description: '当地时间。单场短活动可留空。',
        }),
        timezone: fields.select({
          label: '时区',
          description: '上面的开始/结束时间不带时区,必须在这里指明是哪个时区的当地时间。',
          options: [
            { label: '美西 洛杉矶(America/Los_Angeles)', value: 'America/Los_Angeles' },
            { label: '美东 纽约(America/New_York)', value: 'America/New_York' },
            { label: '中国 上海(Asia/Shanghai)', value: 'Asia/Shanghai' },
          ],
          defaultValue: 'America/Los_Angeles',
        }),
        locationName: fields.text({ label: '地点名称', description: '如:SAREC 洛杉矶办公室。线上活动可填「线上」。' }),
        address: fields.text({ label: '详细地址(可选)', multiline: true }),
        organizer: fields.text({ label: '主办方', description: '默认填 中美房地产商会(SAREC)。' }),
        registrationUrl: fields.text({
          label: '报名链接(可选)',
          description: '公开报名页或表单链接。留空表示不公开报名(如闭门/邀请制)。',
        }),
        eventStatus: fields.select({
          label: '活动状态',
          description: '与下方「报名状态」相互独立。已结束后请改为「已结束」并填写下方活动回顾。',
          options: [
            { label: '已排期(预告)', value: 'scheduled' },
            { label: '已结束', value: 'completed' },
            { label: '已延期', value: 'postponed' },
            { label: '已取消', value: 'cancelled' },
          ],
          defaultValue: 'scheduled',
        }),
        registrationStatus: fields.select({
          label: '报名状态',
          description: '与上方「活动状态」相互独立。',
          options: [
            { label: '尚未开放', value: 'notOpen' },
            { label: '报名中', value: 'open' },
            { label: '已截止', value: 'closed' },
            { label: '已满', value: 'full' },
          ],
          defaultValue: 'notOpen',
        }),
        coverImage: fields.image({
          label: '封面图',
          directory: 'public/images/events/uploads',
          publicPath: '/images/events/uploads',
        }),
        body: fields.text({
          label: '活动介绍(Markdown)',
          description: '举办前展示的主题说明、议程等。空行分段,支持 ## 小标题、- 列表、**加粗**。',
          multiline: true,
        }),
        recapBody: fields.text({
          label: '活动回顾正文(Markdown,活动结束后填)',
          description:
            '填写后,本活动页会在同一 URL 下追加回顾区,并自动加上「本文为活动纪要」免责声明。不要为回顾另建新闻。',
          multiline: true,
        }),
        speakers: fields.array(
          fields.object({
            name: fields.text({ label: '姓名', validation: { isRequired: true } }),
            title: fields.text({ label: '头衔 / 单位(可选)' }),
          }),
          {
            label: '主讲人',
            description: '活动回顾区展示。',
            itemLabel: (p) => p.fields.name.value || '主讲人',
          }
        ),
        gallery: galleryField('public/images/events/uploads', '/images/events/uploads'),
      },
    }),

    // ══════════════════════════════════════════════════════════════
    // CMS V2 · 1E —— 会员项目(projects)
    // 前台:/zh/projects(列表)、/zh/projects/<slug>(详情)
    // 合规硬约束:
    //  - 详情页强制渲染 MemberDisclaimer,编辑不可关闭。
    //  - 不设任何「预期回报 / 收益率 / 质量评级」字段。
    //  - 角色枚举锁死,渲染层不留自由文本入口;统一用「参与方」口径展示。
    //  - stage(项目阶段)仅作详情页展示字段,不进筛选器(阶段筛选是挂牌板特征)。
    //  - 「副会长单位项目」等徽章无手工字段,由关联会员单位的级别/关系数据渲染时生成。
    // ══════════════════════════════════════════════════════════════
    projects: collection({
      label: '会员项目(Projects)',
      slugField: 'title',
      path: 'content/projects/*',
      format: { data: 'yaml' },
      columns: ['projectType', 'stage'],
      schema: {
        title: fields.slug({
          name: { label: '项目名称', validation: { isRequired: true } },
          slug: {
            label: 'URL 标识(slug)',
            description: '项目网址 /zh/projects/<此处>。发布后请勿更改,否则旧链接会失效。',
          },
        }),
        summary: fields.text({
          label: '摘要',
          description:
            '用于列表卡片与搜索引擎描述。建议 60–80 个汉字,原则上不超过 100 个汉字。只写事实,不写回报预期。',
          multiline: true,
          validation: { isRequired: true },
        }),
        projectType: fields.select({
          label: '项目类型',
          description: '列表页筛选维度之一。',
          options: [
            { label: '经济适用房开发(ED1)', value: 'ed1-affordable' },
            { label: '精品公寓项目', value: 'boutique-apartment' },
            { label: '跨境股权合作项目', value: 'cross-border-equity' },
            { label: '其他', value: 'other' },
          ],
          defaultValue: 'ed1-affordable',
        }),
        region: fields.select({
          label: '地区',
          description: '列表页筛选维度之一。',
          options: [
            { label: '洛杉矶', value: 'los-angeles' },
            { label: '南加州其他地区', value: 'socal-other' },
            { label: '加州其他地区', value: 'california-other' },
            { label: '美国其他地区', value: 'us-other' },
          ],
          defaultValue: 'los-angeles',
        }),
        stage: fields.select({
          label: '项目阶段',
          description: '仅在详情页展示,不作为列表筛选条件。',
          options: [
            { label: '前期评估', value: 'pre-development' },
            { label: '审批中', value: 'entitlement' },
            { label: '建设中', value: 'construction' },
            { label: '在管', value: 'operating' },
            { label: '已完成', value: 'completed' },
          ],
          defaultValue: 'pre-development',
        }),
        sarecRole: fields.multiselect({
          label: 'SAREC 角色',
          description: '枚举锁死,不可自定义文案。可多选。',
          options: [
            { label: '政策结构判断', value: 'policy-structure' },
            { label: '项目筛选', value: 'project-screening' },
            { label: '项目合作', value: 'project-partnership' },
            { label: '结构设计', value: 'structure-design' },
            { label: '法律结构设计', value: 'legal-structure-design' },
            { label: '资本结构咨询', value: 'capital-structure-advisory' },
            { label: '合规咨询', value: 'compliance-advisory' },
            { label: '风险评估', value: 'risk-assessment' },
            { label: '投资人沟通', value: 'investor-communication' },
          ],
          defaultValue: [],
        }),
        linkedMembers: fields.array(
          fields.object({
            unit: fields.relationship({
              label: '会员单位',
              description: '从会员单位库中选择。本项必填。',
              collection: 'memberUnits',
              validation: { isRequired: true },
            }),
            roles: fields.multiselect({
              label: '参与角色',
              description: '枚举锁死,不可自定义文案。本项至少选一项。',
              options: [
                { label: '开发', value: 'development' },
                { label: '贷款', value: 'lending' },
                { label: '建筑', value: 'construction' },
                { label: '法律', value: 'legal' },
                { label: '会计', value: 'accounting' },
                { label: '经纪', value: 'brokerage' },
                { label: '其他', value: 'other' },
              ],
              defaultValue: [],
            }),
            roleDescription: fields.text({
              label: '角色补充说明(可选)',
              description: '50 个汉字以内。前台会放在免责声明约束语境内展示。',
              validation: { length: { max: 50 } },
            }),
          }),
          {
            label: '参与的会员单位',
            description: '可留空。填写时每一项都必须选中会员单位并至少选一个参与角色。',
            itemLabel: (p) => p.fields.unit.value || '会员单位',
          }
        ),
        tags: fields.multiselect({
          label: '标签',
          description:
            '仅这三个手工标签。「副会长单位项目」「战略伙伴项目」等徽章由上方关联的会员单位自动生成,不在此处手填。',
          options: [
            { label: 'SAREC参与', value: 'sarec-involved' },
            { label: '会员提交', value: 'member-submitted' },
            { label: '案例研究', value: 'case-study' },
          ],
          defaultValue: [],
        }),
        lastVerified: fields.date({
          label: '资料最后核实日',
          description: '最近一次与项目方/会员单位核实本页信息的日期。',
          validation: { isRequired: true },
        }),
        coverImage: fields.image({
          label: '封面图',
          directory: 'public/images/projects/uploads',
          publicPath: '/images/projects/uploads',
        }),
        gallery: galleryField('public/images/projects/uploads', '/images/projects/uploads'),
        body: fields.text({
          label: '项目正文(Markdown)',
          description:
            '只写事实与结构,不写收益承诺、回报预期,也不写任何面向投资人的招揽措辞。空行分段,支持 ## 小标题、- 列表、**加粗**。',
          multiline: true,
        }),
      },
    }),

    // ══════════════════════════════════════════════════════════════
    // CMS V2 · 1D —— 会员单位(memberUnits)
    // ⚠️ 本 PR 只落 schema:不发布内容条目、不建前台页面、不进导航、不进 sitemap。
    //    PR-2「会员风采」直接在此 schema 上回填内容,不再改字段。
    //    projects.linkedMembers 的 relationship 依赖本 collection 已定义。
    // ⚠️ slug(单位名)上线后冻结:项目关联依赖 slug,改名需迁移脚本。
    // ⚠️ 前台一律只读取 published 与 publicationApproved 均为 true 的条目。
    // ══════════════════════════════════════════════════════════════
    memberUnits: collection({
      label: '会员单位(Member Units)',
      slugField: 'name',
      path: 'content/member-units/*',
      format: { data: 'yaml' },
      columns: ['membershipTier', 'published'],
      schema: {
        name: fields.slug({
          name: { label: '单位名称', validation: { isRequired: true } },
          slug: {
            label: 'URL 标识(slug)',
            description:
              '会员单位网址 /zh/members/units/<此处>。⚠️ 一经上线不可更改 —— 项目关联依赖它。',
          },
        }),
        logo: fields.image({
          label: 'Logo',
          directory: 'public/images/members/uploads',
          publicPath: '/images/members/uploads',
        }),
        membershipTier: fields.select({
          label: '会员级别',
          options: [
            { label: '副会长单位', value: 'vice-chair' },
            { label: '常务理事', value: 'executive-director' },
            { label: '理事', value: 'director' },
            { label: '会员', value: 'member' },
          ],
          defaultValue: 'member',
        }),
        relationshipTags: fields.multiselect({
          label: '关系标签',
          description: '可与任意会员级别叠加。新增关系类型须改 schema,不允许自由填写。',
          options: [{ label: '战略合作伙伴', value: 'strategic-partner' }],
          defaultValue: [],
        }),
        representative: fields.text({ label: '代表人' }),
        coreBusiness: fields.text({ label: '核心业务', multiline: true }),
        expertise: fields.multiselect({
          label: '专业领域',
          description: '会员单位名录按此分组。可多选。',
          options: [
            { label: '开发与投资', value: 'development-investment' },
            { label: '建筑与建材', value: 'construction-materials' },
            { label: '贷款与金融', value: 'lending-finance' },
            { label: '法律与税务', value: 'legal-tax' },
            { label: '房地产经纪', value: 'brokerage' },
            { label: '科技与专业服务', value: 'tech-professional-services' },
          ],
          defaultValue: [],
        }),
        joinedAt: fields.date({ label: '加入时间' }),
        lastVerified: fields.date({
          label: '资料最后核实日',
          description: '最近一次与该单位核实本页信息的日期。',
        }),
        sortWeight: fields.integer({
          label: '排序权重',
          description: '同一级别内的排序,数字大的排前面。',
          defaultValue: 0,
        }),
        published: fields.checkbox({
          label: '已发布',
          description: '未勾选的条目前台完全不显示。',
          defaultValue: false,
        }),
        publicationApproved: fields.checkbox({
          label: '已确认可公开',
          description:
            '确认会员身份、资料真实性,并取得书面发布同意后方可勾选。未勾选的条目前台完全不显示。',
          defaultValue: false,
        }),
      },
    }),
  },
});
