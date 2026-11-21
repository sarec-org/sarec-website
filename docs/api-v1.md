# SAREC 业务接口 `/api/v1`（网站页面与小程序共用）

所有接口只返回 JSON，`Cache-Control: no-store`。

> **后台综合优化 C（11/21）新增 / 改动的接口**（详见各节；正文末尾第 13 节是 B 的「今天」页）
> - 发送：所有新对外发送走 B 的 `lib/crm/notifyGate.ts`（`gateSend`）；C 的真正发送函数包在 `lib/crm/notifySend.ts`（`gatedSend`）。
> - `GET/POST /api/v1/staff/notify`：手机通知设置（每人渠道、收哪几类、负责人、总闸开关〔管理员〕、最近通知、发送记录）。
> - `POST /api/cron/staff-notify`（GitHub Actions 每 15 分钟）：夜里攒的通知早 8 点合成一条、8:30 每日汇总、活动自动“已结束”、测试 / 审核演示账号打标记。
> - `GET /api/v1/me/committees` 另带 `profile { hasName, hasPhone, needsFill }`；`POST` 可带 `name`、`phone`；缺姓名或手机号返回 400 `need_name_phone`（1.4.3 及以前的小程序不带这两个字段时照常记下并标“待补填”）。
> - `GET /api/v1/staff/committees`：意向名单（真实姓名、手机、邮箱、待补填）。
> - `GET /api/v1/staff/events/:id/hub`：活动页分栏数字和状态。
> - `POST /api/v1/staff/checkin { eventId, contactId }` 返回另带 `missingPhone`；`{ eventId, contactId, addPhone }` 补手机号；现场登记手机号必填（`need_phone`）。
> - `POST /api/v1/staff/join-requests { id, action: 'nudged' }`；`GET ?id=` 只看一条。`submitJoin` 返回另带 `linkSent`。
> - `GET /api/v1/staff/contacts?view=customers|opened|all` 返回另带 `counts`；`POST /api/v1/staff/contacts/:id { action: 'account_kind', kind }`（管理员）。
> - `GET /api/v1/staff/orders?status=demo`：审核演示 / 内部 / 测试账号的订单（其余状态不再含这些）。
> - 小程序扫码签到 `step.kind = 'new'` 另带 `prefillName`、`needPhoneOnly`（档案里没有手机号的人先补手机号）。

- **成功**：`{ "ok": true, ...数据 }`
- **失败**：`{ "ok": false, "error": { "code": "...", "message": "大白话提示" } }`
- **登录身份**：网站用 httpOnly cookie `sarec_session`；小程序用请求头 `Authorization: Bearer <token>`。两者等价。
- **权限标记**：🌐 公开 · 👤 需登录 · 🛠 工作人员（括号内为角色；`admin` 拥有全部权限）。
- **重复请求**：所有写操作都能安全重复提交。下表“重复请求”一栏写明各接口的处理方式。

## 通用错误码

| code | HTTP | 含义 / 页面应提示 |
|---|---|---|
| `unauthorized` | 401 | 请先登录（邮箱或手机收验证码） |
| `forbidden` | 403 | 没有这个操作的权限 |
| `not_found` | 404 | 找不到（活动 / 订单 / 人） |
| `bad_request` / `bad_answer` / `invalid` | 400 | 输入有误，`message` 里写了怎么改 |
| `conflict` | 409 | 状态冲突，例如会议室时段已被预约、订单已提交过 |
| `too_soon` | 429 | 60 秒内重复发验证码 |
| `too_many_attempts` | 429 | 验证码输错 5 次，需要重新获取 |
| `sms_unavailable` | 503 | 短信未配置，请用邮箱 |
| `merge_needed` | 409 | 联系方式已属于另一份档案，请工作人员合并 |
| `server_error` | 500 | 系统忙，已填内容不丢，稍后重试 |

---

## 1. 登录（不设密码）

| 接口 | 权限 | 参数 | 返回 | 重复请求 |
|---|---|---|---|---|
| `POST /auth/code/send` | 🌐 | `{ channel: 'email'\|'sms', target }`；手机号要带国家码，如 `+1…` / `+86…` | `{ target }`；测试环境（`CRM_DEV_ECHO_CODES=1`，生产强制关闭）另返回 `devCode` | 同一目标 60 秒内拒绝（`too_soon`） |
| `POST /auth/code/verify` | 🌐 | `{ channel, target, code, name?, client?: 'web'\|'miniprogram', bind?: boolean }` | `{ contactId, created }`。网站写 cookie；小程序另返回 `token`。`bind=true` 时，把这个联系方式绑定到当前（微信）档案 | 验证码一次性使用；6 位、10 分钟有效、最多试 5 次、只存哈希 |
| `POST /auth/wechat` | 🌐 | `{ code }`，即 `wx.login` 返回的 code | `{ token, contactId, needsBind }`。`needsBind=true` 时，引导用户验证邮箱或手机 | 同一 openid 始终对应同一档案 |
| `POST /auth/qr` | 🌐 | — | `{ code, poll, expiresAt, scanText }`。网站把 `scanText`（`SAREC-LOGIN:<code>`）显示为二维码，有效 3 分钟 | 每次新建一个 |
| `GET /auth/qr?poll=` | 🌐 | `poll` | `{ status: pending\|approved\|expired }`。`approved` 时写 cookie | 会话只能领取一次 |
| `POST /auth/qr/approve` | 👤 | `{ code }`，小程序扫码得到 | `{ message }` | 过期或已用返回 `qr_expired` |
| `POST /auth/logout` | 👤 | — | `{ ok }` | 幂等 |

身份规则：一人一个稳定会员编号。小程序首次登录时，会先建一个临时微信档案。如果用户之后验证的邮箱或手机号已经属于某个网站账号，系统会把微信身份并到那个账号，不新建档案。临时微信档案上如果已经有业务数据，则返回 `merge_needed`，交给工作人员合并。不调用 `getPhoneNumber`。

## 2. 基础数据

| 接口 | 权限 | 返回 |
|---|---|---|
| `GET /meta` | 🌐 | `roleCategories`（13 个大类和细分行业）、`quickRoles`（8 个常用角色）、`topics`（活动主题）、`smsAvailable` |

## 3. 活动、报名、签到

