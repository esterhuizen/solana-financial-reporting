import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';

const ExchangeRateDisplay = ({ startDate, endDate }) => {
  const [exchangeRates, setExchangeRates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Only fetch if we have both dates
    if (startDate && endDate) {
      console.log('ExchangeRateDisplay: Fetching exchange rates for date range:', {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      });
      fetchExchangeRates();
    } else {
      console.log('ExchangeRateDisplay: Missing date(s), not fetching', { 
        hasStartDate: !!startDate, 
        hasEndDate: !!endDate 
      });
    }
  }, [startDate, endDate]);

  const fetchExchangeRates = async () => {
    setLoading(true);
    setError('');

    try {
      // Format dates for API
      const formattedStartDate = startDate.toISOString().split('T')[0];
      const formattedEndDate = endDate.toISOString().split('T')[0];

      console.log('ExchangeRateDisplay: Making API call to /api/exchange-rates');
      const response = await axios.get('/api/exchange-rates', {
        params: {
          startDate: formattedStartDate,
          endDate: formattedEndDate,
        }
      });

      console.log(`ExchangeRateDisplay: Received ${response.data.length} exchange rates`);
      setExchangeRates(response.data);
    } catch (err) {
      console.error('Error fetching exchange rates:', err);
      setError(`Failed to load exchange rate data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-48 mb-4"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-700 rounded w-full"></div>
          <div className="h-4 bg-gray-700 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card bg-red-900/50 border border-red-800">
        <h3 className="text-lg font-semibold mb-2">Exchange Rates</h3>
        <p className="text-red-300">{error}</p>
      </div>
    );
  }

  if (!exchangeRates || exchangeRates.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold mb-2">Exchange Rates</h3>
        <p className="text-gray-400">No exchange rate data available for the selected date range.</p>
      </div>
    );
  }

  // Calculate average rates
  const avgSolUsd = exchangeRates.reduce((sum, rate) => sum + parseFloat(rate.sol_usd), 0) / exchangeRates.length;
  const avgUsdNzd = exchangeRates.reduce((sum, rate) => sum + parseFloat(rate.nzd_usd), 0) / exchangeRates.length;

  // Find min/max rates
  const solUsdRates = exchangeRates.map(rate => parseFloat(rate.sol_usd));
  const usdNzdRates = exchangeRates.map(rate => parseFloat(rate.nzd_usd));
  
  const minSolUsd = Math.min(...solUsdRates);
  const maxSolUsd = Math.max(...solUsdRates);
  const minUsdNzd = Math.min(...usdNzdRates);
  const maxUsdNzd = Math.max(...usdNzdRates);

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-3">Exchange Rates</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="space-y-2">
          <h4 className="text-md font-medium text-gray-300">SOL/USD</h4>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Average:</span>
            <span className="text-lg font-medium">${avgSolUsd.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Range:</span>
            <span>${minSolUsd.toFixed(2)} - ${maxSolUsd.toFixed(2)}</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <h4 className="text-md font-medium text-gray-300">NZD/USD</h4>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Average:</span>
            <span className="text-lg font-medium">{avgUsdNzd.toFixed(4)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Range:</span>
            <span>{minUsdNzd.toFixed(4)} - {maxUsdNzd.toFixed(4)}</span>
          </div>
        </div>
      </div>
      
      <details className="text-sm">
        <summary className="cursor-pointer text-gray-400 hover:text-white focus:outline-none mb-2">
          Show daily rates ({exchangeRates.length} days)
        </summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="pb-2 pr-4">Date</th>
                <th className="pb-2 pr-4 text-right">SOL/USD</th>
                <th className="pb-2 text-right">USD/NZD</th>
              </tr>
            </thead>
            <tbody>
              {exchangeRates.map((rate) => (
                <tr key={rate.date} className="border-b border-gray-700/30">
                  <td className="py-2 pr-4">{format(new Date(rate.date), 'MMM dd, yyyy')}</td>
                  <td className="py-2 pr-4 text-right">${parseFloat(rate.sol_usd).toFixed(2)}</td>
                  <td className="py-2 text-right">{parseFloat(rate.nzd_usd).toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
};

export default ExchangeRateDisplay;
