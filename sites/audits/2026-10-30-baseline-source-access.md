# cocoAPI 第1～3项执行记录

日期：2026-10-30（Asia/Shanghai）。本轮只读生产检查，无真实上游模型调用、无生产数据库写入、无受众或Secret变更。

## 1. 基线核对：通过（结构与源码范围）

- 原Sites项目、URL保留；最新已保存版本3，部署 appgdep_6ae2edc92b208191939f54c2f7b7cbdc 返回 succeeded。
- 线上版本来源与本地干净工作区均为 4b17ba8dfcd2e8759e8bc94262ac351c254b3a3c。
- GitHub sites/cocoapi 的138份源码上轮逐文件SHA核对一致，未覆盖根目录Sub2API。
- 本轮新建 git archive 源码备份（890880字节），保存在当前执行环境；永久源码仍在GitHub。生产数据库只核对结构，没有导出用户数据或密文。
- D1绑定DB，四表 api_keys、connection_tests、provider_secrets、request_logs；无正式预算账本。
- 环境修订2，ADMIN_USER_ID 与 COCO_VAULT_KEY 均为Secret；只记录名称，不导出值。
- 源码和迁移可重建结构，不代表已完成生产数据灾备/恢复演练；后者仍待实施。

## 2. 补齐源码对标：推进中

保持 Sub2API v0.2.19，Commit dece26153621959ccd7635814f4b2d08304e681a 为已固定基准，不在审查中暗换main。此前270文件，本轮增加10文件并验证Git Blob SHA，总计280文件。4738项完整树索引不等于4738文件均已深审。未运行原Go/PostgreSQL/Redis测试套件。

新增业务验收约束（下面为参考项目行为，不是COCOapi已实现）：

| 约束 | 固定基准源码依据 |
|---|---|
| 客户端进入时已取消，停止选账号并标记499，不产生响应正文 | backend/internal/handler/gateway_handler_cancellation_test.go:31、93-97 |
| Messages/Gemini SSE已写内容，终止故障切换拼流；未写内容才可继续处理切换 | backend/internal/handler/gateway_handler_stream_failover_test.go:26、73、106 |
| Chat/Responses终止事件用量仅结算一次；无用量的空闲错误不扣费；客户端在线的上游错误事件分支不记账 | backend/internal/handler/gateway_compat_stream_usage_test.go:139、181、206；不能外推到所有断线或上游收费情形 |
| 用户/分组RPM、Key周期额度错误映射429并附合理Retry-After | backend/internal/handler/gateway_handler_billing_error_test.go:13、22、31、95 |
| Chat入口在取得用户并发槽后重新检查计费资格，做在途预留，再选账号/取得账号槽 | backend/internal/handler/gateway_handler_chat_completions.go:135-163、249 |
| 参考实现有可选预留与fail-open路径，不足以直接宣称硬预算 | backend/internal/service/billing_inflight_reservation.go:19、230、253-256；Sites账本须单独设计并发安全 |

全部链接以 https://github.com/Wei-Shaw/sub2api/blob/dece26153621959ccd7635814f4b2d08304e681a/ 为前缀。更多提供商分支、全部迁移和完整测试行为仍待补审，不能宣布全量审查完成。

## 3. Sites真实访问诊断：本轮6项完成，核心直连验收未通过

测试窗口：2026-10-30 01:29～01:31（Asia/Shanghai）；从当前独立执行环境发起，不带浏览器Cookie，禁止自动重定向。请求仅GET/OPTIONS，未创建有效子Key、未消费上游额度。

| 请求 | 认证 | 实测 | 结论 |
|---|---|---|---|
| GET /v1/models | 格式合法但无效的测试业务Key，无平台凭证 | 403，Cloudflare1010，browser_signature_banned | 此机器在平台层被拒绝；收到不重试提示后未重复同一请求 |
| GET /api/health | 平台服务凭证 | 200 | databaseReady/adminConfigured/vaultReady=true；deepseekConfigured/gatewayReady=false |
| GET /v1/models | 平台服务凭证＋无效业务Key | 401 authentication_error | 请求抵达应用，业务Key校验拒绝 |
| GET /api/admin | 仅平台服务凭证 | 403 | 平台服务凭证没有管理员访客身份 |
| GET /api/admin/credentials | 仅平台服务凭证 | 403 | 管理员元数据接口拒绝无身份访问 |
| OPTIONS /v1/chat/completions | 外部Origin，无平台凭证 | 403，无Allow-Origin | 该浏览器跨域请求路径未通过 |

证据：Cloudflare Ray a523e7b02eee6162，UTC 2026-10-29T17:29:53Z。单环境结果不能证明所有客户端都被拒绝，亦不能把1010武断归因于私有访问这一单一原因。附平台头成功抵达应用证明存在受信后端访问路径，不等于普通仅BaseURL+Key客户端普遍兼容。

### 待验证，不标通过

- 本人管理员会话、两个有效子Key的正向请求与隔离。
- 外部有效Key直连；支持额外请求头的SDK与管理/机器权限边界。
- SSE、60/180秒请求、WebSocket Upgrade：现有部署没有专用验证端点，普通gateway仍主动503，本轮没有用非流式health冒充这些能力验证。
- DeepSeek官方真实调用与价格/账单：当前未配置上游凭证；本轮零供应商调用。

## 下一个具体目标

先为Sites能力测试设计可关闭、管理员控制、不访问上游、不修改真实数据的探针，单独验证SSE/长请求/取消/Upgrade。任何探针上线前执行源码安全检查、限定访问和资源上限；不通过放开整个站点规避鉴权。随后按确认结果实现外部认证兼容说明和预算账本。需要本人登录时再进入真实登录步骤；无需重连GitHub或更改站点受众。

本轮不修改业务代码，因此没有重跑原17项测试、没有构建或重复部署。此记录不是功能对齐完成报告。
