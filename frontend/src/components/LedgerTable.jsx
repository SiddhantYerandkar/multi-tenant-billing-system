import { useState, useMemo } from "react"

const TYPE_FILTERS = {
  all: "All Transactions",
  invoice: "Invoices",
  job: "Jobs",
  purchase: "Purchases",
  payment: "Payments",
  adjustment: "Adjustments",
  reversal: "Reversals"
}

export default function LedgerTable({ entries = [], onExport }) {
  const [dateRangeStart, setDateRangeStart] = useState("")
  const [dateRangeEnd, setDateRangeEnd] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [showReversed, setShowReversed] = useState(true)

  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", { 
        year: "numeric", 
        month: "short", 
        day: "numeric" 
      })
    } catch {
      return dateString
    }
  }

  // Filter entries
  const filteredEntries = useMemo(() => {
    let filtered = [...entries]

    // Filter by type
    if (typeFilter !== "all") {
      filtered = filtered.filter(entry => {
        const entryType = entry.type.toLowerCase()
        if (typeFilter === "invoice") return entryType === "invoice"
        if (typeFilter === "job") return entryType === "job"
        if (typeFilter === "purchase") return entryType === "purchase"
        if (typeFilter === "payment") return entryType === "payment" || entryType === "payment reversal"
        if (typeFilter === "adjustment") return entryType === "adjustment"
        if (typeFilter === "reversal") return entryType === "reversal" || entryType === "payment reversal"
        return true
      })
    }

    // Filter reversed entries
    if (!showReversed) {
      filtered = filtered.filter(entry => entry.status !== "reversed")
    }

    // Filter by date range
    if (dateRangeStart) {
      const startDate = new Date(dateRangeStart)
      startDate.setHours(0, 0, 0, 0)
      filtered = filtered.filter(entry => {
        const entryDate = new Date(entry.date)
        entryDate.setHours(0, 0, 0, 0)
        return entryDate >= startDate
      })
    }

    if (dateRangeEnd) {
      const endDate = new Date(dateRangeEnd)
      endDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter(entry => {
        const entryDate = new Date(entry.date)
        return entryDate <= endDate
      })
    }

    return filtered
  }, [entries, typeFilter, showReversed, dateRangeStart, dateRangeEnd])

  const handleExport = () => {
    if (!onExport) return

    const csvRows = [
      ["Date", "Type", "Reference", "Debit", "Credit", "Balance"].join(",")
    ]

    filteredEntries.forEach(entry => {
      csvRows.push([
        formatDate(entry.date),
        entry.type,
        entry.referenceNumber,
        entry.debit.toFixed(2),
        entry.credit.toFixed(2),
        entry.balance.toFixed(2)
      ].join(","))
    })

    const csvContent = csvRows.join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `ledger_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md overflow-hidden">
      {/* Filters */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        <div className="flex flex-wrap items-center gap-4">
          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Type:</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-[#121617] dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            >
              {Object.entries(TYPE_FILTERS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">From:</label>
            <input
              type="date"
              value={dateRangeStart}
              onChange={(e) => setDateRangeStart(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-[#121617] dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">To:</label>
            <input
              type="date"
              value={dateRangeEnd}
              onChange={(e) => setDateRangeEnd(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-[#121617] dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          {/* Show Reversed Toggle */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showReversed}
                onChange={(e) => setShowReversed(e.target.checked)}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                Show Reversed
              </span>
            </label>
          </div>

          {/* Export Button */}
          <div className="ml-auto">
            <button
              onClick={handleExport}
              className="px-4 py-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-lg transition flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 z-10">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Reference
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">
                Debit
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">
                Credit
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">
                Balance
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                  No ledger entries found
                </td>
              </tr>
            ) : (
              filteredEntries.map((entry) => {
                const isOpeningBalance = entry.type === 'Opening Balance'
                const isReversed = entry.status === 'reversed'
                
                return (
                  <tr
                    key={entry.id}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                      isReversed ? 'opacity-60' : ''
                    }`}
                  >
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {isOpeningBalance ? (
                        <span className="font-semibold italic">Opening Balance</span>
                      ) : (
                        formatDate(entry.date)
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        entry.type === 'Invoice' 
                          ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                          : entry.type === 'Payment'
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                          : entry.type === 'Reversal'
                          ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                          : entry.type === 'Adjustment'
                          ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}>
                        {entry.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 font-mono">
                      {entry.referenceNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-medium text-red-600 dark:text-red-400">
                      {entry.debit > 0 ? `₹${entry.debit.toFixed(2)}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-medium text-green-600 dark:text-green-400">
                      {entry.credit > 0 ? `₹${entry.credit.toFixed(2)}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-bold text-[#121617] dark:text-white">
                      ₹{entry.balance.toFixed(2)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
