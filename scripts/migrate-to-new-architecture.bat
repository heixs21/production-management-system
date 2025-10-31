@echo off
chcp 65001 >nul
echo ========================================
echo   GUNT 系统架构迁移脚本
echo   从旧架构迁移到优化后的新架构
echo ========================================
echo.

:: 检查是否在正确的目录
if not exist "src\App.js" (
    echo ❌ 错误: 请在项目根目录运行此脚本
    echo 当前目录: %CD%
    pause
    exit /b 1
)

echo [1/6] 备份当前文件...
if not exist "backup" mkdir backup
if not exist "backup\%date:~0,10%" mkdir "backup\%date:~0,10%"

copy "src\App.js" "backup\%date:~0,10%\App.js.backup" >nul 2>&1
copy "src\hooks\useOrderData.js" "backup\%date:~0,10%\useOrderData.js.backup" >nul 2>&1
copy "src\hooks\useMachineData.js" "backup\%date:~0,10%\useMachineData.js.backup" >nul 2>&1
copy "src\hooks\useMaterialData.js" "backup\%date:~0,10%\useMaterialData.js.backup" >nul 2>&1

echo ✅ 备份完成: backup\%date:~0,10%\
echo.

echo [2/6] 检查新文件是否存在...
set missing=0
if not exist "src\App.refactored.js" (
    echo ❌ 缺少文件: src\App.refactored.js
    set missing=1
)
if not exist "src\hooks\useOrderData.refactored.js" (
    echo ❌ 缺少文件: src\hooks\useOrderData.refactored.js
    set missing=1
)
if not exist "src\hooks\useMachineData.refactored.js" (
    echo ❌ 缺少文件: src\hooks\useMachineData.refactored.js
    set missing=1
)
if not exist "src\hooks\useMaterialData.refactored.js" (
    echo ❌ 缺少文件: src\hooks\useMaterialData.refactored.js
    set missing=1
)

if %missing%==1 (
    echo.
    echo ❌ 缺少必要的重构文件，请先运行完整的重构流程
    pause
    exit /b 1
)

echo ✅ 所有新文件就绪
echo.

echo [3/6] 替换hooks文件...
move /Y "src\hooks\useOrderData.refactored.js" "src\hooks\useOrderData.js" >nul
move /Y "src\hooks\useMachineData.refactored.js" "src\hooks\useMachineData.js" >nul
move /Y "src\hooks\useMaterialData.refactored.js" "src\hooks\useMaterialData.js" >nul

echo ✅ Hooks文件已更新
echo.

echo [4/6] 替换App.js...
move /Y "src\App.refactored.js" "src\App.js" >nul

echo ✅ App.js已更新
echo.

echo [5/6] 检查依赖包...
echo 正在检查 package.json 中的依赖配置...
findstr /C:"zustand" package.json >nul
if errorlevel 1 (
    echo ⚠️  警告: package.json 中未找到 zustand 依赖
    echo 请手动运行: npm install zustand @tanstack/react-query react-window
)

findstr /C:"@tanstack/react-query" package.json >nul
if errorlevel 1 (
    echo ⚠️  警告: package.json 中未找到 @tanstack/react-query 依赖
)

findstr /C:"react-window" package.json >nul
if errorlevel 1 (
    echo ⚠️  警告: package.json 中未找到 react-window 依赖
)

echo.
echo [6/6] 迁移完成！
echo.
echo ========================================
echo   📊 迁移摘要
echo ========================================
echo ✅ 文件备份: backup\%date:~0,10%\
echo ✅ Hooks更新: useOrderData, useMachineData, useMaterialData
echo ✅ 主文件更新: App.js
echo ✅ 新增组件: VirtualizedOrderTable, VirtualizedMaterialTable
echo ✅ 新增Store: useOrderStore, useMachineStore, useMaterialStore
echo.
echo ========================================
echo   🚀 下一步操作
echo ========================================
echo 1. 安装新依赖（需要管理员权限）:
echo    npm install
echo.
echo 2. 启动开发服务器:
echo    npm start
echo.
echo 3. 如需回滚，运行:
echo    migrate-rollback.bat
echo.
echo 📖 详细文档请查看: REFACTORING_GUIDE.md
echo ========================================
echo.

pause

