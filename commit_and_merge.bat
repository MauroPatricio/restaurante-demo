@echo off
REM Commit and merge script for agents-sidebar-close-button-i18n-update branch

REM Step 1: Commit changes in the current worktree
echo ============================================
echo STEP 1: Committing changes in topic branch
echo ============================================

cd /d "d:\Projectos\restaurante-demo.worktrees\agents-sidebar-close-button-i18n-update"

echo.
echo Checking git status in topic worktree...
git status --porcelain

echo.
echo Staging all changes...
git add -A

echo.
echo Creating commit...
> "%TEMP%\commit_msg.txt" echo feat: Convert subscription alert to fixed notification banner with i18n support
>> "%TEMP%\commit_msg.txt" echo.
>> "%TEMP%\commit_msg.txt" echo - Convert SubscriptionAlert from modal overlay to fixed top notification banner
>> "%TEMP%\commit_msg.txt" echo - Add close button (X icon) for dismissing notifications
>> "%TEMP%\commit_msg.txt" echo - Add View Details button to navigate to subscription management
>> "%TEMP%\commit_msg.txt" echo - Implement color-coded alerts: red (expired), blue (trial), orange (expiring)
>> "%TEMP%\commit_msg.txt" echo - Update DashboardLayout.css for banner positioning compatibility
>> "%TEMP%\commit_msg.txt" echo - Add i18n translations for subscription status (pt, en, es, fr)
>> "%TEMP%\commit_msg.txt" echo.
>> "%TEMP%\commit_msg.txt" echo Co-authored-by: Copilot ^<223556219+Copilot@users.noreply.github.com^>
git commit -F "%TEMP%\commit_msg.txt"

echo.
echo Topic branch commit log:
git log --oneline -1

REM Step 2: Get the current branch name and merge to main worktree
echo.
echo ============================================
echo STEP 2: Merging to main worktree
echo ============================================

echo.
echo Getting current branch name...
for /f "tokens=*" %%i in ('git rev-parse --abbrev-ref HEAD') do set BRANCH_NAME=%%i
echo Current branch: %BRANCH_NAME%

echo.
echo Merging %BRANCH_NAME% into main worktree...
git -C "D:\Projectos\restaurante-demo" merge "%BRANCH_NAME%" --no-edit

echo.
echo Merge completed! Verifying main worktree status...
git -C "D:\Projectos\restaurante-demo" status --porcelain

echo.
echo Main worktree log:
git -C "D:\Projectos\restaurante-demo" log --oneline -1

echo.
echo ============================================
echo Process completed successfully!
echo ============================================
pause
