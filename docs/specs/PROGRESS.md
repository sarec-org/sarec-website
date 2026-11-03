# SAREC 统一后台 + 会员系统 + 小程序 —— 进度记录

> 依据：`docs/specs/ClaudeCode_一次性开发总指令_V2.0.md`，以及东哥 2026-11-03 追加的两条补充（“入会全流程自助”“Zelle 付款页”）。
> 会话中断后读本文件，从“下一步”接着做，不重做、不重问。
> 注意：`docs/specs/` 里的方案、题库、交接文档、bundle 只放在本地，**不提交**，因为 GitHub 仓库是公开的。本文件与截图会提交。

## 工作目录与环境

| 项目 | 位置 |
|---|---|
| 网站原工作区（未改动） | `~/Desktop/sarec-cleanroom/sarec-website`（分支 `feature/terra-capital-corebusiness`） |
| 本次开发 worktree | `~/Desktop/sarec-cleanroom/sarec-crm`，分支 `feature/crm-phase1`（基于 origin/main `600f936`） |
| 推送位置 | fork `github.com/360cpacorp/sarec-website`。360cpacorp 对 sarec-org 只有读权限；PR 从 fork 发往 sarec-org |
| 小程序 | `~/WeChatProjects/sarec-miniprogram`，只有本地 git，没有权限在 sarec-org 建仓库 |
| 本地测试库 | 自建 Postgres 14，端口 5544：`postgres://postgres@127.0.0.1:5544/sarec_crm_dev` |
| 预览数据库 | 新建的 Neon 资源 `sarec-crm-preview`，只连 Preview 环境，变量前缀 `CRMPREVIEW_`；0001–0004 已执行 |
| 预览网站 | https://sarec-crm-preview.vercel.app（CLI 部署，部署时用 `--env DATABASE_URL=<预览库>` 覆盖，不改项目设置，不碰正式库） |
| 本地构建 | 必须用 Node 22（`/usr/local/bin/node`）；本机 Node 25 会让 next/font 报错。本地 build 需给 Keystatic 填假变量 |

## 里程碑

| 里程碑 | 状态 | 提交 | 测试 |
|---|---|---|---|
| M0 准备与盘点 | ✅ | 0d1f2ee | — |
| M1 导入后台代码，本地 11 组验收 | ✅ | 0d1f2ee | `crm-acceptance.ts` 全部通过，11 组 |
| M2 登录 + 报名 + 渐进式补资料 | ✅ | 7a86858、cb51444 | e2e 第 1–2 组 |
| M3 付款核款 + 签到 + 会费 Zelle/Stripe 自助 + 积分抵扣 | ✅ | 7a86858、cb51444 | e2e 第 3–4、6 组；后台测试 |
| M4 我的 + 会议室/月卡/电子屏 + 工作人员后台 | ✅ | cb51444 | `crm-api-tests.ts` 9 组；e2e 第 5、7 组 |
| M5 /api/v1 + docs/api-v1.md + 预览 + PR | ✅ | 4328275 及之后；PR https://github.com/sarec-org/sarec-website/pull/18 | 预览环境 e2e 全部通过，8 组；浏览器全流程 14 步 |
| M6 小程序 | ✅ | 小程序 7795209、7d0fc83、76efa8f | 编译通过，体验版已上传 0.1.2 |
| M7 总验收与汇报 | ✅ | 见 git log | typecheck、build、三套测试全部通过 |

## 补充任务：线上入会“付不了款 / 要等审批”诊断（2026-11-03，只读，线上没有改动）

- 线上 Stripe 是**正式收款模式**（`cs_live_`），`/api/checkout` 返回 200，能跳到付款页。Production 的 4 个关键变量都在：DATABASE_URL、STRIPE_SECRET_KEY、STRIPE_WEBHOOK_SECRET、NEXT_PUBLIC_SITE_URL。（盘点时我误记 NEXT_PUBLIC_SITE_URL 只在 Preview，已更正。）
- 让人以为“要先审批”的原因：
  1. `/zh/membership` 写的“4 步加入”是“提交申请 → 初步评估 → 30 分钟沟通 → 确认后提供付款方式，3–5 个工作日”；`/zh/contact` 的入会卡片也是同样流程，还连到咨询表单。
  2. 协议写着“完成付款后，且经 SAREC 确认后……保留审核权”。
  3. 付款后状态写成 `under_review`，确认邮件写“将审核您的资料”“进入人工审核”。
  4. 无法确认 Stripe **正式模式**的 webhook 是否配置、能否送达。若送不到，付款页会一直停在“处理中”，需要人工标记，看起来就像在审批。
