kill $(lsof -i :5001 | awk -e '{print $2}' | tail -1)
cd /home/sol/build/financial_reporting_wallet/api
nohup npm start &