| 接口 | 权限 | 参数 | 返回 | 重复请求 |
|---|---|---|---|---|
| `GET /events?past=1` | 🌐 | — | `events[]`（不含签到密钥） | — |
| `GET /events/:slug` | 🌐 / 👤 | — | `event`、`loggedIn`、`firstTime`、`alreadyRegistered`、`registrationStatus`、`required[]`（本次必答题，最多 3 道）、`name`、`identity`。只预览，不写入数据 | — |
| `POST /events/:slug/register` | 👤 | 首次报名：`{ name, roleSub, roleOther?, nameAlt? }`；再次报名：`{ answers: [{ code, value }] }`；可选 `ref`（邀请人会员编号）、`channel` | `{ status: registered\|waitlisted, alreadyRegistered, orderNo, taskId, message, pointsAwarded }`。必答题没答齐时返回 `answers_required` | 一人一场只有一条报名记录、一个补资料任务；收费活动只生成一张订单 |
| `POST /events/:slug/cancel` | 👤 | — | `{ message }`。未付款的订单同时取消；已签到的报名不能取消 | 幂等 |
| `POST /events/:slug/checkin` | 👤 | `{ k, name?, roleSub? }`，`k` 是签到码密钥 | `{ result: { kind, message, orderNo?, amountCents? } }`，`kind` 取值见下 | 重复扫码返回 `already`，不重复签到、不重复发分 |
| `GET /events/:slug/ics` | 🌐 | — | 日历文件（`.ics`） | — |

签到结果 `kind`。所有签到路径都走同一套入场判断 `checkIn()`：

- `checked_in`：签到成功。
- `already`：已签到过。
- `pending_payment`：收费活动还没核款，不显示“签到成功”，同时返回订单号。
- `waitlisted`：名额已满。
- `rejected`：活动已取消或已结束。
- `need_profile`：现场新客，先补姓名和行业再提交。

扫错签到码时返回错误 `wrong_code`。

答案 `value` 格式：

| 题型 | 格式 |
|---|---|
| 单选 | `{ choice, detail? }` |
| 多选 | `{ choices: [], detail? }` |
| 文字 | `{ text }` |
| 月日 | `{ month, day }`，或 `{ choice: '不想填写' }` |

服务端会校验选项是否在题目给定的范围内。

## 4. 渐进式补资料（严格按题库 V1.1）

| 接口 | 权限 | 参数 | 返回 | 重复请求 |
|---|---|---|---|---|
| `GET /profile/next?taskId=&event=` | 👤 | `taskId`（可省）或 `event`（活动 slug）；两者都没有时，归入资料中心的持续任务 | `{ taskId, question, remaining, s01, earnedThisTask, completeness: { done, total } }`。`question.badge` 来自 `itemBadge()`，与实际发分一致 | — |
| `POST /profile/answer` | 👤 | `{ taskId?, code, value }` | `{ taskId, pointsAwarded, needsMoreText, message }` | 同一题终身只发一次分（`profile:<人>:<题>` 唯一） |
| `POST /profile/skip` | 👤 | `{ taskId?, code }` | `{ taskId }` | 幂等。本任务内不再出现；在两个不同任务里都被跳过的题，冷却 180 天 |

AI 提取答案留了入口：`recordAnswer(..., source: 'ai_confirmed', settle: false)`。本期没有接任何外部 AI 服务。

## 5. 我的

`GET /me` 👤 一次返回以下内容：

- `contact`
- `member`：`isMember`、`tierName`、`startDate`、`endDate`、`paymentPending`、`expired`
- `membershipPending`：已提交 Zelle、待确认到账的会费订单；没有时为 null
- `points`：`balance` 和 `ledger`
- `profile`：资料完成度，X/13 或 X/14
- `registrations`
- `orders`
- `bookings`
- `passes`

注册用户 `isMember=false`，不发正式会员卡。

## 6. 订单与付款（会费、活动费、会议室、月卡、电子屏共用一套）

| 接口 | 权限 | 参数 | 返回 | 重复请求 |
|---|---|---|---|---|
| `GET /orders/:no?stripe=success` | 👤（仅本人） | `stripe=success` 时，主动向 Stripe 核实一次 | `{ order, zelle: { name, id, qrUrl, configured }, stripe: { available } }`。Zelle 信息来自环境变量 `ZELLE_RECIPIENT_NAME`、`ZELLE_RECIPIENT_ID`、`ZELLE_QR_URL`，缺失时显示“待配置” | — |
| `POST /orders/:no/note` | 👤 | `{ note, payerName? }` | `{ status: 'payment_submitted' }`，即“已提交，待确认到账”。会费也要等工作人员核对到账才生效 | 只从“待付款”变为“待核款”一次；重复提交返回原状态 |
| `POST /orders/:no/stripe` | 👤 | — | `{ url }`，即 Stripe 付款页 | 订单已提交付款时返回 `conflict` |

到账只有两条路径，到账后的业务动作统一由 `onOrderPaid()` 执行：

1. 工作人员核款。
2. Stripe webhook（`metadata.orderNo`）或用户付款后回跳时向 Stripe 核实。

两条路径都只会生效一次，重复的回调或点击不会重复处理。

## 7. 会费（网上全流程自助）

| 接口 | 权限 | 参数 | 返回 | 重复请求 |
|---|---|---|---|---|
| `POST /membership/apply` | 🌐 / 👤 | 与原 `/api/checkout` 相同的表单字段，`agree: true`；另有 `usePoints?` | `{ orderNo, amountCents, pointsRedeemed, needLogin }` | 7 天内同一人同一档位还有未付款订单时，返回原订单 |
| `GET /membership/quote?tier=` | 🌐 / 👤 | — | `{ quote: { renewal, feeCents, balance, maxDiscountCents, pointsNeeded }, member }` | — |

`membership/apply` 的补充说明：

- 填表并同意协议后生成会费订单，不需要审批。款项到账即生效：刷卡即时到账；Zelle 要等工作人员在核款工作台点“确认到账”后才生效。核实未到账的，订单取消，抵扣的积分冲回。
- 未登录时，只有本次新建的档案会直接拿到会话。邮箱已有档案时返回 `needLogin=true`，需先用验证码登录，防止冒用他人邮箱。

积分抵扣规则：

- 只用于续费，不用于首次入会，最多抵会费的一半。
- 默认 10 积分抵 1 美元，可在配置 `points_per_dollar` 中修改。
- 必须已登录。
- 抵扣记入积分账本，`category=redeem`；订单取消或核实未到账时，积分按账本冲回。

## 8. 会议室、月卡、电子屏、商家优惠

