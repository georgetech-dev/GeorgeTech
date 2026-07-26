@echo off
setlocal EnableExtensions EnableDelayedExpansion
title GeorgeTech Folder Manager Installer

set "BASE_URL=https://www.georgetech.uk/installs/Outlook/Add-ins/QuickFile"
set "EXPECTED_THUMBPRINT=DE636537103B35ED75A81CA9501BD132DCC4FE6B"
set "CERT_FILE=%~dp0GeorgeTech-Folder-Manager-Publisher.cer"
set "WORK_FOLDER=%TEMP%\GeorgeTechFolderManagerInstall"
set "SETUP_FILE=%WORK_FOLDER%\setup.exe"

echo.
echo GeorgeTech Folder Manager
echo Secure client installer
echo.

where certutil.exe >nul 2>&1
if errorlevel 1 goto :certutil_missing

if not exist "%CERT_FILE%" goto :certificate_missing

if exist "%WORK_FOLDER%" rd /s /q "%WORK_FOLDER%" >nul 2>&1
mkdir "%WORK_FOLDER%"
if errorlevel 1 goto :failed

echo [1/4] Verifying the bundled GeorgeTech publisher certificate...
set "ACTUAL_THUMBPRINT="

for /f "skip=1 tokens=* delims=" %%H in ('certutil.exe -hashfile "%CERT_FILE%" SHA1 2^>nul') do (
    if not defined ACTUAL_THUMBPRINT set "ACTUAL_THUMBPRINT=%%H"
)

set "ACTUAL_THUMBPRINT=!ACTUAL_THUMBPRINT: =!"
set "ACTUAL_THUMBPRINT=!ACTUAL_THUMBPRINT:	=!"

if not defined ACTUAL_THUMBPRINT goto :certificate_failed

if /I not "!ACTUAL_THUMBPRINT!"=="%EXPECTED_THUMBPRINT%" goto :certificate_mismatch

echo [2/4] Trusting GeorgeTech for the current Windows user...
certutil.exe -user -addstore -f Root "%CERT_FILE%" >nul 2>&1
if errorlevel 1 goto :certificate_failed

certutil.exe -user -addstore -f TrustedPublisher "%CERT_FILE%" >nul 2>&1
if errorlevel 1 goto :certificate_failed

echo [3/4] Downloading the latest Folder Manager setup...
call :download_file "%BASE_URL%/setup.exe" "%SETUP_FILE%"
if errorlevel 1 goto :download_failed

if not exist "%SETUP_FILE%" goto :download_failed

echo [4/4] Starting the Folder Manager installation...
echo.
start "" /wait "%SETUP_FILE%"
set "INSTALL_EXIT=!ERRORLEVEL!"

if not "!INSTALL_EXIT!"=="0" (
    echo.
    echo The installer closed with code !INSTALL_EXIT!.
    echo It may have been cancelled or blocked by Windows.
    goto :failed
)

echo.
echo GeorgeTech Folder Manager installation has completed.
echo Open classic Outlook to finish loading the add-in.
echo.
pause
exit /b 0

:download_file
set "DOWNLOAD_URL=%~1"
set "DOWNLOAD_PATH=%~2"

if exist "%SystemRoot%\System32\curl.exe" (
    "%SystemRoot%\System32\curl.exe" ^
        --location ^
        --fail ^
        --silent ^
        --show-error ^
        --output "%DOWNLOAD_PATH%" ^
        "%DOWNLOAD_URL%"

    if not errorlevel 1 exit /b 0
)

certutil.exe ^
    -urlcache ^
    -split ^
    -f ^
    "%DOWNLOAD_URL%" ^
    "%DOWNLOAD_PATH%" >nul 2>&1

exit /b %ERRORLEVEL%

:certificate_missing
echo.
echo The GeorgeTech public certificate is missing.
echo Extract every file from the ZIP before running the installer.
goto :failed

:certificate_mismatch
echo.
echo SECURITY CHECK FAILED.
echo The certificate in this package does not match the certificate expected
echo by the installer.
echo.
echo Expected: %EXPECTED_THUMBPRINT%
echo Received: !ACTUAL_THUMBPRINT!
echo.
echo Nothing has been trusted or installed.
goto :failed

:download_failed
echo.
echo setup.exe could not be downloaded from:
echo %BASE_URL%/setup.exe
echo.
echo Check the internet connection and try again.
goto :failed

:certificate_failed
echo.
echo Windows could not verify or trust the GeorgeTech certificate.
echo The computer's security policy may require administrator assistance.
goto :failed

:certutil_missing
echo.
echo Windows Certificate Services could not be found.
echo This Windows installation does not include certutil.exe.
goto :failed

:failed
echo.
echo GeorgeTech Folder Manager was not installed.
echo Support: https://georgetech.uk/support
echo.
pause
exit /b 1
