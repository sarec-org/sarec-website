/**
 * SAREC GEO CMS —— Keystatic 配置（Gate 3A-1 PoC）
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
 * ⚠️ 本文件不接入前台读取；lib/geo/content.ts 未改动。Keystatic 只负责「写」，accessor 仍负责「读」。
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
      options: [
        { label: '正文 prose', value: 'prose' },
        { label: '小节标题 sectionHeading', value: 'sectionHeading' },
        { label: '要点列表 keyPoints', value: 'keyPoints' },
        { label: '数据表 dataTable', value: 'dataTable' },
        { label: '引用块 pullQuote', value: 'pullQuote' },
        { label: '提示框 callout', value: 'callout' },
        { label: '问答单元 qaUnit', value: 'qaUnit' },
        { label: '案例引用 caseRef', value: 'caseRef' },
        { label: '资产分隔 assetBreak', value: 'assetBreak' },
        { label: '行动召唤 cta', value: 'cta' },
      ],
      defaultValue: 'prose',
    }),
    {
      prose: fields.object({
        md: fields.text({ label: '正文 Markdown', multiline: true, validation: { isRequired: true } }),
      }),
      sectionHeading: fields.object({
        text: fields.text({ label: '标题文字', validation: { isRequired: true } }),
        id: fields.text({ label: '锚点 id（可选）' }),
      }),
      keyPoints: fields.object({
        title: fields.text({ label: '小标题（可选）' }),
        items: fields.array(fields.text({ label: '要点' }), { label: '要点列表', itemLabel: (p) => p.value }),
      }),
      dataTable: fields.object({
        caption: fields.text({ label: '表标题（可选）' }),
        rows: fields.array(
          fields.object({
            label: fields.text({ label: '行标签' }),
            value: fields.text({ label: '行值' }),
          }),
          { label: '数据行' }
        ),
      }),
      pullQuote: fields.object({
        text: fields.text({ label: '引文', multiline: true, validation: { isRequired: true } }),
        attribution: fields.text({ label: '出处（可选）' }),
      }),
      callout: fields.object({
        tone: fields.select({
          label: '语气',
          options: [
            { label: '风险 risk', value: 'risk' },
            { label: '说明 note', value: 'note' },
            { label: '法律 legal', value: 'legal' },
          ],
          defaultValue: 'note',
        }),
        md: fields.text({ label: '内容 Markdown', multiline: true, validation: { isRequired: true } }),
      }),
      qaUnit: fields.object({
        id: fields.text({ label: 'QA id', validation: { isRequired: true } }),
        question: fields.text({ label: '问题', validation: { isRequired: true } }),
        judgment: fields.text({ label: '判断', multiline: true, validation: { isRequired: true } }),
        // PoC：evidence 为 source id 列表，用 array(text)；relationship 待 sources collection 落地后切换。
        evidence: fields.array(fields.text({ label: 'Source ID' }), { label: '证据来源 IDs', itemLabel: (p) => p.value }),
        boundary: fields.text({ label: '边界', multiline: true }),
        riskNote: fields.text({ label: '风险提示（可选）', multiline: true }),
      }),
      caseRef: fields.object({
        caseSlug: fields.text({ label: '案例 slug', validation: { isRequired: true } }),
      }),
      assetBreak: fields.object({
        kind: fields.select({
          label: '媒体类型',
          options: [
            { label: '图片 image', value: 'image' },
            { label: '视频 video', value: 'video' },
          ],
          defaultValue: 'image',
        }),
        src: fields.text({ label: '媒体 URL（CDN/R2 链接，不上传）' }),
        poster: fields.text({ label: 'Poster URL（可选）' }),
        alt: fields.text({ label: '替代文本 alt' }),
        eyebrow: fields.text({ label: 'Eyebrow（可选）' }),
        title: fields.text({ label: '标题（可选）' }),
        body: fields.text({ label: '说明（可选）', multiline: true }),
      }),
      cta: fields.object({
        intent: fields.select({
          label: '意图',
          options: [{ label: '风险初诊 risk-review', value: 'risk-review' }],
          defaultValue: 'risk-review',
        }),
        label: fields.text({ label: '按钮文字', validation: { isRequired: true } }),
        sourceSlug: fields.text({ label: '来源标记 sourceSlug', validation: { isRequired: true } }),
      }),
    }
  ),
  { label: '正文区块 blocks', itemLabel: (p) => p.discriminant }
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
          name: { label: 'Slug 标识', validation: { isRequired: true } },
          slug: { label: 'URL Slug', description: '文章路由 /zh/research/<slug>，发布后不要更改' },
        }),
        locale: fields.select({
          label: '语言',
          options: [
            { label: '中文', value: 'zh' },
            { label: 'English', value: 'en' },
          ],
          defaultValue: 'zh',
        }),
        cluster: fields.select({ label: '内容集群', options: CLUSTER_OPTIONS, defaultValue: 'chinese-capital-us-re-risk' }),
        tier: fields.select({
          label: '层级',
          options: [
            { label: '支柱 pillar', value: 'pillar' },
            { label: '卫星 satellite', value: 'satellite' },
            { label: '笔记 note', value: 'note' },
          ],
          defaultValue: 'pillar',
        }),
        status: fields.select({
          label: '状态',
          options: [
            { label: '草稿 draft', value: 'draft' },
            { label: '已发布 published', value: 'published' },
          ],
          defaultValue: 'draft',
        }),
        title: fields.text({ label: '标题', validation: { isRequired: true } }),
        description: fields.text({ label: 'SEO 描述', multiline: true, validation: { isRequired: true } }),
        audience: fields.text({ label: '受众（可选）', multiline: true }),
        intent: fields.text({ label: '意图（可选）', multiline: true }),
        author: fields.object(
          {
            name: fields.text({ label: '作者名', validation: { isRequired: true } }),
            title: fields.text({ label: '作者头衔（可选）' }),
            profileUrl: fields.text({ label: '作者主页 URL（可选）' }),
          },
          { label: '作者' }
        ),
        publishedAt: fields.text({ label: '发布日期 YYYY-MM-DD', validation: { isRequired: true } }),
        updatedAt: fields.text({ label: '更新日期 YYYY-MM-DD（可选）' }),
        summary: fields.array(fields.text({ label: '摘要点' }), { label: '摘要（30 秒速览）', itemLabel: (p) => p.value }),
        blocks: blocksField,
        faq: fields.array(
          fields.object({
            question: fields.text({ label: '问题', validation: { isRequired: true } }),
            answer: fields.text({ label: '回答', multiline: true, validation: { isRequired: true } }),
          }),
          { label: 'FAQ（可选；为空则由 qaUnit 合成）' }
        ),
        sources: fields.array(fields.text({ label: 'Source ID' }), { label: '引用来源 IDs', itemLabel: (p) => p.value }),
        relatedSlugs: fields.array(fields.text({ label: '相关文章 slug' }), { label: '相关文章（可选）', itemLabel: (p) => p.value }),
        // 文章级 CTA / heroMedia 为可选对象：用 checkbox 判别「是否启用」，未启用 → empty。
        cta: fields.conditional(fields.checkbox({ label: '启用文章级 CTA', defaultValue: false }), {
          false: fields.empty(),
          true: fields.object({
            intent: fields.select({
              label: '意图',
              options: [{ label: '风险初诊 risk-review', value: 'risk-review' }],
              defaultValue: 'risk-review',
            }),
            label: fields.text({ label: '按钮文字' }),
            sourceSlug: fields.text({ label: '来源标记 sourceSlug' }),
          }),
        }),
        heroMedia: fields.conditional(fields.checkbox({ label: '启用 Hero 媒体', defaultValue: false }), {
          false: fields.empty(),
          true: fields.object({
            kind: fields.select({
              label: '媒体类型',
              options: [
                { label: '图片 image', value: 'image' },
                { label: '视频 video', value: 'video' },
              ],
              defaultValue: 'image',
            }),
            src: fields.text({ label: '媒体 URL' }),
            poster: fields.text({ label: 'Poster URL（可选）' }),
            alt: fields.text({ label: '替代文本 alt' }),
          }),
        }),
      },
    }),
  },
});
