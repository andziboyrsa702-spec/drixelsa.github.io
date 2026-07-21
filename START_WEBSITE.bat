@echo off
echo Starting Drixel SA Website...
echo.
echo The website will open in your browser automatically.
echo Keep this window open while using the site.
echo.
start "" "http://localhost:8000/index.html"
python -m http.server 8000
pause
