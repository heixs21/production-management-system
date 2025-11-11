@echo off
chcp 65001 >nul
echo ========================================
echo   数据库恢复脚本
echo   GUNT生产管理系统
echo ========================================
echo.

:: 设置变量
set DB_HOST=localhost
set DB_PORT=3306
set DB_USER=root
set DB_PASSWORD=Hota@123456
set DB_NAME=gunt_db
set BACKUP_DIR=..\backups

echo [1/5] 检查MySQL命令...
where mysql >nul 2>nul
if errorlevel 1 (
    echo ❌ 错误: 未找到mysql命令
    echo 请确保MySQL已安装并添加到PATH环境变量
    pause
    exit /b 1
)

echo ✅ mysql 命令已找到
echo.

echo [2/5] 查找可用的备份文件...
echo.
if not exist "%BACKUP_DIR%\*.sql*" (
    echo ❌ 错误: 备份目录中没有找到备份文件
    echo 目录: %BACKUP_DIR%
    pause
    exit /b 1
)

:: 列出所有备份文件
echo 可用的备份文件:
echo.
setlocal enabledelayedexpansion
set count=0
for %%f in ("%BACKUP_DIR%\*.sql*") do (
    set /a count+=1
    echo [!count!] %%~nxf  (%%~tf)
    set "file!count!=%%f"
)

if %count%==0 (
    echo ❌ 没有找到备份文件
    pause
    exit /b 1
)

echo.
echo [3/5] 选择要恢复的备份...
set /p choice="请输入编号 (1-%count%) 或按 Ctrl+C 取消: "

:: 验证输入
if %choice% LSS 1 (
    echo ❌ 无效的选择
    pause
    exit /b 1
)
if %choice% GTR %count% (
    echo ❌ 无效的选择
    pause
    exit /b 1
)

:: 获取选择的文件
call set BACKUP_FILE=%%file%choice%%%
echo.
echo 选择的备份文件: %BACKUP_FILE%
echo.

:: 确认恢复
echo ⚠️  警告: 此操作将覆盖当前数据库！
echo.
choice /C YN /M "确定要恢复此备份吗? (Y=是, N=否)"
if errorlevel 2 (
    echo 已取消恢复操作
    pause
    exit /b 0
)

echo.
echo [4/5] 准备恢复数据库...

:: 检查文件是否压缩
echo %BACKUP_FILE% | findstr /i ".gz" >nul
if not errorlevel 1 (
    echo 检测到压缩文件，正在解压...
    
    :: 检查7zip
    where 7z >nul 2>nul
    if errorlevel 1 (
        echo ❌ 错误: 需要7zip来解压.gz文件
        echo 请安装7zip或使用未压缩的备份文件
        pause
        exit /b 1
    )
    
    :: 解压文件
    set TEMP_FILE=%TEMP%\gunt_restore_%RANDOM%.sql
    7z e "%BACKUP_FILE%" -so > "!TEMP_FILE!" 2>nul
    if errorlevel 1 (
        echo ❌ 解压失败
        pause
        exit /b 1
    )
    set RESTORE_FILE=!TEMP_FILE!
    echo ✅ 解压完成
) else (
    set RESTORE_FILE=%BACKUP_FILE%
)

echo.
echo [5/5] 开始恢复数据库...
echo 目标数据库: %DB_NAME%
echo.

:: 执行恢复
mysql --host=%DB_HOST% --port=%DB_PORT% --user=%DB_USER% --password=%DB_PASSWORD% %DB_NAME% < "%RESTORE_FILE%" 2>nul

if errorlevel 1 (
    echo ❌ 恢复失败！
    echo 请检查数据库连接信息和备份文件是否正确
    if defined TEMP_FILE del "!TEMP_FILE!" 2>nul
    pause
    exit /b 1
)

:: 清理临时文件
if defined TEMP_FILE del "!TEMP_FILE!" 2>nul

echo ✅ 数据库恢复成功
echo.

echo ========================================
echo   ✅ 恢复完成！
echo ========================================
echo.
echo 数据库信息:
echo   数据库名: %DB_NAME%
echo   备份来源: %BACKUP_FILE%
echo   恢复时间: %date% %time%
echo.
echo ⚠️  提示:
echo   1. 请检查数据是否正确
echo   2. 建议重启应用服务器
echo   3. 建议进行功能测试
echo.
echo ========================================
echo.

pause

