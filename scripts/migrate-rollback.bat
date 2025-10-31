@echo off
chcp 65001 >nul
echo ========================================
echo   GUNT 系统架构回滚脚本
echo   恢复到迁移前的架构
echo ========================================
echo.

:: 检查备份目录
if not exist "backup" (
    echo ❌ 错误: 未找到备份目录
    echo 无法执行回滚操作
    pause
    exit /b 1
)

:: 查找最新的备份
for /f "delims=" %%i in ('dir /b /ad /o-d backup 2^>nul') do (
    set latest_backup=%%i
    goto :found_backup
)

:found_backup
if "%latest_backup%"=="" (
    echo ❌ 错误: 未找到备份文件
    pause
    exit /b 1
)

echo 找到备份: backup\%latest_backup%\
echo.

echo [1/4] 检查备份文件...
set missing=0
if not exist "backup\%latest_backup%\App.js.backup" (
    echo ❌ 缺少: App.js.backup
    set missing=1
)
if not exist "backup\%latest_backup%\useOrderData.js.backup" (
    echo ❌ 缺少: useOrderData.js.backup
    set missing=1
)
if not exist "backup\%latest_backup%\useMachineData.js.backup" (
    echo ❌ 缺少: useMachineData.js.backup
    set missing=1
)
if not exist "backup\%latest_backup%\useMaterialData.js.backup" (
    echo ❌ 缺少: useMaterialData.js.backup
    set missing=1
)

if %missing%==1 (
    echo.
    echo ❌ 备份文件不完整，无法回滚
    pause
    exit /b 1
)

echo ✅ 备份文件完整
echo.

echo [2/4] 确认回滚操作
echo.
echo ⚠️  警告: 此操作将覆盖当前文件
echo 是否继续回滚到 %latest_backup% 的版本？
echo.
choice /C YN /M "请选择 (Y=是, N=否)"

if errorlevel 2 (
    echo 已取消回滚操作
    pause
    exit /b 0
)

echo.
echo [3/4] 恢复文件...
copy /Y "backup\%latest_backup%\App.js.backup" "src\App.js" >nul
copy /Y "backup\%latest_backup%\useOrderData.js.backup" "src\hooks\useOrderData.js" >nul
copy /Y "backup\%latest_backup%\useMachineData.js.backup" "src\hooks\useMachineData.js" >nul
copy /Y "backup\%latest_backup%\useMaterialData.js.backup" "src\hooks\useMaterialData.js" >nul

echo ✅ 文件已恢复
echo.

echo [4/4] 清理重构文件（可选）
echo.
choice /C YN /M "是否删除新架构的文件? (Y=是, N=否)"

if errorlevel 2 (
    echo 保留新架构文件
) else (
    if exist "src\stores" (
        echo 删除 src\stores\
        rmdir /S /Q "src\stores"
    )
    
    if exist "src\components\VirtualizedOrderTable.js" (
        del /Q "src\components\VirtualizedOrderTable.js"
    )
    
    if exist "src\components\VirtualizedMaterialTable.js" (
        del /Q "src\components\VirtualizedMaterialTable.js"
    )
    
    if exist "src\providers\QueryClientProvider.js" (
        del /Q "src\providers\QueryClientProvider.js"
    )
    
    echo ✅ 新架构文件已清理
)

echo.
echo ========================================
echo   ✅ 回滚完成！
echo ========================================
echo.
echo 已恢复到 %latest_backup% 版本
echo.
echo 🚀 下一步:
echo    1. 重启开发服务器: npm start
echo    2. 检查功能是否正常
echo.
echo 📌 提示:
echo    - 备份文件仍保留在 backup\ 目录
echo    - 如需再次迁移，运行: migrate-to-new-architecture.bat
echo.
pause

