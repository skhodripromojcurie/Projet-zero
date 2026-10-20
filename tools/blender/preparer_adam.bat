@echo off
rem Projet Zero - prepare Adam pour le studio.
rem Glisser Adam_Morel.glb sur ce fichier, ou : preparer_adam.bat "C:\chemin\Adam_Morel.glb"
chcp 65001 >nul
setlocal EnableDelayedExpansion
set "SCRIPT=%~dp0preparer_adam.py"
set "ENTREE=%~1"
if "%ENTREE%"=="" (
  echo Glissez le fichier Adam_Morel.glb sur preparer_adam.bat.
  pause
  exit /b 1
)
set "SORTIE=%~dpn1_projet_zero"
set "BLENDER=%BLENDER_EXE%"
if not defined BLENDER (
  for /d %%D in ("%ProgramFiles%\Blender Foundation\Blender*") do (
    if exist "%%D\blender.exe" set "BLENDER=%%D\blender.exe"
  )
)
if not defined BLENDER (
  where blender >nul 2>nul && set "BLENDER=blender"
)
if not defined BLENDER (
  echo Blender est introuvable.
  echo Indiquez son chemin, par exemple :
  echo   set BLENDER_EXE=C:\Program Files\Blender Foundation\Blender 4.2\blender.exe
  echo puis relancez ce fichier depuis la meme fenetre.
  pause
  exit /b 1
)
echo Blender : "!BLENDER!"
echo Entree  : "%ENTREE%"
echo Sortie  : "%SORTIE%"
echo Patience : 10 a 30 minutes. Ne fermez pas cette fenetre.
"!BLENDER!" --background --python "%SCRIPT%" -- "%ENTREE%" "%SORTIE%"
if errorlevel 1 (
  echo Une erreur est survenue : copiez le texte ci-dessus pour le diagnostic.
  pause
  exit /b 1
)
start "" "%SORTIE%"
pause
