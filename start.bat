@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo Loveca Labo — ローカルサーバを起動します
echo ブラウザで http://127.0.0.1:8080/ を開いてください
echo 止めるときはこのウィンドウを閉じるか Ctrl+C
echo.

REM Python 3（Windows では py または python）
where py >nul 2>nul
if %ERRORLEVEL%==0 (
  py -m http.server 8080
  goto :eof
)
where python >nul 2>nul
if %ERRORLEVEL%==0 (
  python -m http.server 8080
  goto :eof
)

REM Node.js + npm start（package.json）
where npx >nul 2>nul
if %ERRORLEVEL%==0 (
  call npx --yes serve . -l 8080
  goto :eof
)

echo [エラー] Python 3 または Node.js が見つかりませんでした。
echo.
echo どちらかを入れてからもう一度 start.bat を実行してください。
echo   Python: https://www.python.org/downloads/
echo   Node.js: https://nodejs.org/ （入れたら「npm start」でも可）
echo.
pause
