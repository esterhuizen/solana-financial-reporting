. .env
nohup npm start &

# Load the exchange rates from the CSV file (initial load)
npm run load-rates

# Set up a cron job for the exchange rates fetcher to run at midnight daily
(crontab -l 2>/dev/null; echo "0 0 * * * cd $(pwd) && npm run fetch-rates >> $(pwd)/log/exchange_rates.log 2>&1") | crontab -

echo "Initial exchange rates loaded from CSV file."
echo "Cron job set up to update exchange rates at midnight each day."
echo "Run npm run fetch-rates to fetch today's exchange rates manually."