| 接口 | 权限 | 参数 | 返回 | 重复请求 |
|---|---|---|---|---|
| `GET /rooms?from=ISO&days=` | 🌐 / 👤 | — | `rooms`（标准价和本人价格）、`busy`（只有时段，不含他人姓名）、`openHours`、`pass`、`notice`（规则调整条款） | — |
| `POST /rooms/book` | 👤 | `{ roomId, startsAt, endsAt, purpose? }`：整点或半点、9:00–21:00（洛杉矶时间）、单次最多 8 小时 | `{ booking: { kind: confirmed\|held, orderNo?, amountCents? } }`。当月有有效月卡时直接确认 | 先到先得，由数据库排他约束保证；时段重叠返回 `409 conflict` |
| `POST /rooms/bookings/:id/cancel` | 👤（仅本人） | — | `{ message }` | 幂等。未付款的订单同时取消 |
| `POST /rooms/pass` | 👤 | `{ month: 'YYYY-MM' }` | `{ orderNo, status, existing }` | 同一个月只有一张月卡 |
| `GET /screen-ads` | 🌐 / 👤 | — | `{ tier, free, pricesPublished, mine[] }` | — |
| `POST /screen-ads` | 👤 | `{ orgName, intro, serviceArea?, qrUrl?, assetUrl?, months }`；图片可传 data URL，不超过 1MB | `{ id, message }`。工作人员审核排期时生成订单；副会长、战略伙伴免费 | — |
| `GET /offers` | 🌐 | — | `offers[]` | — |

会员价发布前（配置 `member_prices_published=false`）一律按标准价，页面显示“会员价即将公布”。

## 9. 工作人员后台 `/api/v1/staff/*`

工作人员用邮箱验证码登录，再按 `staff_roles` 表授权。关键操作都写入 `crm_audit_log`。

| 接口 | 角色 | 说明 |
|---|---|---|
| `GET /staff/me` | 任一工作人员角色 | 返回本人角色。未登录 401，不是工作人员 403 |
| `GET /staff/events` · `POST /staff/events` | ops、checkin（查看）· ops（新建） | 活动列表（含人数）· 新建活动 |
| `GET` · `PATCH` · `POST {action:'regenerate_code'}` `/staff/events/:id` | ops、checkin（查看）· ops（修改） | 详情、名单、签到码 · 修改或关闭报名 · 重新生成签到码（旧码立即失效） |
| `GET /staff/checkin/search?q=&eventId=` | checkin | 按姓名、手机号（可只输后 4 位）、邮箱查人 |
| `POST /staff/checkin` | checkin | `{ eventId, contactId }` 代签到；`{ eventId, onsite: { name, phone?, email?, roleSub? } }` 现场登记加签到。都走 `checkIn()` |
| `GET /staff/orders?status=&purpose=&q=` | finance | 核款工作台，“待核款”排在最前 |
| `POST /staff/orders/:no/verify` | finance | `{ reference? }` 一键确认到账。重复点击返回 `changed:false` |
| `POST /staff/orders/:no/reject` | finance | `{ reason }`（必填）核实未到账：取消订单、退回抵扣积分（会费订单的申请同时取消） |
| `GET /staff/contacts?q=&region=&roleCategory=&topic=&tag=&member=&format=csv` | ops | 客户查询与筛选；`format=csv` 导出（UTF-8 BOM，Excel 可直接打开） |
| `GET /staff/contacts/:id` | ops | 档案、标签（带来源）、每题回答历史（带来源和状态）、完整时间线 |
| `POST /staff/points` | admin | `{ contactId, points, reason }` 调整积分；`{ reverseLedgerId, reason }` 冲正。原因必填 |
| `GET` · `POST /staff/rooms` | ops | 预约排期 · 工作人员取消预约 |
| `GET` · `POST /staff/screen-ads` | ops | 电子屏审核与排期。审核通过时按等级生成订单；驳回需填说明 |
| `GET` · `POST /staff/display` | ops | 官网展示审核。只改展示字段，不影响会员身份 |
| `POST /staff/offers` | ops | 商家优惠的新增、修改、删除 |
| `GET` · `POST /staff/settings` | admin | 会员价折扣、电子屏月费、价格是否公布、积分抵扣比例、月卡价格、会议室价格、工作人员角色 |

原有的 `ADMIN_ACTION_TOKEN` 管理页（`/admin/membership`、`/api/admin/membership`）和 Stripe 直跳流程（`/api/checkout`）保留不动，作为备用。

## 10. 环境变量（只列名称）

| 变量 | 用途 | 缺失时 |
|---|---|---|
| `DATABASE_URL` | 业务数据库 | 接口返回 500 |
| `RESEND_API_KEY`、`SAREC_FROM_EMAIL`、`SAREC_ADMIN_EMAIL` | 验证码、入会确认邮件 | 邮箱登录不可用 |
| `TWILIO_ACCOUNT_SID`、`TWILIO_AUTH_TOKEN`、`TWILIO_FROM` | 短信验证码（可选） | 提示“短信暂不可用，请用邮箱” |
| `WX_APPID`、`WX_SECRET` | 小程序登录 | 小程序引导用邮箱验证 |
| `ZELLE_RECIPIENT_NAME`、`ZELLE_RECIPIENT_ID`、`ZELLE_QR_URL`（可选，默认 `/crm/zelle-qr.png`） | 付款页 | 显示“待配置” |
| `STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET` | 银行卡付款 | 付款页隐藏银行卡入口 |
| `CRM_DEV_ECHO_CODES` | 只用于测试环境，在响应里返回验证码 | 生产环境（`VERCEL_ENV=production`）强制无效 |

## 11. 测试

```bash
DATABASE_URL=… pnpm dlx tsx scripts/crm-acceptance.ts   # 题库 V1.1 的 11 组验收
DATABASE_URL=… pnpm dlx tsx scripts/crm-api-tests.ts    # 工作人员后台，9 组
BASE=http://localhost:3400 STAFF_EMAIL=… pnpm dlx tsx scripts/crm-e2e-http.ts   # 总指令 I.2 全流程，8 组（真实 HTTP）
```

## 12. 找工人 · 接活儿 `/api/v1/jobs/*`（迁移 0038）

