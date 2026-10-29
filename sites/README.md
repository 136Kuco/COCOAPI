# cocoAPI 的 ChatGPT Sites 版本

`cocoapi/` 保存现有 ChatGPT Sites 项目的完整已跟踪源码快照。

- Sites 项目：`appgprj_6ae2c53d4f548191849f8dbe88fa0a9a`
- 已发布地址：https://cocoapi.glad-lark-2262.chatgpt.site/
- 原 Sites 源码提交：`4b17ba8dfcd2e8759e8bc94262ac351c254b3a3c`
- 快照整理日期：2026-10-30（Asia/Shanghai）

本目录与仓库根目录的 Sub2API（Go/Vue/Docker）实现分别保留，不能互相当作可直接替换的运行包。根目录原有源码、部署脚本与提交历史未被覆盖。

## 当前功能与验收边界

本快照保留管理员访问控制、下游 Key 管理、持久化表结构、连接诊断，以及 DeepSeek 上游密钥安全填写入口。普通模型网关仍关闭并返回 503；完整转发、预算账本、真实模型调用和双有效 Key 的端到端验收尚未完成。详见 `cocoapi/README.md`。

## 安全与部署

没有导出 Sites Secret、生产数据库内容、供应商 Key、平台服务访问令牌或本地运行数据。运行时密钥继续使用 Sites Secret 或服务端密文存储。依赖和构建产物按 `.gitignore` 排除，锁文件和迁移文件已保留。

在 `cocoapi/` 目录开发，遵循项目 README 和 Sites 官方发布流程。保留 `.openai/hosting.json` 中的原项目 ID；不要创建替代站点。仅提交或推送此 GitHub 仓库不会自动更新现有 Sites 线上版本，仍需构建、源同步与正式发布。