- 诊断时在正式库留下 3 条测试草稿申请，邮箱 `test+sarec-diag@example.com`、姓名“TEST 测试 请删除”，状态为待付款，需要东哥或工作人员删除。对应的 Stripe 会话 24 小时后自动过期，没有输入任何卡号。
- 已在分支上改好：付款即生效（`approved`）；邮件改为“已生效”；入会页和联系页流程改为“选择档位 → 确认协议 → 在线付款 → 立即生效”，入会按钮指向 `/zh/join`；协议生效条款改为付款（含提交 Zelle 付款说明）即生效，版本升到 v2-draft，**需律师复核**；老数据中已付款但状态是 `under_review` 的，同样算有效会员。

## 待东哥确认清单（我自己做的判断）

1. 正式库和预览共用同一个库，所以另建了独立预览库（Neon `sarec-crm-preview`，只给 Preview），migration 只在本地库和预览库上执行。
2. GitHub 账号 360cpacorp 不能推送到 sarec-org，所以 fork 到 `360cpacorp/sarec-website` 后发 PR。小程序仓库没能建在 sarec-org，只保留本地 git。
3. 仓库是公开的：规格文档（方案、题库、交接、bundle）不提交。第一次推送时曾带上这些文件，几分钟内已从分支历史移除，但 GitHub 上旧提交可能短时间内仍能按编号访问。
4. 会费用 Zelle 时，**提交付款说明即生效为正式会员**，工作人员事后核对到账；核实未到账就撤销（按东哥的补充要求）。活动费、会议室等其他订单仍以核款为准。
5. 未登录的人按邮箱申请入会时，只有新建的档案才直接进付款页；邮箱已有档案的，要先收验证码登录，防止冒用别人的积分和档案。未验证的手机号不用来认人。
6. 积分抵扣会费只在登录后、续费时可用：默认 10 积分抵 1 美元，最多抵一半；取消或未到账时积分冲回。
7. 会员价折扣、电子屏月费、会议室 $50/小时、月卡 $299 都是配置项。会员价公布前一律按标准价，页面显示“会员价即将公布”。电子屏不在提交时收费，审核排期时才按等级生成订单。
8. 签到积分沿用代码里的试点值 20 分（方案 V3.1 第 08 节的建议值）。
9. 登录页放在 `/zh/signin`，因为 `/zh/login` 是旧站的永久跳转（到联系页），浏览器有缓存，所以不动它。
10. 网站扫码登录：网站显示二维码，用小程序首页右上角“扫码”确认。
11. 电子屏素材和二维码以图片数据（≤1MB）存在数据库里，没有另开文件存储。
12. 自我介绍可以打字，也可以用手机键盘的语音输入；只保存原文。AI 提取留了入口，本期不接外部 AI。
13. “待本人确认”的确认题（与工作人员记录冲突、到期复核）已经记录状态，但还没有专门的确认题页面，放到下一阶段。
14. 合并重复档案（微信档案与网站档案都有业务数据时）需要工作人员处理：系统会在审计日志里记 `merge_needed`，但还没有合并工具。
15. 英文切换已预留（页面显示 “English 即将上线”），本期没有翻译。
16. 预览环境设置了 `CRM_DEV_ECHO_CODES=1`（接口直接返回验证码，方便自动测试）。只在预览上有效，生产强制无效；预览用的是独立测试库。
17. 小程序体验版目前连预览测试库（`USE_DEV=true`），上线前改回 false。
18. Stripe 付款成功后回到订单页时，系统会主动向 Stripe 核实一次，所以 webhook 晚到或没配置也能立即到账。webhook 也能识别新的统一订单。

## 下一步

全部里程碑已完成，等东哥看“上线前请东哥点头”的清单。
