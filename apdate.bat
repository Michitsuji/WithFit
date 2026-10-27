@echo off
chcp 65001 > nul
cd /d "%~dp0"

if not exist .git (
    git init
    git branch -M main
    git remote add origin https://github.com/michitsuji/withfit.git
)

if exist src\changes.json (
    node src\apply_changes.js
)

git add -A
git diff --cached --quiet || git -c core.editor=true commit -m "Update code"
git push -f origin main
echo.
echo 完了しました！
pause
