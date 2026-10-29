# cocoAPI 本地开发项目

本目录为现有 Sites 应用，不另建站点、不替换为原版 Sub2API。
线上地址：https://cocoapi.glad-lark-2262.chatgpt.site/
Sites project_id：appgprj_6ae2c53d4f548191849f8dbe88fa0a9a

## Windows 首次使用
安装 Git 和 Node.js >=22.13（建议 Node 22）。终端执行：

```powershell
git clone https://github.com/136Kuco/COCOAPI.git
cd COCOAPI/sites/cocoapi
cmd /c 启动本地.cmd
```

已有仓库时不要重复克隆。先提交本地修改，再在仓库根目录执行 git pull --ff-only。
也可在资源管理器双击本目录的“启动本地.cmd”。
首次安装需要联网，脚本失败会停下，不会继续显示成功。

脚本安装锁定依赖，选择 portable 开发模式，为本地生成独立保险库根密钥，
仅在本地应用 SQL 迁移，再启动开发服务器。打开终端显示的 Local 地址，
通常 http://127.0.0.1:5173 ，使用页面登录按钮进入本地模拟身份。
本地身份为 local_seedy，仅用于回环地址开发，不是线上 ChatGPT 登录认证。

## 手动命令
```text
npx --yes pnpm@11.25.0 install --frozen-lockfile
node scripts/setup-local.mjs
npx --yes pnpm@11.25.0 dev --host 127.0.0.1
```

停止：终端 Ctrl+C。再次启动可以重用同一脚本。
数据库位于 .wrangler/state；配置位于 .dev.vars。均已由现有 gitignore 排除。
脚本不覆盖已有 .dev.vars；不要删除根密钥后继续使用原加密数据。
本地不会复制线上用户、子密钥、数据库或真实供应商凭证。
按需要在本地渠道表单填写测试凭证；连接测试可能计费，不由启动脚本自动执行。

## 验证
打开首页、登录、检查 /api/health 的 databaseReady/adminConfigured/vaultReady。
管理台应可读，创建测试子密钥后刷新核对。
当前 gatewayReady=false、普通模型转发仍返回 503 是现有功能状态，不表示启动失败。
运行已有隔离测试：
```text
node --test tests/credential-vault.test.mjs
node node_modules/typescript/bin/tsc --noEmit
```
实际测试文件名可查看 tests 目录。Windows 本机启动尚待实机验收。

## 本地与云端接续
GitHub 是代码和项目文档的共同来源。每次开始先拉取，再读取
../EXECUTION_PLAN.md、../audits/ 和本文档。
提交前检查 git diff --cached，禁止提交 .dev.vars、运行数据、日志及密钥。
完成后提交并推送 main；云端开始工作先读取最新提交。
生产发布仍使用现有 Sites 项目和原地址；git push 不等于发布。
保留 .openai/hosting.json 及其 project_id，生产密钥继续由 Sites 独立管理。
本地 SQL 迁移成功不代表已在生产执行；线上发布后需单独复测。

## 当前交付边界
这是本地开发启动配置；不宣称 Sub2API 功能已对齐。
没有把文件直接写入用户 Windows，也没有自动安装本机 Git/Node。
