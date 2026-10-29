@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Please install Node.js 22.13 or newer first.
  pause
  exit /b 1
)
call npx --yes pnpm@11.25.0 install --frozen-lockfile
if errorlevel 1 goto failed
node scripts/setup-local.mjs
if errorlevel 1 goto failed
call npx --yes pnpm@11.25.0 dev --host 127.0.0.1
if errorlevel 1 goto failed
exit /b 0
:failed
echo Local startup failed. Keep this window open for diagnosis.
pause
exit /b 1
