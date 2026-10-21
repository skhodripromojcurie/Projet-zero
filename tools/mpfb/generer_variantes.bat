@echo off
rem Projet Zero - genere les variantes de visage d'Adam avec MPFB, puis ouvre la comparaison.
rem Double-cliquer ce fichier. Aucune manipulation dans Blender.
chcp 65001 >nul
setlocal EnableDelayedExpansion
set "SCRIPT=%~dp0generer_variantes.py"
set "SORTIE=%USERPROFILE%\Documents\ProjetZero\adam_variantes"
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
  echo Blender est introuvable. Indiquez son chemin puis relancez depuis cette fenetre :
  echo   set BLENDER_EXE=C:\Program Files\Blender Foundation\Blender 5.2\blender.exe
  pause
  exit /b 1
)
echo Blender : "!BLENDER!"
echo Sortie  : "%SORTIE%"
echo Generation de 6 visages et de leurs rendus : 20 a 60 minutes. Ne fermez pas cette fenetre.
"!BLENDER!" --background --python "%SCRIPT%" -- "%SORTIE%" %*
if errorlevel 1 (
  echo Une erreur est survenue : copiez le texte ci-dessus pour le diagnostic.
  pause
  exit /b 1
)
start "" "%SORTIE%\comparaison.html"
pause
