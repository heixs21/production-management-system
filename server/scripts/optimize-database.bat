@echo off
chcp 65001 >nul
echo ========================================
echo   数据库优化执行脚本
echo   GUNT生产管理系统
echo ========================================
echo.

:: 设置变量
set DB_HOST=localhost
set DB_PORT=3306
set DB_USER=root
set DB_PASSWORD=Hota@123456
set DB_NAME=gunt_db
set OPTIMIZATION_SCRIPT=..\database-optimization.sql

echo [1/4] 检查MySQL命令...
where mysql >nul 2>nul
if errorlevel 1 (
    echo ❌ 错误: 未找到mysql命令
    echo 请确保MySQL已安装并添加到PATH环境变量
    pause
    exit /b 1
)

echo ✅ mysql 命令已找到
echo.

echo [2/4] 检查优化脚本...
if not exist "%OPTIMIZATION_SCRIPT%" (
    echo ❌ 错误: 未找到优化脚本
    echo 文件: %OPTIMIZATION_SCRIPT%
    pause
    exit /b 1
)

echo ✅ 优化脚本已找到
echo.

echo [3/4] 确认执行优化...
echo.
echo ⚠️  此操作将:
echo   • 创建多个数据库索引
echo   • 分析和优化所有表
echo   • 更新统计信息
echo.
echo 预计耗时: 3-10分钟（取决于数据量）
echo.
choice /C YN /M "确定要执行优化吗? (Y=是, N=否)"

if errorlevel 2 (
    echo 已取消优化操作
    pause
    exit /b 0
)

echo.
echo [4/4] 开始执行优化...
echo 数据库: %DB_NAME%
echo.

:: 记录开始时间
set start_time=%time%

:: 执行优化脚本
mysql --host=%DB_HOST% --port=%DB_PORT% --user=%DB_USER% --password=%DB_PASSWORD% %DB_NAME% < "%OPTIMIZATION_SCRIPT%"

if errorlevel 1 (
    echo.
    echo ❌ 优化失败！
    echo 请检查数据库连接信息和脚本内容
    pause
    exit /b 1
)

:: 记录结束时间
set end_time=%time%

echo.
echo ========================================
echo   ✅ 优化完成！
echo ========================================
echo.
echo 优化信息:
echo   数据库: %DB_NAME%
echo   开始时间: %start_time%
echo   结束时间: %end_time%
echo.
echo 已完成的优化:
echo   ✅ 创建/更新索引
echo   ✅ 分析表统计信息
echo   ✅ 优化表碎片
echo   ✅ 验证索引创建
echo.
echo 建议操作:
echo   1. 查看数据库健康报告
echo      访问: http://localhost:12454/api/database/health-report
echo.
echo   2. 重启应用服务器以应用优化
echo      npm start
echo.
echo   3. 运行性能测试验证优化效果
echo.
echo ========================================
echo.

pause

