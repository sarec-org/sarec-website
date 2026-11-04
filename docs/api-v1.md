# SAREC 业务接口 `/api/v1`（网站页面与小程序共用）

所有接口只返回 JSON，`Cache-Control: no-store`。

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
