import { useEffect, useState, useMemo } from "react"
import {
  getSalesReport,
  getOutstandingReport,
  getSupplierCostReport,
  getExpenseReport,
  getJobProfitabilityReport,
  getMonthlySummaryReport
} from "../services/reportsService"
import { exportToCSV, formatCurrencyForExport, formatDateForExport } from "../utils/exportUtils"
import ReportTable from "../components/ReportTable"

const DATE_PRESETS = [
  { label: "Today", value: "today" },
  { label: "This Month", value: "thisMonth" },
  { label: "Last Month", value: "lastMonth" },
  { label: "Custom Range", value: "custom" }
]

const REPORT_TYPES = [
  { id: "sales", label: "Sales Report", icon: "receipt_long" },
  { id: "outstanding", label: "Outstanding Report", icon: "account_balance_wallet" },
  { id: "supplier-cost", label: "Supplier Cost Report", icon: "local_shipping" },
  { id: "expense", label: "Expense Report", icon: "payments" },
  { id: "job-profitability", label: "Job Profitability Report", icon: "work" },
  { id: "monthly-summary", label: "Monthly Summary", icon: "assessment" }
]

const EXPENSE_CATEGORY_LABELS = {
  salary: "Salary",
  petrol: "Petrol / Travel",
  misc: "Miscellaneous",
  rent: "Rent",
  electricity: "Electricity",
  others: "Others"
}

