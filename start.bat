@echo off
chcp 65001 >nul
echo =======================================================================
echo   ระบบบันทึกใบสมัครสหกิจศึกษา (Ms-Coop 01-01)
echo   สำนักสหกิจศึกษา คณะวิทยาการจัดการ มหาวิทยาลัยราชภัฏเทพสตรี
echo =======================================================================
echo.
echo กำลังเริ่มต้นระบบ...
echo.

:: Try agy-node first, then fallback to node
where agy-node >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    start "" http://localhost:3000
    agy-node server.js
    goto end
)

where node >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    start "" http://localhost:3000
    node server.js
    goto end
)

echo [แจ้งเตือน] ไม่พบ Node.js ใน PATH กำลังเปิดโหมด Standalone ผ่าน Browser...
start "" "public\index.html"

:end
pause
