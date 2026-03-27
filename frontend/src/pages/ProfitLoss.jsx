import { useEffect, useState, useMemo } from "react"
import { getProfitLossData } from "../services/profitLossService"

const DATE_PRESETS = [
  { label: "Today", value: "today" },
  { label: "This Month", value: "thisMonth" },
  { label: "Last Month", value: "lastMonth" },
  { label: "Custom Range", value: "custom" }
]

const EXPENSE_CATEGORY_LABELS = {
  salary: "Salary",
  petrol: "Petrol / Travel",
  misc: "Miscellaneous",
  rent: "Rent",
  electricity: "Electricity",
  others: "Others"
}

export default function ProfitLoss({ company }) {
  const [plData, setPlData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [datePreset, setDatePreset] = useState("thisMonth")
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")

  // Calculate date range based on preset
  const dateRange = useMemo(() => {
    const today = new Date()
    let startDate = null
    let endDate = null

    switch (datePreset) {
      case "today":
        startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
        break
      case "thisMonth":
        startDate = new Date(today.getFullYear(), today.getMonth(), 1)
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59)
        break
      case "lastMonth":
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        endDate = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59)
        break
      case "custom":
        startDate = customStartDate ? new Date(customStartDate) : null
        endDate = customEndDate ? new Date(customEndDate) : null
        break
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1)
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59)
    }

    return {
      start: startDate ? startDate.toISOString().split('T')[0] : null,
      end: endDate ? endDate.toISOString().split('T')[0] : null
    }
  }, [datePreset, customStartDate, customEndDate])

  useEffect(() => {
    if (company?.$id && dateRange.start && dateRange.end) {
      loadPLData()
    }
  }, [company, dateRange])

  async function loadPLData() {
    setLoading(true)
    setError("")
    try {
      const data = await getProfitLossData(company.$id, dateRange.start, dateRange.end)
      setPlData(data)
    } catch (err) {
      console.error("Error loading P&L data:", err)
      setError("Failed to load Profit & Loss data. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return `₹${(amount || 0).toFixed(2)}`
  }

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

  const formatDateRange = () => {
    if (datePreset === "custom") {
      return `${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`
    }
    const preset = DATE_PRESETS.find(p => p.value === datePreset)
    return preset?.label || "This Month"
  }

  if (loading) {
    return (
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <span className="material-symbols-outlined animate-spin text-4xl text-primary mb-2">
              sync
            </span>
            <p className="text-gray-500">Loading Profit & Loss...</p>
          </div>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <span className="material-symbols-outlined text-4xl text-red-500 mb-2">
              error
            </span>
            <p className="text-red-600">{error}</p>
            <button
              onClick={loadPLData}
              className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
            >
              Retry
            </button>
          </div>
        </div>
      </main>
    )
  }

  if (!plData) {
    return (
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">No data available</p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      {/* HEADER */}
      <header className="bg-white border-b border-[#dae5e7] p-6">
        <div className="flex justify-between items-end gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight">
              Profit & Loss
            </h2>
            <p className="text-sm text-[#5e878d] font-medium">
              Financial summary for {formatDateRange()}
            </p>
          </div>
        </div>
      </header>

      {/* FILTERS */}
      <div className="bg-[#f0f4f5]/60 px-6 py-4 flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => setDatePreset(preset.value)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                datePreset === preset.value
                  ? "bg-primary text-white"
                  : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {datePreset === "custom" && (
          <div className="flex gap-2">
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              placeholder="Start Date"
              className="px-4 py-2.5 rounded-xl border border-[#dae5e7] bg-white text-sm focus:ring-2 focus:ring-primary/50 outline-none"
            />
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              placeholder="End Date"
              className="px-4 py-2.5 rounded-xl border border-[#dae5e7] bg-white text-sm focus:ring-2 focus:ring-primary/50 outline-none"
            />
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-auto p-6">
        {/* Section 1: Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Total Revenue */}
          <div className="bg-white rounded-xl border border-[#dae5e7] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Total Revenue
                </p>
                <p className="text-2xl font-black text-green-600">
                  {formatCurrency(plData.revenue.totalRevenue)}
                </p>
                <div className="mt-2 text-xs text-gray-500">
                  <p>Paid: {formatCurrency(plData.revenue.paidRevenue)}</p>
                  <p>Outstanding: {formatCurrency(plData.revenue.outstandingRevenue)}</p>
                </div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <span className="material-symbols-outlined text-green-600 text-2xl">
                  trending_up
                </span>
              </div>
            </div>
          </div>

          {/* Total Expenses */}
          <div className="bg-white rounded-xl border border-[#dae5e7] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Total Expenses
                </p>
                <p className="text-2xl font-black text-red-600">
                  {formatCurrency(plData.operatingExpenses.totalExpenses)}
                </p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <span className="material-symbols-outlined text-red-600 text-2xl">
                  trending_down
                </span>
              </div>
            </div>
          </div>

          {/* Gross Profit */}
          <div className="bg-white rounded-xl border border-[#dae5e7] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Gross Profit
                </p>
                <p className={`text-2xl font-black ${
                  plData.grossProfit >= 0 ? "text-green-600" : "text-red-600"
                }`}>
                  {formatCurrency(plData.grossProfit)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Revenue - COGS ({formatCurrency(plData.cogs.totalCOGS)})
                </p>
              </div>
              <div className={`p-3 rounded-lg ${
                plData.grossProfit >= 0 ? "bg-green-50" : "bg-red-50"
              }`}>
                <span className={`material-symbols-outlined text-2xl ${
                  plData.grossProfit >= 0 ? "text-green-600" : "text-red-600"
                }`}>
                  account_balance
                </span>
              </div>
            </div>
          </div>

          {/* Net Profit */}
          <div className="bg-white rounded-xl border border-[#dae5e7] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Net Profit
                </p>
                <p className={`text-2xl font-black ${
                  plData.netProfit >= 0 ? "text-green-600" : "text-red-600"
                }`}>
                  {formatCurrency(plData.netProfit)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Gross Profit - Expenses
                </p>
              </div>
              <div className={`p-3 rounded-lg ${
                plData.netProfit >= 0 ? "bg-green-50" : "bg-red-50"
              }`}>
                <span className={`material-symbols-outlined text-2xl ${
                  plData.netProfit >= 0 ? "text-green-600" : "text-red-600"
                }`}>
                  {plData.netProfit >= 0 ? "savings" : "money_off"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Breakdown Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Breakdown */}
          <div className="bg-white rounded-xl border border-[#dae5e7] p-6">
            <h3 className="text-lg font-bold mb-4">Revenue Breakdown</h3>
            {plData.revenue.breakdown.length === 0 ? (
              <p className="text-sm text-gray-500">No revenue in this period</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-[#f0f4f5]/60">
                    <tr>
                      <th className="px-4 py-2 text-xs font-bold uppercase">Invoice</th>
                      <th className="px-4 py-2 text-xs font-bold uppercase text-right">Amount</th>
                      <th className="px-4 py-2 text-xs font-bold uppercase text-right">Paid</th>
                      <th className="px-4 py-2 text-xs font-bold uppercase text-right">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f4f5]">
                    {plData.revenue.breakdown.map((item) => (
                      <tr key={item.invoiceId} className="hover:bg-primary/5">
                        <td className="px-4 py-2">
                          <p className="text-sm font-semibold">{item.invoiceNumber || "N/A"}</p>
                          <p className="text-xs text-gray-500">{formatDate(item.invoiceDate)}</p>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <span className="font-semibold">{formatCurrency(item.amount)}</span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <span className="text-green-600">{formatCurrency(item.paidAmount)}</span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <span className="text-orange-600">{formatCurrency(item.outstandingAmount)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-[#f0f4f5]/60">
                    <tr>
                      <td className="px-4 py-3 font-bold">Total</td>
                      <td className="px-4 py-3 text-right font-bold">{formatCurrency(plData.revenue.totalRevenue)}</td>
                      <td className="px-4 py-3 text-right font-bold text-green-600">{formatCurrency(plData.revenue.paidRevenue)}</td>
                      <td className="px-4 py-3 text-right font-bold text-orange-600">{formatCurrency(plData.revenue.outstandingRevenue)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* COGS Breakdown */}
          <div className="bg-white rounded-xl border border-[#dae5e7] p-6">
            <h3 className="text-lg font-bold mb-4">Cost of Goods Sold (COGS)</h3>
            {plData.cogs.breakdown.length === 0 ? (
              <p className="text-sm text-gray-500">No purchases in this period</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-[#f0f4f5]/60">
                    <tr>
                      <th className="px-4 py-2 text-xs font-bold uppercase">Item</th>
                      <th className="px-4 py-2 text-xs font-bold uppercase">Date</th>
                      <th className="px-4 py-2 text-xs font-bold uppercase text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f4f5]">
                    {plData.cogs.breakdown.slice(0, 10).map((item) => (
                      <tr key={item.purchaseId} className="hover:bg-primary/5">
                        <td className="px-4 py-2">
                          <p className="text-sm font-semibold">{item.itemName || "N/A"}</p>
                        </td>
                        <td className="px-4 py-2">
                          <span className="text-xs text-gray-500">{formatDate(item.purchaseDate)}</span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <span className="font-semibold text-red-600">{formatCurrency(item.amount)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-[#f0f4f5]/60">
                    <tr>
                      <td colSpan="2" className="px-4 py-3 font-bold">Total COGS</td>
                      <td className="px-4 py-3 text-right font-bold text-red-600">{formatCurrency(plData.cogs.totalCOGS)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Expense Breakdown */}
          <div className="bg-white rounded-xl border border-[#dae5e7] p-6 lg:col-span-2">
            <h3 className="text-lg font-bold mb-4">Operating Expenses Breakdown</h3>
            {plData.operatingExpenses.breakdown.length === 0 ? (
              <p className="text-sm text-gray-500">No expenses in this period</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-[#f0f4f5]/60">
                    <tr>
                      <th className="px-4 py-2 text-xs font-bold uppercase">Date</th>
                      <th className="px-4 py-2 text-xs font-bold uppercase">Title</th>
                      <th className="px-4 py-2 text-xs font-bold uppercase">Category</th>
                      <th className="px-4 py-2 text-xs font-bold uppercase text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f4f5]">
                    {plData.operatingExpenses.breakdown.map((item) => (
                      <tr key={item.expenseId} className="hover:bg-primary/5">
                        <td className="px-4 py-2">
                          <span className="text-sm text-gray-600">{formatDate(item.expenseDate)}</span>
                        </td>
                        <td className="px-4 py-2">
                          <p className="text-sm font-semibold">{item.title || "N/A"}</p>
                        </td>
                        <td className="px-4 py-2">
                          <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-700">
                            {EXPENSE_CATEGORY_LABELS[item.category] || item.category}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <span className="font-semibold text-red-600">{formatCurrency(item.amount)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-[#f0f4f5]/60">
                    <tr>
                      <td colSpan="3" className="px-4 py-3 font-bold">Total Operating Expenses</td>
                      <td className="px-4 py-3 text-right font-bold text-red-600">{formatCurrency(plData.operatingExpenses.totalExpenses)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
