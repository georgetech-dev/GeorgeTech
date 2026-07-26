@echo off
setlocal EnableExtensions
title GeorgeTech Folder Manager Installer

set "BASE_URL=https://www.georgetech.uk/installs/Outlook/Add-ins/QuickFile"
set "EXPECTED_THUMBPRINT=9CAD161BF04EFB44D074A17ACAE53F14AD922B4E"
set "WORK_FOLDER=%TEMP%\GeorgeTechFolderManagerInstall"
set "CERT_FILE=%WORK_FOLDER%\GeorgeTech-Folder-Manager-Publisher.cer"
set "SETUP_FILE=%WORK_FOLDER%\setup.exe"

echo.
echo GeorgeTech Folder Manager
echo Secure client installer
echo.

if not exist "%WORK_FOLDER%" mkdir "%WORK_FOLDER%"
if errorlevel 1 goto :failed

echo [1/5] Downloading the GeorgeTech publisher certificate...
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop'; Invoke-WebRequest -UseBasicParsing -Uri '%BASE_URL%/GeorgeTech-Folder-Manager-Publisher.cer' -OutFile '%CERT_FILE%'"
if errorlevel 1 goto :download_failed

echo [2/5] Verifying the publisher certificate...
for /f "usebackq delims=" %%T in (powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command ^
  "$c = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2('%CERT_FILE%'); ($c.Thumbprint -replace '[^0-9A-Fa-f]','').ToUpperInvariant()") do set "ACTUAL_THUMBPRINT=%%T"

if not defined ACTUAL_THUMBPRINT goto :certificate_failed

if /I not "%ACTUAL_THUMBPRINT%"=="%EXPECTED_THUMBPRINT%" goto :certificate_mismatch

echo [3/5] Trusting GeorgeTech for the current Windows user...
certutil.exe -user -addstore -f Root "%CERT_FILE%" >nul
if errorlevel 1 goto :certificate_failed

certutil.exe -user -addstore -f TrustedPublisher "%CERT_FILE%" >nul
if errorlevel 1 goto :certificate_failed

echo [4/5] Downloading the latest Folder Manager setup...
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop'; Invoke-WebRequest -UseBasicParsing -Uri '%BASE_URL%/setup.exe' -OutFile '%SETUP_FILE%'"
if errorlevel 1 goto :download_failed

echo [5/5] Starting the Folder Manager installation...
echo.
start "" /wait "%SETUP_FILE%"
set "INSTALL_EXIT=%ERRORLEVEL%"

if not "%INSTALL_EXIT%"=="0" (
    echo.
    echo The installer closed with code %INSTALL_EXIT%.
    echo It may have been cancelled or blocked by Windows.
    goto :failed
)

echo.
echo GeorgeTech Folder Manager installation has completed.
echo Open classic Outlook to finish loading the add-in.
echo.
pause
exit /b 0

:certificate_mismatch
echo.
echo SECURITY CHECK FAILED.
echo The downloaded certificate does not match the GeorgeTech certificate
echo expected by this installer.
echo.
echo Expected: %EXPECTED_THUMBPRINT%
echo Received: %ACTUAL_THUMBPRINT%
echo.
echo Nothing has been installed.
goto :failed

:download_failed
echo.
echo The installer files could not be downloaded from GeorgeTech.
echo Check the internet connection and try again.
goto :failed

:certificate_failed
echo.
echo Windows could not verify or trust the GeorgeTech certificate.
echo The computer's security policy may require administrator assistance.
goto :failed

:failed
echo.
echo GeorgeTech Folder Manager was not installed.
echo Support: https://georgetech.uk/support
echo.
pause
exit /b 1
