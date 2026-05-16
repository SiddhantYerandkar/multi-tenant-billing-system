export default function LedgerSummary({ summary, isSupplier = false }) {
  const { totalInvoiced = 0, totalPaid = 0, outstandingBalance = 0 } = summary || {}
  const expenseLabel = isSupplier ? "Total Expense" : "Total Invoiced"

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Total Invoiced / Total Expense */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              {expenseLabel}
            </p>
            <p className="text-2xl font-black text-[#121617] dark:text-white">
              ₹{totalInvoiced.toFixed(2)}
            </p>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">
              {isSupplier ? "shopping_cart" : "receipt_long"}
            </span>
          </div>
        </div>
      </div>

      {/* Total Paid */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Total Paid
            </p>
            <p className="text-2xl font-black text-green-600 dark:text-green-400">
              ₹{totalPaid.toFixed(2)}
            </p>
          </div>
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-2xl">
              payments
            </span>
          </div>
        </div>
      </div>

      {/* Outstanding Balance */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Outstanding Balance
            </p>
            <p className={`text-2xl font-black ${
              outstandingBalance >= 0 
                ? 'text-red-600 dark:text-red-400' 
                : 'text-green-600 dark:text-green-400'
            }`}>
              ₹{Math.abs(outstandingBalance).toFixed(2)}
            </p>
            {outstandingBalance < 0 && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                (Credit Balance)
              </p>
            )}
          </div>
          <div className={`p-3 rounded-lg ${
            outstandingBalance >= 0 
              ? 'bg-red-50 dark:bg-red-900/20' 
              : 'bg-green-50 dark:bg-green-900/20'
          }`}>
            <span className={`material-symbols-outlined text-2xl ${
              outstandingBalance >= 0 
                ? 'text-red-600 dark:text-red-400' 
                : 'text-green-600 dark:text-green-400'
            }`}>
              account_balance_wallet
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
