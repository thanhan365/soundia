@echo off
cd /d D:\WORKSPACE\soundia\backend-nct
echo "Installing..." > install.log
npm install nhaccuatui-api-full express cors >> install.log 2>&1
echo "Done" >> install.log