小程序判断：请求头 `X-Sarec-Client: mp-…`、`servicewechat.com` 来源或小程序会话都算小程序。**小程序调用活儿相关接口（`/jobs/posts*`、`/jobs/me/posts`、`/jobs/upload`）一律 404**（D1：活儿只在网站）；**例外（D10）**：`GET /jobs/me/matched` 小程序可调；`POST /jobs/posts/:id/contact` 小程序只对 matched 里的活儿开放，其余照旧 404。
开关默认（D11）：迁移 0038 新建时 `jobs_find_on`、`jobs_work_on` 默认**开**（开关只留给日后整栏下线）；已有的值不改。

**指令 9（11/20 21:35）改动一览（D22–D28，小程序照这里调）**
- **D28 接活儿收费方式**（替换 `jobs_require_paid_member`）：`crm_settings.jobs_work_fee_mode` = `all_free` 全部免费 / `free_quota` 免费额度（**默认**）/ `members_only` 必须是会员；`jobs_free_contacts` 免费联系次数（默认 2）；`jobs_free_posts` 非会员免费发活儿次数（默认 `null` = 不限）。0038 幂等：库里有旧键就转换（开 → `members_only`，关 → `all_free`），全新的库种 `free_quota`；旧键留着不删。
  - `GET /jobs/meta` 的 `switches` = `{find, work, requirePaid（兼容：= feeMode 是 members_only）, feeMode, freeContacts, freePosts}`；`me.pro` 多 `freeLeft`（还能免费联系几位；`null` = 不限 / 不适用：会员、工人、全部免费、必须是会员）、`freeLeftText`「还可以免费联系 X 位」。
  - 规则：`free_quota`、`all_free` 时非会员核验通过即上列表（`needPay=false`）；`members_only` 和以前 `requirePaid` 开一样。看发布人电话（`POST /jobs/posts/:id/contact`，含小程序 matched 那条）：`free_quota` 时非会员**每看一条新活儿扣一次**，同一条重复看不扣；用完 → `403 {code:'quota_used_up', message:'免费次数用完了，成为商会会员后可以继续'}`（看过的那几条照样能看）。会员一律不限；工人不扣。需要执照的工种照旧要核验（核验不过一律不能联系，没有例外）。
  - 成功联系返回多 `freeLeft`、`freeLeftText`（扣完之后的剩余；不适用时 `freeLeft=null`）。`GET /jobs/posts/:id` 多 `freeLeft`；用完时 `canContact=false, reasonCode='quota_used_up', needPay=true`。
  - `GET /jobs/me/pro` 顶层和 `pro` 里都给 `freeLeft`、`freeLeftText`（`pro` 另有 `feeMode`）；`GET /jobs/me/matched` 多 `freeLeft`、`freeLeftText`（用完了列表照样给，联系时才返回 `quota_used_up`）。**小程序返回里没有任何金额**。
  - 发活儿：`freePosts` 有数时，非会员按发布次数算（一次选几个工种拆成几条也只算一次），超了 `403 {code:'post_quota_used_up', message:'免费发布次数用完了，成为商会会员后可以继续发布（非会员可以免费发 N 次）'}`；会员、工作人员不限。
  - 工作人员 `GET/PATCH /workbench/jobs/switches`：PATCH 收 `{feeMode?, freeContacts?（0–99）, freePosts?（0–999，null 或 '' = 不限）}`（旧的 `{requirePaid}` 也认：true → members_only，false → all_free），值不对 `400` 人话；只限 admin；立即生效；每项改动写 `crm_audit_log`（action=jobs_switch，谁、何时、改前改后）。返回多 `feeModes[{key,label,hint}]`、`changes.feeMode/freeContacts/freePosts`、`log[{key,name,actor,at,before,after}]`（最近 30 条）。
  - `GET /workbench/jobs/stats` 多 `freeQuota{freeUsedPeople（用了免费额度的人数）, usedUpPeople（用完的人数）, joinedAfterUsedUp（用完后入会的人数）}`。
- **D27 层级数据**：`GET /jobs/meta` 的 `groups[]` 每组多 `tradeKeys[]`（组里开放的工种）、`hasPros`（组里有没有核验通过的人）；`trades[].hasPros` 照旧（没人的标“招募中”= `recruitingLabel`）。`GET /jobs/pros` 多 `trades=a,b`（多工种，逗号分隔）；`group=` 照旧；都不给 = 全部。网站新列表页 `/zh/jobs/find?group=&trade=`（顶上工种标签同页切换），旧 `/zh/jobs/find/<工种>` 照样能开；登记 `/zh/jobs/register?role=company|licensed|pro_service|worker`（身份已选，顶上四个身份切换条）。
- **指令 10**：分组 `clean` 改名「家政保洁」排第一（清洁保洁、家电维修、垃圾清运、园艺养护）；新工种 `appliance_repair` 家电维修（B 类，BHGS 登记）；`trades[].scope` 范围说明（没有为 null）；首页 7 个入口默认：家政保洁（group:clean）、水管、电工、空调暖气、房屋维修、装修、设计。
- **D29 常显入口**：`homeEntries[]` 多 `pinned`（常显：不管有没有核验通过的人都显示）、`hasPros`（指向的工种 / 这一组里有没有核验通过的人）。首页规则：`pinned` 的一律显示，`hasPros=false` 时方块标“招募中”（`recruitingLabel`）；不是 pinned 的照旧有人才显示；冷启动（`anyPros=false`）时招募那行字下面照样出 pinned 的入口和「全部工种和服务」。种子里只有家政保洁 pinned。工作人员 `PUT /workbench/jobs/home-entries` 每项收 `pinned?`（不传沿用这个入口原来的值），`GET /workbench/jobs/trades` 的 `homeEntries` 带 `pinned`。
- **D26**：`GET /jobs/meta` 多 `openTradeCount`（开放工种数）、`allTradesText`「全部 N 项 ›」。
- **D25 改名**：接口返回给人看的文字统一「我要接活儿 / 登记接活儿 / 我的接活儿 / 接活儿资料」（“接活人”不变；通知短信「SAREC 接活儿提醒」）。
- **D22 测试站固定验证码只认名单**（只在 `VERCEL_ENV=preview`，正式站没有这段）：名单 = 虚构号 +1 xxx 555-0100～555-0199（任何区号）+ 测试库 `crm_settings.test_fixed_code_phones`（数组，默认空）。名单外：`POST /auth/code/send {channel:'sms'}`、`POST /me/phone/send`、`POST /me/phone/verify` 一律 `400 {code:'test_phone_only', message:'测试站只认测试号码（例如 949-555-0199），这个号码在测试站发不出验证码'}`。`testFixedCodeText` 改成「测试站：只认测试号码（例如 949-555-0199），验证码固定为 246810」。体验版：验证手机填 949-555-0199，验证码 246810。
开关（D3）：`find` 关时找工人那边的接口（`/jobs/pros*`、`POST /jobs/posts`）返回 `403 not_open`「这个功能还没开放」；`work` 关时接活那边（`GET /jobs/posts*`、`/jobs/me/pro*`）同样。**工作人员不受开关限制**（meta 里 `staffPreview=true`，页面显示 `staffPreviewText`）。
新错误码：`not_open`（403，功能没开放）、`not_eligible`（403，不能联系发布人，`message` 是一句人话原因）、`need_phone`（400，先验证手机号）。

