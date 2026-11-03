# SAREC 统一后台 + 会员系统 + 小程序 —— 进度记录

> 依据：`docs/specs/ClaudeCode_一次性开发总指令_V2.0.md`（含东哥 2026-11-03 追加的“入会全流程自助”和“Zelle 付款页”两条补充）。
> 会话中断后：读本文件，从“下一步”接着做，不重做、不重问。

## 工作目录

| 项目 | 位置 |
|---|---|
| 网站原工作区（不动） | `~/Desktop/sarec-cleanroom/sarec-website`（分支 `feature/terra-capital-corebusiness`，未提交：`AGENTS.md`；`vercel link` 给 `.gitignore` 追加了一行 `.env*`，并写了 gitignore 里的 `.env.local`） |
| 本次开发 worktree | `~/Desktop/sarec-cleanroom/sarec-crm`，分支 `feature/crm-phase1`（基于 origin/main `600f936`） |
| 小程序 | `~/WeChatProjects/sarec-miniprogram`（AppID `wx344abd2e9dd60794`） |
| 本地测试库 | 自建 Postgres 14 集群，端口 5544，`postgres://postgres@127.0.0.1:5544/sarec_crm_dev`（数据目录在会话 scratchpad；本机 5432 是另一个系统用户的库，不碰） |

注意：仓库 `.gitignore` 忽略了整个 `/docs/`，本目录文件用 `git add -f` 提交。

## 里程碑

| 里程碑 | 状态 | 提交 | 测试 |
|---|---|---|---|
| M0 准备与盘点 | ✅ | 见下 | — |
| M1 导入后台代码，本地 11 组验收 | ✅ | 见 git log | `crm-acceptance.ts` 全部通过：11 组；`pnpm typecheck` 通过 |
| M2 登录 + 报名 + 渐进式补资料 | ⏳ | | |
| M3 付款核款 + 签到 + 会费 Zelle/积分抵扣 + 入会全流程自助 | ⏳ | | |
| M4 我的 + 会议室/月卡/电子屏 + 工作人员后台 | ⏳ | | |
| M5 /api/v1 + docs/api-v1.md + PR + Vercel 预览 | ⏳ | | |
| M6 小程序 | ⏳ | | |
| M7 总验收与汇报 | ⏳ | | |

## M0 盘点（2026-11-03）

**登录**：GitHub `360cpacorp` ✅；Vercel `andy20161014` ✅（东哥扫码完成）；微信开发者工具已登录、服务端口已开 ✅。

**网站仓库**：远程 `github.com/sarec-org/sarec-website`；origin/main 最新 `600f936`（2026-10-19 PR #17）。原工作区在 `feature/terra-capital-corebusiness`，领先 main 一个提交 `6ed6f03`。

**Vercel 项目 `sarec-website` 环境变量（只记名称）**
- Production + Preview 共用：`DATABASE_URL`、`DATABASE_URL_UNPOOLED`、`DATABASE_POSTGRES_*`、`DATABASE_PG*`、`DATABASE_NEON_PROJECT_ID`、`NEXT_PUBLIC_MEDIA_BASE`
- Production：`STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`、`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`、`RESEND_API_KEY`、`ADMIN_ACTION_TOKEN`、`CRON_SECRET`
- Preview：上面这些 + `NEXT_PUBLIC_SITE_URL`、`SAREC_FROM_EMAIL`、`SAREC_ADMIN_EMAIL`
- **Production 没有 `NEXT_PUBLIC_SITE_URL`**（入会付款代码要求它，见补充任务诊断）
- 尚无：`ZELLE_RECIPIENT_NAME`、`ZELLE_RECIPIENT_ID`、`TWILIO_*`、`WX_APPID`、`WX_SECRET`

**数据库**：`DATABASE_URL` 同时配给 Production 和 Preview → **正式库和预览共用同一个 Neon 库**。按 G 节：不在上面执行 migration；改为给本分支单独建预览库（见 M5）。

**小程序工程**：只有微信默认模板（`pages/index`、`pages/logs`），没有业务代码，没有 git，没有远程仓库。

**资料**：5 个文件已复制到 `docs/specs/`；两份 .docx 已转成 `方案_V3.1.txt`、`题库_V1.1.txt`；Downloads 里两份 ChatGPT 交接 .txt 内容相同。`~/Downloads/zelle-qr.png` 不存在 → Zelle 二维码先用占位图。

## 待东哥确认清单（我自己做的判断）

1. 正式库与预览共用同一库 → 本分支的 migration 只在本地库和单独的预览库执行。

## 下一步

M2：登录（邮箱验证码 + Bearer）、活动报名页 `/zh/e/[slug]`、成功页补资料、我的资料。
