@echo off
cd /d C:\Clever
set PM2_HOME=C:\Users\Administrator\.pm2
"C:\Program Files\nodejs\node.exe" "C:\Users\Administrator\AppData\Roaming\npm\node_modules\pm2\bin\pm2" resurrect