### 公开 / 登录用户

| 接口 | 权限 | 参数 | 返回 |
|---|---|---|---|
| `GET /jobs/meta` | 🌐 | — | `switches{find,work,requirePaid}`、`staffPreview`、`staffPreviewText`、`groups[{key,name,order}]`、`trades[{key,name,group,licType:'A'\|'B'\|'C',open,hasPros,noPost,noNotify,icon}]`、`homeEntries[{label,icon,target:{type:'trade'\|'group',key}}]`（7 个，按顺序）、`cities[{region,items:[{key,name}]}]`（城市表，按地区和顺序，只含启用的；发活儿、登记、筛选都用它，提交 key）、`me.pro`（null 或 `{id,role,status,listed,needPay,freeLeft,freeLeftText}`）、`latest`（≤3 张活儿卡片；小程序、接活开关关时为 `[]`）、`options{proRoles,posterRoles（小程序不含 crew）,timings,propertyTypes,languages,cityGroups[{region,cities:[名字]}]（旧字段，从城市表生成，新代码用 `cities`）,turnoverTrades,siteVisitTrades}`、`rules[]`、`disclaimer`、`subscribeTemplate`（派活订阅消息模板 ID 或 null）、`webUrl`、`postUrl`；**D11 冷启动**：`anyPros`（有没有任何开放工种已有核验通过的人；`false` 时首页「找工人」方块区换成 `recruitingText`「正在招募各工种的接活人，可先发布活儿等人联系」＋「全部工种和服务」）、`recruitingText`、`tradeRecruitingText`「这个工种正在招募接活人」、`recruitingLabel`「招募中」。`trades` 含全部工种（包括没人的，`hasPros=false`）：全部工种页出所有 `open` 的，没人的标“招募中”，点进去是 `tradeRecruitingText` ＋ 发布活儿 / 登记接活。不区分审核员 |
| `GET /jobs/pros?trade=&group=&city=&role=worker&cursor=` | 🌐（find 开关） | `trade` 或 `group` 二选一；`city` = 城市 key（名字也认，停用的城市也能筛）；`role=worker` 只列工人（网站施工队招工用，默认不含工人） | `items[接活人卡片]`、`cities[{key,name}]`（这批人服务的城市，按城市表顺序）、`nextCursor` |
| `GET /jobs/pros/:id` | 🌐（find） | — | `pro`（卡片） |
| `POST /jobs/pros/:id/contact` | 🌐（find）· 小程序可调 | — | `{phone, wechat, name}`。**指令 7 · D17：不用登录、不用验证手机**（小程序头、网站游客都能点）；每次点击记 `jobs_pro_clicks`（登录的记档案，游客记 IP 加盐哈希，不存原始 IP；`client` mp/web），登录的另记 jobs_contacts direction=pro。**频率限制**：登录的按身份、游客按 IP——1 小时内最多 20 个不同的接活人、24 小时内最多 60 个；24 小时内看过的同一个人再点不算新的；工作人员、看自己不限。超了 `429 {code:'too_many_attempts', message:'查看太频繁了，请稍后再试，或加商会微信'}`（被挡的也记一行 `limited=true`）。发布人电话（`/jobs/posts/:id/contact`）规则不变 |
| `GET /jobs/me/pro` | 👤（work） | — | `pro`（本人完整资料或 null）、`prefill{name,personName,avatar,phone,wechat,intro,role,trades,cities,isMember}`（现有会员资料自动带入）、`rules[]`、`subscribeTemplate` |
| `POST /jobs/me/pro` | 👤（work） | `{agree:true, role:'company'\|'licensed'\|'pro_service'\|'worker', name, avatar?, trades[], cities[城市 key]（必须是城市表里启用的，名字也认）, years?, languages[]?, availableNow?, licenseNo?, intro?, photos[≤9]?, teamSize?, insuranceUrl?, businessRegUrl?, licenseDocUrl?, wechat?, designNoCaStamp?}` | `{pro, autoCheck}`。规则：施工队/持牌师傅必须填牌照号；设计与专业服务选了 A/B 工种要执照号；选了 C 工种要营业登记（或执照）；必须有已验证手机号（否则 `need_phone`）。状态由服务器定：工人登记即生效（不进业主找人列表，只给施工队招工用）；其他人 `pending` 等工作人员核验，A 类牌照自动排队对 CSLB 官方总表（`autoCheck.state='queued'`，D20 起由每天的 GitHub 任务处理，一般一天内出结果）。已通过的人改资料：新加的工种、换牌照号 → `needsReview`，原来通过的工种照常上列表 |
| `PATCH /jobs/me/pro` | 👤（work） | `{availableNow:boolean}` | `{pro}` |
| `POST /jobs/me/pro/photo?kind=avatar\|work\|license\|insurance\|bizreg` | 👤（work） | multipart `file`（≤6MB） | `{url, kind}` |
| `POST /jobs/me/subscribe` | 👤 | `{accepted:[模板ID]}` | `{saved, quota}`：允许一次记一次，派活时用掉一次 |
| `GET /jobs/me/notified` | 👤 | — | `{count, webUrl}`；网站另有 `items[活儿卡片 + notifiedAt]` |
| `GET /jobs/me/matched?cursor=` | 👤（work）· **小程序可调**（D10） | — | **指令 7 · D19**：小程序头调第一页时，对口活儿里 `sec_status='unchecked'` 且 `sec_note='no_openid'`（网站发的、发布人没有小程序 openid）的，用当前接活人的 openid 补检 `msgSecCheck`，结果记回 `sec_status`、`sec_checked_at`，`sec_note='viewer:<pro id>'`，检一次就记住；补检没结果（没配微信密钥 `no_wx_config` / 出错）不记、下次再试。`{eligible, reason, needPay, items[{id, city（名字）, trade（key）, tradeName, description（情况说明）, timing, timingLabel, createdAt, contacted（我联系过没有）}], nextCursor}`。只给 `status=verified` 的施工队/持牌师傅/设计与专业服务，且 `requirePaid` 开着时要是缴费会员（否则 `eligible=false` + 一句人话 `reason`，未缴费时 `needPay=true`）；工人、没登记的 `eligible=false`。活儿条件：房主/房东/物业/开发商发的（招工不给）、找人中没到期、工种在他的 `verifiedTrades` 里、城市在他的服务城市里、情况说明内容安全 `sec_status='pass'`、不是自己发的。**不给预算、任何金额、照片、语音、标题** |
| `GET /jobs/entry` | 🌐 | — | `{show, find, work}`（D12：网站顶部菜单「找工人·接活儿」和首页入口跟开关走，两个都关 `show=false`；可缓存 60 秒） |
| `GET /jobs/posts?trade=&city=&cursor=` | 🌐（work）· 小程序 404 | `city` = 城市 key | `items[活儿卡片]`、`cities[{key,name}]`（有活儿的城市）、`nextCursor`。只列找人中、没到期的 |
| `GET /jobs/posts/:id` | 🌐 · 小程序 404 | — | `post`（卡片 + `description,photos,voiceUrl,propertyType,propertyTypeLabel,callName,wantSiteVisit,turnover,mine`）、`canContact`、`reason`（不能联系的人话原因）、`reasonCode`、`needPay`。**不含电话、不含地址** |
| `POST /jobs/posts` | 👤（find）· 小程序 404 | `{posterRole:'owner'\|'landlord'\|'property'\|'developer'\|'crew', trades[]（或 trade）, cityKey（城市表里启用的 key；旧写法 `city` 传名字也认，表里没有的一律 400）, description?, photos[≤9]?, voiceUrl?, timing:'asap'\|'week'\|'month'\|'flexible', budget?, propertyType?:'house'\|'condo'\|'commercial', callName?, wechat?, wantSiteVisit?, turnover?, crewHeadcount?, crewDuration?, crewPay?}` | `{ids[], batchId, next}`。**按工种拆单**：选几个工种就拆成几条（同一 `batchId`），退租整修 `turnover=true` 时页面预选 `options.turnoverTrades`。描述 / 语音 / 照片至少一样；`crew` 必填 `crewHeadcount`、`crewDuration`。手机号用已验证的（没有 → `need_phone`）。标题自动生成：`城市 · 工种 · 一句话`（从描述第一句截 16 字；招工为 `城市 · 工种 · 招工人 N 人`）。发布即通知第一批（`next` 是给发布人看的“接下来会发生什么”） |
| `PATCH /jobs/posts/:id` | 👤 发布人 · 小程序 404 | `{status?:'open'\|'found'\|'closed', renew?:true, description?, cityKey?, photos?, voiceUrl?, timing?, budget?, propertyType?, callName?, wechat?, wantSiteVisit?, crewHeadcount?, crewDuration?, crewPay?}`；续期链接不登录：`{renew:true, token}` | `{post}`。续期 = 从现在起再 14 天（已到期关闭的重新变成找人中） |
| `GET /jobs/me/posts` | 👤 · 小程序 404 | — | `items[卡片 + description,photos,batchId,closeReason,expired,notifiedCount,contacts[{proId,name,roleLabel,at,times}]]` |
| `POST /jobs/posts/:id/contact` | 👤 · 小程序只限 `/jobs/me/matched` 里的活儿（其余 404） | — | 有资格：`{phone, wechat, callName}`，记录谁看过；没资格：`403 {code:'not_eligible', message}`（见下） |
| `POST /jobs/upload?kind=photo\|voice` | 👤 · 小程序 404 | multipart `file`（图片 ≤6MB，语音 ≤8MB） | `{url, kind}` |
| `POST /jobs/report` | 🌐 / 👤 | `{targetType:'pro'\|'post', targetId, reason}` | `{id, message}`；进后台「待跟进」（ops_exceptions kind=jobs_report）和投诉列表 |
| `GET /jobs/followup/:token` | 🌐 | — | `followup{title, side:'poster'\|'pro', answered, questions[{key,text}], answers}` |
| `POST /jobs/followup/:token` | 🌐 | `{reached?, deal?, satisfied?, note?}`（布尔） | `{message}`；结果只进后台 |

