@echo off
echo Running migrations to add previous_balance_reference field...
cd backend
python manage.py migrate customers
python manage.py migrate purchases
echo.
echo Migrations completed successfully!
echo.
echo The reference number field has been added to both Customer and Supplier models.
echo You can now add reference numbers when adding or paying previous balance.
pause