export default function Reports({ company }) {
  const [reportType, setReportType] = useState("sales")
  const [datePreset, setDatePreset] = useState("thisMonth")
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [expenseGroupBy, setExpenseGroupBy] = useState("category")

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
      loadReport()
    }
  }, [company, reportType, dateRange, expenseGroupBy])

  async function loadReport() {
    setLoading(true)
    setError("")
    try {
      let data = null

      switch (reportType) {
        case "sales":
          data = await getSalesReport(company.$id, dateRange.start, dateRange.end)
          break
        case "outstanding":
          data = await getOutstandingReport(company.$id)
          break
        case "supplier-cost":
          data = await getSupplierCostReport(company.$id, dateRange.start, dateRange.end)
          break
        case "expense":
          data = await getExpenseReport(company.$id, dateRange.start, dateRange.end, expenseGroupBy)
          break
        case "job-profitability":
          data = await getJobProfitabilityReport(company.$id, dateRange.start, dateRange.end)
          break
        case "monthly-summary":
          data = await getMonthlySummaryReport(company.$id, dateRange.start, dateRange.end)
          break
        default:
          data = []
      }

      setReportData(data)
    } catch (err) {
      console.error("Error loading report:", err)
      setError("Failed to load report. Please try again.")
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

  const handleExportCSV = () => {
    if (!reportData || (Array.isArray(reportData) && reportData.length === 0)) {
      alert("No data to export")
      return
    }

    let exportData = []
    let filename = ""
    let headers = []

    switch (reportType) {
      case "sales":
        filename = `sales-report-${dateRange.start}-${dateRange.end}`
        headers = ["Invoice No", "Party Name", "Invoice Date", "Total Amount", "Paid Amount", "Outstanding Amount"]
        exportData = reportData.map(item => ({
          "Invoice No": item.invoiceNo,
          "Party Name": item.partyName,
          "Invoice Date": formatDateForExport(item.invoiceDate),
          "Total Amount": formatCurrencyForExport(item.totalAmount),
          "Paid Amount": formatCurrencyForExport(item.paidAmount),
          "Outstanding Amount": formatCurrencyForExport(item.outstandingAmount)
        }))
        break
      case "outstanding":
        filename = "outstanding-report"
        headers = ["Name", "Type", "Total Amount", "Paid Amount", "Outstanding Amount"]
        exportData = reportData.map(item => ({
          Name: item.name,
          Type: item.type,
          "Total Amount": formatCurrencyForExport(item.totalAmount),
          "Paid Amount": formatCurrencyForExport(item.paidAmount),
          "Outstanding Amount": formatCurrencyForExport(item.outstandingAmount)
        }))
        break
      case "supplier-cost":
        filename = `supplier-cost-report-${dateRange.start}-${dateRange.end}`
        headers = ["Supplier Name", "Job Costs", "Purchase Costs", "Total Cost"]
        exportData = reportData.map(item => ({
          "Supplier Name": item.supplierName,
          "Job Costs": formatCurrencyForExport(item.jobCosts),
          "Purchase Costs": formatCurrencyForExport(item.purchaseCosts),
          "Total Cost": formatCurrencyForExport(item.totalCost)
        }))
        break
      case "expense":
        filename = `expense-report-${dateRange.start}-${dateRange.end}`
        if (expenseGroupBy === "category") {
          headers = ["Category", "Total Amount", "Count"]
          exportData = reportData.map(item => ({
            Category: EXPENSE_CATEGORY_LABELS[item.category] || item.category,
            "Total Amount": formatCurrencyForExport(item.totalAmount),
            Count: item.count
          }))
        } else {
          headers = ["Date", "Total Amount", "Count"]
          exportData = reportData.map(item => ({
            Date: formatDateForExport(item.date),
            "Total Amount": formatCurrencyForExport(item.totalAmount),
            Count: item.count
          }))
        }
        break
      case "job-profitability":
        filename = `job-profitability-report-${dateRange.start}-${dateRange.end}`
        headers = ["Job No", "Revenue", "Cost", "Profit / Loss", "Profit Margin %"]
        exportData = reportData.map(item => ({
          "Job No": item.jobNo,
          Revenue: formatCurrencyForExport(item.revenue),
          Cost: formatCurrencyForExport(item.cost),
          "Profit / Loss": formatCurrencyForExport(item.profit),
          "Profit Margin %": `${item.profitMargin}%`
        }))
        break
      case "monthly-summary":
        filename = `monthly-summary-${dateRange.start}-${dateRange.end}`
        headers = ["Metric", "Amount"]
        exportData = [
          { Metric: "Total Revenue", Amount: formatCurrencyForExport(reportData.totalRevenue) },
          { Metric: "Total Supplier Cost", Amount: formatCurrencyForExport(reportData.totalSupplierCost) },
          { Metric: "Total Expenses", Amount: formatCurrencyForExport(reportData.totalExpenses) },
          { Metric: "Net Profit", Amount: formatCurrencyForExport(reportData.netProfit) },
          { Metric: "Profit Margin %", Amount: `${reportData.profitMargin}%` }
        ]
        break
    }

    exportToCSV(exportData, filename, headers)
  }

  const renderReportContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <span className="material-symbols-outlined animate-spin text-4xl text-primary mb-2">
              sync
            </span>
            <p className="text-gray-500">Loading report...</p>
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <span className="material-symbols-outlined text-4xl text-red-500 mb-2">
              error
            </span>
            <p className="text-red-600">{error}</p>
            <button
              onClick={loadReport}
              className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
            >
              Retry
            </button>
          </div>
        </div>
      )
    }

    if (!reportData) {
      return (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500">Select a report type to view data</p>
        </div>
      )
    }

    // Monthly Summary - Special card layout
    if (reportType === "monthly-summary") {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-[#dae5e7] p-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Total Revenue
            </p>
            <p className="text-2xl font-black text-green-600">
              {formatCurrency(reportData.totalRevenue)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-[#dae5e7] p-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Supplier Cost
            </p>
            <p className="text-2xl font-black text-red-600">
              {formatCurrency(reportData.totalSupplierCost)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-[#dae5e7] p-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Total Expenses
            </p>
            <p className="text-2xl font-black text-red-600">
              {formatCurrency(reportData.totalExpenses)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-[#dae5e7] p-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Net Profit
            </p>
            <p className={`text-2xl font-black ${reportData.netProfit >= 0 ? "text-green-600" : "text-red-600"
              }`}>
              {formatCurrency(reportData.netProfit)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Margin: {reportData.profitMargin}%
            </p>
          </div>
        </div>
      )
    }

    // Table-based reports
    if (Array.isArray(reportData) && reportData.length === 0) {
      return (
        <div className="bg-white rounded-xl border border-[#dae5e7] p-12 text-center">
          <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">
            description
          </span>
          <h3 className="text-xl font-bold text-gray-600 mb-2">
            No Data Found
          </h3>
          <p className="text-sm text-gray-500">
            No data available for the selected period and filters.
          </p>
        </div>
      )
    }

    // Render appropriate table based on report type
    switch (reportType) {
      case "sales":
        return (
          <ReportTable
            data={reportData}
            columns={[
              { key: "invoiceNo", label: "Invoice No" },
              { key: "partyName", label: "Party Name" },
              { key: "invoiceDate", label: "Date", format: formatDate },
              { key: "totalAmount", label: "Total Amount", format: formatCurrency, align: "right" },
              { key: "paidAmount", label: "Paid", format: formatCurrency, align: "right", color: "green" },
              { key: "outstandingAmount", label: "Outstanding", format: formatCurrency, align: "right", color: "orange" }
            ]}
          />
        )
      case "outstanding":
        return (
          <ReportTable
            data={reportData}
            columns={[
              { key: "name", label: "Name" },
              { key: "type", label: "Type", badge: true },
              { key: "totalAmount", label: "Total Amount", format: formatCurrency, align: "right" },
              { key: "paidAmount", label: "Paid", format: formatCurrency, align: "right", color: "green" },
              { key: "outstandingAmount", label: "Outstanding", format: formatCurrency, align: "right", color: "red" }
            ]}
          />
        )
      case "supplier-cost":
        return (
          <ReportTable
            data={reportData}
            columns={[
              { key: "supplierName", label: "Supplier Name" },
              { key: "jobCosts", label: "Job Costs", format: formatCurrency, align: "right" },
              { key: "purchaseCosts", label: "Purchase Costs", format: formatCurrency, align: "right" },
              { key: "totalCost", label: "Total Cost", format: formatCurrency, align: "right", color: "red" }
            ]}
          />
        )
      case "expense":
        return (
          <ReportTable
            data={reportData}
            columns={expenseGroupBy === "category" ? [
              { key: "category", label: "Category", format: (val) => EXPENSE_CATEGORY_LABELS[val] || val },
              { key: "totalAmount", label: "Total Amount", format: formatCurrency, align: "right", color: "red" },
              { key: "count", label: "Count", align: "right" }
            ] : [
              { key: "date", label: "Date", format: formatDate },
              { key: "totalAmount", label: "Total Amount", format: formatCurrency, align: "right", color: "red" },
              { key: "count", label: "Count", align: "right" }
            ]}
          />
        )
      case "job-profitability":
        return (
          <ReportTable
            data={reportData}
            columns={[
              { key: "jobNo", label: "Job No" },
              { key: "revenue", label: "Revenue", format: formatCurrency, align: "right", color: "green" },
              { key: "cost", label: "Cost", format: formatCurrency, align: "right", color: "red" },
              { key: "profit", label: "Profit / Loss", format: formatCurrency, align: "right", color: (val) => val >= 0 ? "green" : "red" },
              { key: "profitMargin", label: "Margin %", format: (val) => `${val}%`, align: "right" }
            ]}
          />
        )
      default:
        return null
    }
  }

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      {/* HEADER */}
      <header className="bg-white border-b border-[#dae5e7] p-6">
        <div className="flex justify-between items-end gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight">
              Reports
            </h2>
            <p className="text-sm text-[#5e878d] font-medium">
              Financial insights and analytics
            </p>
          </div>
          {reportData && (
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 h-11 px-6 rounded-lg bg-primary text-white font-bold shadow"
            >
              <span className="material-symbols-outlined text-lg">download</span>
              Export CSV
            </button>
          )}
        </div>
      </header>

      {/* FILTERS */}
      <div className="bg-[#f0f4f5]/60 px-6 py-4 flex flex-col gap-4">
        {/* Date Range */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => setDatePreset(preset.value)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${datePreset === preset.value
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

        {/* Report Type Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {REPORT_TYPES.map((type) => {
            const active = reportType === type.id

            return (
              <button
                key={type.id}
                onClick={() => setReportType(type.id)}
                className={`group relative flex flex-col items-center justify-center gap-2
          rounded-xl border px-3 py-4 text-center transition-all
          ${active
                    ? "bg-primary text-white border-primary shadow-md"
                    : "bg-white border-zinc-200 text-zinc-600 hover:border-primary/40 hover:bg-primary/5"
                  }`}
              >
                <span
                  className={`material-symbols-outlined text-2xl transition-colors ${active ? "text-white" : "text-primary"
                    }`}
                >
                  {type.icon}
                </span>

                <span className="text-xs font-bold leading-tight">
                  {type.label}
                </span>

                {active && (
                  <span className="absolute -bottom-1 h-1 w-10 rounded-full bg-white/80" />
                )}
              </button>
            )
          })}
        </div>

        {/* Expense Group By (only for expense report) */}
        {reportType === "expense" && (
          <div className="flex gap-2">
            <button
              onClick={() => setExpenseGroupBy("category")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${expenseGroupBy === "category"
                  ? "bg-primary text-white"
                  : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                }`}
            >
              Group by Category
            </button>
            <button
              onClick={() => setExpenseGroupBy("date")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${expenseGroupBy === "date"
                  ? "bg-primary text-white"
                  : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                }`}
            >
              Group by Date
            </button>
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-auto p-6">
        {renderReportContent()}
      </div>
    </main>
  )
}