`GET /jobs/me/pro` 的 `pro` 是本人编辑用：`cities` 是 key、`cityNames` 是名字。

**接活人卡片**：`{id,name,avatar,role,roleLabel,trades[名称],tradeKeys[],cities[名字],cityKeys[],years,languages[],availableNow,intro,photos[],teamSize,badges[{kind,text}],licenseNo?}`。`badges.kind`：`license`「执照已核验 2026-11-20」（A、B 类）/ `no_state_license`「此类服务无需州执照」/ `business_reg`「已提供营业登记」/ `insurance`「已提供责任保险」/ `member`「缴费会员」/ `note`「方案与咨询，不提供加州报批签章」。分开显示，`text` 直接用。施工队、持牌师傅一定带 `licenseNo`。

**活儿卡片**：`{id,title,summary（描述前两行）,city（当前名字）,cityKey,trade,tradeName,posterRole,posterLabel,timing,timingLabel,budget?（有才给）,crew?{headcount,duration,pay?},status,statusLabel,createdAt,expiresAt}`。状态：`open` 找人中 / `found` 已找到 / `closed` 已关闭（到期自动关闭时 `closeReason='expired'`）/ `removed` 已下架（工作人员）。

**谁能看发布人电话**（原始指令第四部分；`POST /jobs/posts/:id/contact`、`GET /jobs/posts/:id` 的 `canContact/reason`）：
- 房主 / 房东 / 物业 / 开发商发的：只有核验通过、这个工种在 `verifiedTrades` 里的施工队或公司、持牌师傅、设计与专业服务（C 类工种 = 交了营业登记并通过）。`requirePaid` 开着时还要是缴费会员（否则 `needPay=true`，“核验已通过，成为缴费会员后就能联系发布人”）。
- 施工队（招工人）发的：只有工人能联系。
- 工人点业主的活儿：“房主发的活儿要由核验过执照的施工队、师傅或专业服务来接；工人可以看施工队招工人的活儿”。
- 没登记 / 核验中 / 被退回 / 被下架 / 工种不对口 / 活儿已关闭，各有一句人话。需要执照的工种没有执照一律不能，没有金额例外。发布人自己总能看到。

