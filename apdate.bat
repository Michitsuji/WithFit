@echo off
cd C:\Users\kappa\duofit-app

if exist src\changes.json (
    node src\apply_changes.js
)

git add .
git commit -m "Update code"
git push origin main
echo 完了しました！
pause