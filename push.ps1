# Automatically stage, commit and push changes to GitHub
Write-Host "=== 準備推送到 GitHub ===" -ForegroundColor Cyan

# 檢查 git 狀態
$status = git status --porcelain
if ([string]::IsNullOrEmpty($status)) {
    Write-Host "沒有偵測到任何修改，無需推送！" -ForegroundColor Yellow
    Exit
}

# 暫存所有變更
git add .

# 輸入 commit 訊息 (若留空則使用預設值)
$msg = Read-Host "請輸入 Commit 說明訊息 [預設: 'Update IoT personal site']"
if ([string]::IsNullOrEmpty($msg)) {
    $msg = "Update IoT personal site"
}

# 提交並推送
git commit -m $msg
git push origin main

Write-Host "=== 推送完成！ ===" -ForegroundColor Green
