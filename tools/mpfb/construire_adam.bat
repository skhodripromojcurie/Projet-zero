@echo off
rem Projet Zero - construit Adam definitif (variante A) et Adam_Morel.glb, puis ses rendus de controle.
rem Double-cliquer ce fichier. Aucune manipulation dans Blender.
chcp 65001 >nul
setlocal EnableDelayedExpansion
set "SCRIPT=%~dp0construire_adam.py"
set "RENDUS=%~dp0rendus_final.py"
set "SORTIE=%USERPROFILE%\Documents\ProjetZero\adam_final"
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
echo Construction d'Adam, habillage et rendus : 15 a 45 minutes. Ne fermez pas cette fenetre.
"!BLENDER!" --background --python "%SCRIPT%" -- "%SORTIE%" %*
if errorlevel 1 (
  echo Une erreur est survenue : copiez le texte ci-dessus pour le diagnostic.
  pause
  exit /b 1
)
"!BLENDER!" --background --python "%RENDUS%" -- "%SORTIE%\Adam_Morel.glb" "%SORTIE%\rendus"
if errorlevel 1 (
  echo Les rendus de controle ont echoue : copiez le texte ci-dessus pour le diagnostic.
  pause
  exit /b 1
)
echo Termine : Adam_Morel.glb et le dossier rendus sont dans "%SORTIE%".
start "" "%SORTIE%"
pause
