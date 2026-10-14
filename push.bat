@echo off
echo ====================================================
echo Pushing FleetSync v1.3 to https://github.com/mondayproject30/fleetsync.git
echo ====================================================
"%~dp0tools\git\cmd\git.exe" push -u origin main
echo ====================================================
pause