### 工作人员 `/api/v1/workbench/jobs/*`（ops；开关 PATCH 只限 admin；网站后台和手机工作台共用）

| 接口 | 参数 | 返回 |
|---|---|---|
| `GET /workbench/jobs/switches` | — | `switches{find,work,requirePaid,feeMode,freeContacts,freePosts}`、`feeModes`、`changes{find,work,requirePaid,feeMode,freeContacts,freePosts: {updatedBy, updatedAt}}`、`log[]`（D28） |
| `PATCH /workbench/jobs/switches`（admin） | `{find?, work?, feeMode?, freeContacts?, freePosts?}`（旧 `requirePaid?` 兼容） | 同上；每项改动写 crm_audit_log（action=jobs_switch，改前改后） |
| `GET /workbench/jobs/pros?status=pending` | `status` 省略 = 全部；`pending` 含“通过后又改了资料、等再看”的 | `items[{id,contactId,contactName,phone,name,role,roleLabel,status,statusLabel,needsReview,trades[{key,name,licType,verified}],cities,licenseNo,licenseState（CSLB 比对结果：state,found,active,problems[],status,expires,classes[],workersComp,bond,coveredTrades[],uncoveredTrades[],checkedAt）,licenseExpiresOn,businessRegUrl,insuranceUrl,licenseDocUrl,intro,photos,returnReason,removedReason,listed,isPaidMember（小程序不给）,verifiedAt,nextReviewAt,createdAt,officialUrl,officialUrls[{agency,url}],checklist[文字],cslbDetailUrl}]` |
| `POST /workbench/jobs/pros/:id/verify` | `{action:'approve'\|'return'\|'remove'\|'check', reason?, trades?[]}`：approve 可只勾部分工种（默认全部）；return、remove 必须写原因；check = 重新排队对 CSLB 总表 | `{pro}`（同上一项）。通过后 90 天复核；会通知本人（走发消息保险） |
| `GET /workbench/jobs/posts?status=` | — | 网站：`items[{id,title,status,statusLabel,closeReason,note,city,tradeName,posterLabel,posterName,createdAt,expiresAt,budget,contactCount,notifiedCount,openReports,firstContactAt}]`；小程序只给 `{id,title,status,statusLabel,contactCount,note}` |
| `POST /workbench/jobs/posts/:id` | `{action:'remove'\|'note', note?}` | `{post{id,title,status,statusLabel,note}}` |
| `GET /workbench/jobs/stats?days=90` | — | `trades[{key,name,group,clicks,pros,posts,contacts,deals,avgHoursToContact}]`、`pros{状态:人数}`、`followups{sent,answered,reached,deal,satisfied}`。点击数来自 `POST /track` 的 `jobs_trade`、`jobs_home_entry`（`target` = 工种 key） |
| `GET /workbench/jobs/trades` | — | `groups`、`trades`（全字段：issuer、licenseClass、lookupUrl（`{licNum}` 会换成牌照号）、verifyPoints、verified、note…）、`homeEntries` |
| `POST /workbench/jobs/trades` | 工种全字段（`key` 新的就新增） | `{trade}` |
| `DELETE /workbench/jobs/trades/:key` | — | 有活儿的不能删（改不开放） |
| `POST /workbench/jobs/groups` | `{key,name,order}` | `{group}` |
| `PUT /workbench/jobs/home-entries` | `{entries:[7 个 {label,icon?,target:{type,key}}]}` | `{homeEntries}` |
| `GET /workbench/jobs/cities` | — | `regions[{region,regionSort,items[{key,name,region,regionSort,sort,enabled,pros,posts}]}]`（含停用的；pros/posts = 用过的数量） |
| `POST /workbench/jobs/cities` | `{key?（不给 = 新增）, name, region, enabled?}`；名字不能重复；换地区就排到那个地区最后 | `{city}` |
| `DELETE /workbench/jobs/cities/:key` | — | `{key,deleted,disabled,message}`：有人登记过 / 有活儿用过的只停用（不再出现在选项里，老记录照样显示名字），没用过的真删 |
| `PUT /workbench/jobs/cities/order` | `{regions:[{region,keys[]}]}`：地区顺序和地区内顺序都按数组；可以把城市挪到别的地区 | 同 GET |
| `GET /workbench/jobs/reports?status=open\|handled` · `POST /workbench/jobs/reports/:id {note?}` | — | 投诉列表 · 标记已处理 |
| `GET /workbench/jobs/invite?roleCategory=&roleSub=` · `POST /workbench/jobs/invite {contactIds[], dryRun?}` | 按行业标签筛现有会员 · 发“来登记接活”。**默认演练**：不传 `dryRun:false` 一律不发，每人记一行 `status='dry_run'`。真发（`dryRun:false`）要管理员（否则 403）；正式环境两个开关都开着（否则 409 conflict）；测试站只发测试身份（其他人记 blocked）。同一人 30 天内只真发一次（演练不算） | `items[{id,name,roleCategory,roleSub,registered,invitedAt（只算真发）}]` · `{dryRun,wouldSend,sent,blocked,failed,skipped}` |
| `GET /workbench/jobs/notifications?postId=` | — | 通知记录：`items[{kind,postId,proId,contactName,round,channel:'wx'\|'sms'\|'none',status:'sent'\|'failed'\|'blocked'\|'no_channel'\|'dry_run',detail}]`（`blocked` 的 detail：`switch_off` / `not_test_identity`） |

### 通知与定时任务（D4）

