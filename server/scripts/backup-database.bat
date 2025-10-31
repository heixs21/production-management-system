@echo off
chcp 65001 >nul
echo ========================================
echo   数据库备份脚本
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
set TIMESTAMP=%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set BACKUP_FILE=%BACKUP_DIR%\gunt_db_%TIMESTAMP%.sql

:: 创建备份目录
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo [1/4] 检查MySQL命令...
where mysqldump >nul 2>nul
if errorlevel 1 (
    echo ❌ 错误: 未找到mysqldump命令
    echo 请确保MySQL已安装并添加到PATH环境变量
    echo.
    echo MySQL安装路径通常为:
    echo C:\Program Files\MySQL\MySQL Server 8.0\bin
    pause
    exit /b 1
)

echo ✅ mysqldump 命令已找到
echo.

echo [2/4] 开始备份数据库...
echo 数据库: %DB_NAME%
echo 备份文件: %BACKUP_FILE%
echo.

:: 执行备份
mysqldump --host=%DB_HOST% --port=%DB_PORT% --user=%DB_USER% --password=%DB_PASSWORD% ^
    --single-transaction ^
    --quick ^
    --lock-tables=false ^
    --routines ^
    --triggers ^
    --events ^
    --set-gtid-purged=OFF ^
    --default-character-set=utf8mb4 ^
    %DB_NAME% > "%BACKUP_FILE%" 2>nul

if errorlevel 1 (
    echo ❌ 备份失败！
    echo 请检查数据库连接信息是否正确
    pause
    exit /b 1
)

echo ✅ 数据库备份成功
echo.

echo [3/4] 压缩备份文件...
if exist "%BACKUP_FILE%.gz" del "%BACKUP_FILE%.gz"

:: 如果有7zip，使用7zip压缩
where 7z >nul 2>nul
if not errorlevel 1 (
    7z a -tgzip "%BACKUP_FILE%.gz" "%BACKUP_FILE%" -mx9 >nul
    if not errorlevel 1 (
        del "%BACKUP_FILE%"
        set BACKUP_FILE=%BACKUP_FILE%.gz
        echo ✅ 压缩完成
    )
) else (
    echo ⚠️  未找到7zip，跳过压缩
)
echo.

echo [4/4] 清理旧备份（保留最近7天）...
forfiles /P "%BACKUP_DIR%" /M *.sql* /D -7 /C "cmd /c del @path" 2>nul
if errorlevel 1 (
    echo ℹ️  没有需要清理的旧备份
) else (
    echo ✅ 旧备份已清理
)
echo.

:: 获取备份文件大小
for %%F in ("%BACKUP_FILE%") do set FILESIZE=%%~zF
set /a FILESIZE_MB=%FILESIZE% / 1024 / 1024

echo ========================================
echo   ✅ 备份完成！
echo ========================================
echo.
echo 备份信息:
echo   文件: %BACKUP_FILE%
echo   大小: %FILESIZE_MB% MB
echo   时间: %date% %time%
echo.
echo 备份目录: %BACKUP_DIR%
echo.
echo ========================================
echo.

pause

