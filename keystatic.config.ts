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
        src: fields.text({ label: '媒体链接 URL', description: '粘贴 CDN / R2 图片或视频链接（本 PoC 不支持上传）。' }),
        poster: fields.text({ label: 'Poster 封面 URL（可选）' }),
        alt: fields.text({ label: '替代文本 alt', description: '图片的文字描述，利于无障碍与 SEO。' }),
        eyebrow: fields.text({ label: 'Eyebrow 小字（可选）' }),
        title: fields.text({ label: '标题（可选）' }),
        body: fields.text({ label: '说明文字（可选）', multiline: true }),
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
    }
  ),
  { label: '正文区块', itemLabel: (p) => p.discriminant }
);

export default config({
  storage: { kind: 'local' },
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
        relatedSlugs: fields.array(fields.text({ label: '相关文章 slug' }), {
          label: '相关文章（可选）',
          description: '填写相关文章的 slug。',
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
              alt: fields.text({ label: '替代文本 alt' }),
            }),
          }
        ),
      },
    }),
  },
});
