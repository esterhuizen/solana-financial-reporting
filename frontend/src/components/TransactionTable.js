import React, { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { FiArrowUp, FiArrowDown, FiDownload, FiFilter, FiX } from 'react-icons/fi';

const TransactionTable = ({ transactions, loading }) => {
  // Sorting state
  const [sortConfig, setSortConfig] = useState({ key: 'time', direction: 'desc' });
  // Sorted transactions
  const [sortedTransactions, setSortedTransactions] = useState([]);
  // Filtered transactions
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  // Filter state
  const [filters, setFilters] = useState({
    from_wallet: '',
    to_wallet: ''
  });
  // Filter visible state
  const [showFilters, setShowFilters] = useState(false);
  // Column resizing state
  const [columnWidths, setColumnWidths] = useState({
    time: 180,
    direction: 100,
    from_wallet: '17%',
    to_wallet: '17%',
    solAmount: 130,
    usdAmount: 130,
    nzdAmount: 130,
    id: '16%'
  });
  const [resizingColumn, setResizingColumn] = useState(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const tableRef = useRef(null);

  // Sort and filter transactions when data, sort config, or filters change
  useEffect(() => {
    if (!transactions || transactions.length === 0) {
      setSortedTransactions([]);
      setFilteredTransactions([]);
      return;
    }

    // First, sort the transactions
    const sortableTransactions = [...transactions];
    sortableTransactions.sort((a, b) => {
      // Handle sort by different field types
      if (sortConfig.key === 'time') {
        const dateA = new Date(a[sortConfig.key]);
        const dateB = new Date(b[sortConfig.key]);
        return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
      }
      
      // Handle numeric field sorting
      if (['solAmount', 'usdValue', 'nzdValue'].includes(sortConfig.key)) {
        // Handle null values in a consistent way
        const valueA = a[sortConfig.key] === null ? -Infinity : a[sortConfig.key];
        const valueB = b[sortConfig.key] === null ? -Infinity : b[sortConfig.key];
        return sortConfig.direction === 'asc' 
          ? valueA - valueB 
          : valueB - valueA;
      }
      
      // Handle text field sorting
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    setSortedTransactions(sortableTransactions);

    // Then, apply filters if any are active
    if (filters.from_wallet || filters.to_wallet) {
      const filtered = sortableTransactions.filter(tx => {
        // Convert everything to lowercase for case-insensitive comparison
        const fromWallet = tx.from_wallet.toLowerCase();
        const toWallet = tx.to_wallet.toLowerCase();
        const fromFilter = filters.from_wallet.toLowerCase();
        const toFilter = filters.to_wallet.toLowerCase();

        // Check if the transaction meets both filter conditions
        const matchesFrom = !fromFilter || fromWallet.includes(fromFilter);
        const matchesTo = !toFilter || toWallet.includes(toFilter);

        return matchesFrom && matchesTo;
      });

      setFilteredTransactions(filtered);
    } else {
      // If no filters are active, filtered results are the same as sorted results
      setFilteredTransactions(sortableTransactions);
    }
  }, [transactions, sortConfig, filters]);

  // Handle column sorting
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Handle column resizing
  const handleResizeStart = (e, columnKey, currentWidth) => {
    setResizingColumn(columnKey);
    setStartX(e.clientX);
    setStartWidth(typeof currentWidth === 'string' && currentWidth.includes('%') 
      ? tableRef.current.offsetWidth * (parseInt(currentWidth) / 100)
      : currentWidth);
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
    e.preventDefault();
  };

  const handleResizeMove = (e) => {
    if (!resizingColumn) return;
    
    const diff = e.clientX - startX;
    const newWidth = Math.max(80, startWidth + diff); // Minimum width of 80px
    
    // Update the width
    setColumnWidths(prev => ({
      ...prev,
      [resizingColumn]: typeof columnWidths[resizingColumn] === 'string' && 
                        columnWidths[resizingColumn].includes('%')
                        ? `${Math.round((newWidth / tableRef.current.offsetWidth) * 100)}%`
                        : newWidth
    }));
  };

  const handleResizeEnd = () => {
    setResizingColumn(null);
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  };
  
  // Handle filter change
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Clear all filters
  const clearFilters = () => {
    setFilters({
      from_wallet: '',
      to_wallet: ''
    });
  };
  
  // Toggle filter visibility
  const toggleFilters = () => {
    setShowFilters(prev => !prev);
    // Clear filters when hiding the filter panel
    if (showFilters) {
      clearFilters();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-app-accent"></div>
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>No transactions found for the selected criteria.</p>
      </div>
    );
  }

  // Helper to get sort indicator
  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? <FiArrowUp className="ml-1 inline" /> : <FiArrowDown className="ml-1 inline" />;
  };
  
  // CSV Export function
  const exportToCSV = () => {
    // Create CSV header
    let csvContent = 'Transaction ID,Date,From Wallet,To Wallet,Amount (SOL),USD Value,NZD Value,Direction\n';
    
    // Add transaction data - use filtered transactions if filters are applied
    filteredTransactions.forEach(tx => {
      // Format each field and handle potential special characters for CSV
      const row = [
        tx.id,
        format(new Date(tx.time), 'yyyy-MM-dd HH:mm:ss'),
        `"${tx.from_wallet}"`, // Quote wallet addresses in case they contain commas
        `"${tx.to_wallet}"`,
        tx.solAmount.toFixed(9),
        tx.usdValue ? tx.usdValue.toFixed(2) : 'N/A',
        tx.nzdValue ? tx.nzdValue.toFixed(2) : 'N/A',
        tx.direction
      ].join(',');
      
      csvContent += row + '\n';
    });
    
    // Create a blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Set filename with current date
    const today = format(new Date(), 'yyyy-MM-dd');
    link.setAttribute('href', url);
    link.setAttribute('download', `transaction-report-${today}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <span className="text-gray-400 text-sm">
            {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} found
            {filters.from_wallet || filters.to_wallet ? ' (filtered)' : ''}
          </span>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={toggleFilters}
            className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md ${
              showFilters || filters.from_wallet || filters.to_wallet
                ? 'text-white bg-indigo-600 hover:bg-indigo-700' 
                : 'text-white bg-gray-600 hover:bg-gray-700'
            } focus:outline-none transition ease-in-out duration-150`}
          >
            <FiFilter className="mr-2" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
            {(filters.from_wallet || filters.to_wallet) && !showFilters && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-200 text-indigo-800">
                Active
              </span>
            )}
          </button>
          <button
            onClick={exportToCSV}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:border-blue-700 focus:shadow-outline-blue active:bg-blue-800 transition ease-in-out duration-150"
          >
            <FiDownload className="mr-2" />
            Export to CSV
          </button>
        </div>
      </div>
      
      {/* Filter UI */}
      {showFilters && (
        <div className="mb-6 p-4 bg-gray-800 rounded-md">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-300">Filter Transactions</h3>
            {(filters.from_wallet || filters.to_wallet) && (
              <button
                onClick={clearFilters}
                className="text-xs text-gray-400 hover:text-white flex items-center"
              >
                <FiX className="mr-1" />
                Clear Filters
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="from_wallet" className="block text-sm font-medium text-gray-400 mb-1">
                From Wallet (contains)
              </label>
              <input
                type="text"
                id="from_wallet"
                name="from_wallet"
                value={filters.from_wallet}
                onChange={handleFilterChange}
                placeholder="Enter wallet address"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm"
              />
            </div>
            
            <div>
              <label htmlFor="to_wallet" className="block text-sm font-medium text-gray-400 mb-1">
                To Wallet (contains)
              </label>
              <input
                type="text"
                id="to_wallet"
                name="to_wallet"
                value={filters.to_wallet}
                onChange={handleFilterChange}
                placeholder="Enter wallet address"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm"
              />
            </div>
          </div>
          
          <div className="mt-2 text-xs text-gray-400">
            <p>Type any part of a wallet address to filter transactions. Filters will match any part of the address.</p>
          </div>
        </div>
      )}
      
      <div className="overflow-x-auto w-full">
        <table ref={tableRef} className="w-full table-fixed divide-y divide-gray-700 relative">
        <colgroup>
          <col style={{ width: columnWidths.time }} />
          <col style={{ width: columnWidths.direction }} />
          <col style={{ width: columnWidths.from_wallet }} />
          <col style={{ width: columnWidths.to_wallet }} />
          <col style={{ width: columnWidths.solAmount }} />
          <col style={{ width: columnWidths.usdAmount }} />
          <col style={{ width: columnWidths.nzdAmount }} />
          <col style={{ width: columnWidths.id }} />
        </colgroup>
        <thead className="bg-gray-800 sticky top-0 z-10">
          <tr>
            <th 
              scope="col" 
              className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer select-none group relative"
              onClick={() => requestSort('time')}
            >
              <div className="flex items-center">
                Date & Time {getSortIndicator('time')}
                <div 
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize group-hover:bg-app-accent"
                  onMouseDown={(e) => handleResizeStart(e, 'time', columnWidths.time)}
                ></div>
              </div>
            </th>
            <th 
              scope="col" 
              className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer select-none group relative"
              onClick={() => requestSort('direction')}
            >
              <div className="flex items-center">
                Type {getSortIndicator('direction')}
                <div 
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize group-hover:bg-app-accent"
                  onMouseDown={(e) => handleResizeStart(e, 'direction', columnWidths.direction)}
                ></div>
              </div>
            </th>
            <th 
              scope="col" 
              className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer select-none group relative"
              onClick={() => requestSort('from_wallet')}
            >
              <div className="flex items-center">
                From {getSortIndicator('from_wallet')}
                <div 
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize group-hover:bg-app-accent"
                  onMouseDown={(e) => handleResizeStart(e, 'from_wallet', columnWidths.from_wallet)}
                ></div>
              </div>
            </th>
            <th 
              scope="col" 
              className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer select-none group relative"
              onClick={() => requestSort('to_wallet')}
            >
              <div className="flex items-center">
                To {getSortIndicator('to_wallet')}
                <div 
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize group-hover:bg-app-accent"
                  onMouseDown={(e) => handleResizeStart(e, 'to_wallet', columnWidths.to_wallet)}
                ></div>
              </div>
            </th>
            <th 
              scope="col" 
              className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer select-none group relative"
              onClick={() => requestSort('solAmount')}
            >
              <div className="flex items-center">
                Amount (SOL) {getSortIndicator('solAmount')}
                <div 
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize group-hover:bg-app-accent"
                  onMouseDown={(e) => handleResizeStart(e, 'solAmount', columnWidths.solAmount)}
                ></div>
              </div>
            </th>
            <th 
              scope="col" 
              className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer select-none group relative"
              onClick={() => requestSort('usdValue')}
            >
              <div className="flex items-center">
                USD Value {getSortIndicator('usdValue')}
                <div 
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize group-hover:bg-app-accent"
                  onMouseDown={(e) => handleResizeStart(e, 'usdAmount', columnWidths.usdAmount)}
                ></div>
              </div>
            </th>
            <th 
              scope="col" 
              className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer select-none group relative"
              onClick={() => requestSort('nzdValue')}
            >
              <div className="flex items-center">
                NZD Value {getSortIndicator('nzdValue')}
                <div 
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize group-hover:bg-app-accent"
                  onMouseDown={(e) => handleResizeStart(e, 'nzdAmount', columnWidths.nzdAmount)}
                ></div>
              </div>
            </th>
            <th 
              scope="col" 
              className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer select-none group relative"
              onClick={() => requestSort('id')}
            >
              <div className="flex items-center">
                Transaction ID {getSortIndicator('id')}
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="bg-gray-900 divide-y divide-gray-800">
          {filteredTransactions.map((tx) => (
            <tr key={tx.id} className="hover:bg-gray-800">
              <td className="px-4 py-3 text-sm text-gray-300 overflow-hidden text-ellipsis whitespace-nowrap">
                {format(new Date(tx.time), 'MMM dd, yyyy HH:mm:ss')}
              </td>
              <td className="px-4 py-3 text-sm overflow-hidden text-ellipsis whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  tx.direction === 'incoming' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {tx.direction === 'incoming' ? 'Incoming' : 'Outgoing'}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-300 overflow-hidden text-ellipsis whitespace-nowrap" title={tx.from_wallet}>
                {tx.from_wallet}
              </td>
              <td className="px-4 py-3 text-sm text-gray-300 overflow-hidden text-ellipsis whitespace-nowrap" title={tx.to_wallet}>
                {tx.to_wallet}
              </td>
              <td className="px-4 py-3 text-sm text-gray-300 overflow-hidden text-ellipsis whitespace-nowrap">
                {tx.solAmount.toFixed(9)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-300 overflow-hidden text-ellipsis whitespace-nowrap">
                {tx.usdValue ? `$${tx.usdValue.toFixed(2)}` : '-'}
              </td>
              <td className="px-4 py-3 text-sm text-gray-300 overflow-hidden text-ellipsis whitespace-nowrap">
                {tx.nzdValue ? `$${tx.nzdValue.toFixed(2)}` : '-'}
              </td>
              <td className="px-4 py-3 text-sm text-gray-300 overflow-hidden text-ellipsis whitespace-nowrap" title={tx.id}>
                {tx.id}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {resizingColumn && (
        <div className="fixed inset-0 z-50 cursor-col-resize" />
      )}
      </div>
    </div>
  );
};

export default TransactionTable;