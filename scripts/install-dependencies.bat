@echo off
chcp 65001 >nul
echo.
echo ========================================
echo   🚀 GUNT系统 - 依赖安装脚本
echo ========================================
echo.
echo 正在安装新架构所需的依赖包...
echo.
echo 📦 即将安装的包:
echo   - zustand (状态管理)
echo   - @tanstack/react-query (数据缓存)
echo   - react-window (虚拟滚动)
echo.

:: 检查npm是否可用
where npm >nul 2>nul
if errorlevel 1 (
    echo ❌ 错误: 未找到npm命令
    echo 请先安装Node.js
    pause
    exit /b 1
)

echo [1/3] 检查package.json...
if not exist "package.json" (
    echo ❌ 错误: 未找到package.json
    echo 请确保在项目根目录运行此脚本
    pause
    exit /b 1
)

echo ✅ package.json 已找到
echo.

echo [2/3] 清理npm缓存（可选，如之前安装失败）...
choice /C YN /M "是否清理npm缓存? (Y=是, N=否)" /T 5 /D N
if errorlevel 2 (
    echo 跳过清理缓存
) else (
    echo 正在清理缓存...
    npm cache clean --force
    echo ✅ 缓存已清理
)
echo.

echo [3/3] 开始安装依赖...
echo.
echo ⏳ 正在安装 zustand...
npm install zustand --save
if errorlevel 1 (
    echo ❌ zustand 安装失败
    goto :error
)
echo ✅ zustand 安装成功
echo.

echo ⏳ 正在安装 @tanstack/react-query...
npm install @tanstack/react-query --save
if errorlevel 1 (
    echo ❌ @tanstack/react-query 安装失败
    goto :error
)
echo ✅ @tanstack/react-query 安装成功
echo.

echo ⏳ 正在安装 react-window...
npm install react-window --save
if errorlevel 1 (
    echo ❌ react-window 安装失败
    goto :error
)
echo ✅ react-window 安装成功
echo.

echo ========================================
echo   ✅ 所有依赖安装成功！
echo ========================================
echo.
echo 📋 已安装的包:
npm list zustand @tanstack/react-query react-window --depth=0
echo.
echo ========================================
echo   🎯 下一步操作
echo ========================================
echo.
echo 1. 运行迁移脚本切换到新架构:
echo    migrate-to-new-architecture.bat
echo.
echo 2. 或者启动开发服务器测试:
echo    npm start
echo.
echo 📖 详细文档请查看:
echo    - REFACTORING_GUIDE.md (重构指南)
echo    - TESTING_CHECKLIST.md (测试清单)
echo    - REFACTORING_SUMMARY.md (完整总结)
echo.
pause
exit /b 0

:error
echo.
echo ========================================
echo   ❌ 安装过程中出现错误
echo ========================================
echo.
echo 可能的解决方案:
echo.
echo 1. 以管理员身份运行此脚本
echo    右键点击 → "以管理员身份运行"
echo.
echo 2. 检查网络连接
echo    确保能访问 npm registry
echo.
echo 3. 尝试切换npm镜像源
echo    npm config set registry https://registry.npmmirror.com
echo.
echo 4. 手动安装依赖
echo    npm install zustand @tanstack/react-query react-window
echo.
echo 5. 使用yarn替代npm
echo    npm install -g yarn
echo    yarn add zustand @tanstack/react-query react-window
echo.
pause
exit /b 1

