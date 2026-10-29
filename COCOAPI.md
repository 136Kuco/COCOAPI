# cocoAPI

本项目统一保存在 `136Kuco/COCOAPI`，基于 Wei-Shaw/sub2api。

- `frontend/`：Vue 前端源码。
- `backend/`：Go 后端源码。
- `deploy/cocoapi/`：本项目的部署配置、启动脚本和检查脚本。
- `.cocoapi-runtime/`：仅在本机保存的数据库、Redis、应用配置和密钥。已从 Git 和 Docker 构建上下文排除，不能提交或删除。

## 启动与验证

```bash
bash deploy/cocoapi/install.sh
bash deploy/cocoapi/start.sh
```

安装会保留已有配置和数据库。停止使用 `bash deploy/cocoapi/compose.sh stop`，不要删除运行数据。当前仅监听本机 8080 端口。

## 继续修改

直接修改此仓库里的前后端源码，按 `DEV_GUIDE.md` 和现有 Makefile 开发与测试。
目前运行的服务使用固定摘要的上游镜像，修改源码后需要重新构建并部署镜像，才会反映到运行中的服务。`deploy/cocoapi/compose.runtime.json` 保存当前镜像选择。

完整保留上游源码、许可证、法律文档与 Git 基础历史。导入基准提交：`a3298b46ebe239fb0720b068a1eb3383955bdac2`。
运营承诺 v2026.06.10 已经用户确认并写入当前数据库；站点名称已设为 cocoAPI。

原公网地址 `cocoapi.glad-lark-2262.chatgpt.site` 尚未切换到此服务；仍需要该站点的发布入口与后端托管能力。云环境发布不会自动发布网站。
上游模型账号或 API 凭据尚未配置，真实模型调用未验证。