- **测试站手机验证（指令 7 · D16；指令 9 · D22 收紧成只认名单里的号码，见本节开头）**：只在 `VERCEL_ENV=preview`（服务器判断，不看前端传参）：`POST /me/phone/send` 不发短信，返回 `{alreadyVerified:false, masked, message:testFixedCodeText, testFixedCode:true}`；`POST /me/phone/verify` 只认 `246810`（只限名单里的号码）；`POST /auth/code/send {channel:'sms'}` 同样不发、验证码固定 246810，返回多 `testFixedCode:true`。`GET /meta`、`GET /jobs/meta`、`GET /me/contact` 的 `contactInfo` 在测试站多给 `testFixedCode:true, testFixedCodeText:'测试站：验证码固定为 246810'`（小程序据此在验证手机的地方显示这行小字；`/meta` 的 `smsAvailable`、`phoneVerifyAvailable` 在测试站为 true）。正式站这些字段都没有，代码路径不变。
- 定时任务都由 `.github/workflows/jobs-dispatch.yml`（新文件）触发，不改 vercel.json 和已有工作流；鉴权 `Authorization: Bearer <CRON_SECRET 或 REMINDER_CRON_SECRET>`，**测试站（`VERCEL_ENV=preview`）另认 `JOBS_CRON_TEST_SECRET`**（D14，只加在 Preview，正式环境不认）。
- `/api/cron/jobs?task=dispatch`（每 15 分钟）：漏发的第一批；发布 24 小时没人联系 → 第二批 + 后台待跟进（排队的 CSLB 比对 D20 起交给 GitHub runner）。
- `?task=daily`（每天 14:00 UTC）：14 天到期关闭、第 12 天发续期链接 `/zh/jobs/renew/<id>?t=<token>`、第 7 天回访 `/zh/jobs/followup/<token>`（发布人和联系过的人各一次）、90 天复核、执照到期下架。
- `?task=weekly`：指令 7 · D20 起不再下载总表，只回 `verify:'moved_to_github_runner'`。
- **CSLB 牌照比对（指令 7 · D20）**：`.github/workflows/jobs-cslb-weekly.yml`（新文件，沿用 `REMINDER_CRON_SECRET`）在 GitHub runner 上跑 `scripts/jobs-cslb-runner.mjs`：每周二 16:00 UTC `mode=weekly`（全部已通过的 A 类 + 排队的），每天 15:00 UTC `mode=queued`（新登记 / 改牌照号 / 90 天复核排队的；没有就不下载）。
  - `GET /api/cron/jobs/cslb-ingest?mode=weekly|queued` → `{numbers:[牌照号]}`（只有号码）。
  - `POST /api/cron/jobs/cslb-ingest {mode, header（总表第一行原文）, lines:[对得上的行原文], scanned（一共读了多少行）}` → `{checked, found, notActive, scanned}`；比对状态、到期、类别、工伤保险、保证金，不合格自动下架、通知本人、提醒工作人员。`scanned` < 50000 视为没下完整，`400`，谁都不动并记待跟进。
  - `POST … {failed:true, error}`：runner 下载失败，记一条待跟进给工作人员（转人工一键打开详情页核对）。
  - 鉴权同上（测试站另认 `JOBS_CRON_TEST_SECRET`）。服务器自己下载总表那条路定时任务不再走（`scanMaster` 只留作本地手动备用）。
- **内容安全（D10）**：发布和改情况说明时过微信 `msgSecCheck`（用发布人的小程序 openid，沿用 lib/crm/contentSec.ts 的降级）；结果记 `jobs_posts.sec_status`：`pass` / `review` / `risky` / `unchecked`（未检测，`sec_note` = `no_wx_config` 没配微信密钥 / `no_openid` 发布人没有小程序 openid / `error`）。只有 `pass` 进 matched；网站发布、显示不受影响。
- **发消息的保险**：正式环境（`VERCEL_ENV=production`）只有 `find`、`work` 两个开关都开才真发；其它环境只发测试身份（姓名以「验收」开头，或 `JOBS_TEST_CONTACT_IDS`、`PREVIEW_SMS_ALLOW` 里的）。没发的都记 `blocked`。渠道：微信订阅消息（`WX_SUBSCRIBE_TEMPLATES.jobs`，用户允许过才有）优先，短信兜底。给工作人员的提醒只进后台待跟进，不发消息。
- CSLB：用官方免费总表（Data Portal「License Master」CSV，D20 起由 GitHub runner 下载）比对状态、到期日、类别、工伤保险、保证金；避开周日晚 8 点到周一早 6 点。单个牌照详情页要先过带验证码的查询页，程序不去开，只给工作人员一键打开（`cslbDetailUrl`）。其它机构一律一键打开官方查询页 + 核验清单。

**城市**：表 `jobs_cities`（key、名字、地区、地区顺序、地区内顺序、启用），后台「找工人接活儿城市」页 `/zh/staff/jobs/cities` 增删改排序，不用发版。接活人 `jobs_pros.cities` 存 key，活儿存 `jobs_posts.city_key`（`city` 留发布时的名字给标题用），改名不影响历史。派活按 key 匹配。种子：洛杉矶 15 个、橙县（尔湾、橙县其他）、旧金山湾区 6 个、加州其他 4 个。

### 网站页面会用到的路径（通知里的链接）
`/zh/jobs`（看全部活儿）、`/zh/jobs/post`（发布）、`/zh/jobs/posts/<id>`、`/zh/jobs/mine`（我的活儿 / 我的接活）、`/zh/jobs/register`（登记接活）、`/zh/jobs/renew/<id>?t=<token>`（一键续期：页面调 `PATCH /jobs/posts/:id {renew:true, token}`）、`/zh/jobs/followup/<token>`。

## 13. 后台「今天」页 `/zh/staff`（后台综合优化 B，迁移 0039）

- `GET /api/v1/staff/today`（任何工作人员；每类待办按角色过滤）→ `{ today, live, items, failed, yesterday }`，类型见 `lib/crm/today/types.ts`（`TodayPayload`）。
- **待办来源接口**：`lib/crm/today/types.ts` 的 `TodayProvider { kind, roles, list(ctx) → TodayItem[] }`；
  `TodayItem { id, kind, priority, title, suggestion, actions[], href, tags?, at?, detail? }`；
  按钮 `TodayAction`：`link` / `tel` / `sms`（带草稿）/ `mailto`（带草稿，只打开邮件程序）/ `copy` / `post`（直接生效，POST 到 `/api/v1/staff/*` 或 `/api/v1/workbench/*`）。
- 排序：`PRIORITY` 档位 —— 置顶 0（活动回顾待发布）→ 钱 100 → 已过期跟进 200 → 新咨询 300 → 待审核待确认 400 → 其他 500；同档按 `at`。
- 注册：B 的在 `lib/crm/today/providers/b.ts`，C 的在 `lib/crm/today/providers/c.ts`（`C_PROVIDERS`、`C_LIVE_PROVIDERS` 今天现场三按钮 `TodayLive`）。汇总与排序在 `lib/crm/today/registry.ts`。
- 对外发送总闸：`lib/crm/notifyGate.ts` 的 `gateSend(msg, send)`，设置 `notify_live`（正式站默认关 = 只记 `notify_log` 不发；测试站 / 本机只发测试身份）。
