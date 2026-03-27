import { useEffect, useMemo, useState } from "react"
import { getParties } from "../services/partyService"
import { listInvoices, getInvoiceItems } from "../services/invoiceService"
import CreateInvoiceModal from "../components/CreateInvoiceModal"
import { generateInvoicePDF } from "../utils/pdfGenerator"

const STATUS_STYLES = {
  paid: "bg-status-paid-bg text-status-paid-text",
  unpaid: "bg-status-pending-bg text-status-pending-text",
  pending: "bg-status-pending-bg text-status-pending-text",
  partial: "bg-status-overdue-bg text-status-overdue-text",
}

export default function Invoices({ company, onViewInvoice }) {
  const [parties, setParties] = useState([])
  const [invoices, setInvoices] = useState([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateRangeStart, setDateRangeStart] = useState("")
  const [dateRangeEnd, setDateRangeEnd] = useState("")
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [showDateRangePicker, setShowDateRangePicker] = useState(false)
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false)
  useEffect(() => {
    async function load() {
      const [partyRes, invoiceRes] = await Promise.all([
        getParties(company.$id),
        listInvoices(company.$id),
      ])
      setParties(partyRes.documents)
      setInvoices(invoiceRes.documents)
    }
    load()
  }, [])

  const partyMap = useMemo(() => {
    const map = {}
    parties.forEach(p => (map[p.$id] = p))
    return map
  }, [parties])

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

  const isDateInRange = (dateString) => {
    if (!dateRangeStart && !dateRangeEnd) return true
    
    try {
      const invoiceDate = new Date(dateString)
      invoiceDate.setHours(0, 0, 0, 0)
      
      if (dateRangeStart && dateRangeEnd) {
        const start = new Date(dateRangeStart)
        start.setHours(0, 0, 0, 0)
        const end = new Date(dateRangeEnd)
        end.setHours(23, 59, 59, 999)
        return invoiceDate >= start && invoiceDate <= end
      } else if (dateRangeStart) {
        const start = new Date(dateRangeStart)
        start.setHours(0, 0, 0, 0)
        return invoiceDate >= start
      } else if (dateRangeEnd) {
        const end = new Date(dateRangeEnd)
        end.setHours(23, 59, 59, 999)
        return invoiceDate <= end
      }
      
      return true
    } catch {
      return true
    }
  }

  const filteredInvoices = invoices.filter(inv => {
    // Search filter
    const matchesSearch = 
    inv.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) ||
    partyMap[inv.partyId]?.name?.toLowerCase().includes(search.toLowerCase())
    
    // Status filter
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter
    
    // Date range filter
    const matchesDateRange = isDateInRange(inv.invoiceDate)
    
    return matchesSearch && matchesStatus && matchesDateRange
  })

  const handleStatusFilter = (status) => {
    setStatusFilter(status)
    setShowStatusDropdown(false)
  }

  const handleDateRangeApply = () => {
    setShowDateRangePicker(false)
  }

  const handleDateRangeClear = () => {
    setDateRangeStart("")
    setDateRangeEnd("")
    setShowDateRangePicker(false)
  }

  const getStatusDisplayName = (status) => {
    const statusMap = {
      all: "All",
      paid: "Paid",
      pending: "Pending",
      partial: "Partial",
      draft: "Draft"
    }
    return statusMap[status] || "All"
  }

  const handleCreateInvoice = () => {
    setShowCreateInvoiceModal(true)
  }

  const handleViewInvoice = (invoice) => {
    if (onViewInvoice) {
      onViewInvoice(invoice.$id)
    }
  }

  const handleDownloadPDF = async (invoice) => {
    try {
      // Get invoice items
      const itemsRes = await getInvoiceItems(invoice.$id)
      const invoiceItems = itemsRes.documents
      
      // Get party details
      const party = partyMap[invoice.partyId]
      
      // Generate and download PDF
      await generateInvoicePDF(invoice, invoiceItems, company, party)
    } catch (error) {
      console.error("Error downloading PDF:", error)
      alert("Failed to generate PDF. Please try again.")
    }
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.relative')) {
        setShowDateRangePicker(false)
        setShowStatusDropdown(false)
      }
    }
    
    if (showDateRangePicker || showStatusDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDateRangePicker, showStatusDropdown])

  return (
    <main className="flex-1 overflow-y-auto flex flex-col bg-background-light">

      {/* HEADER */}
      <header className="p-8 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight">Invoices</h2>
            <p className="text-[#638288] text-sm mt-1">
              Efficiently track and manage your outgoing financial transactions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-zinc-200 bg-white rounded-lg text-sm font-bold">
              <span className="material-symbols-outlined">download</span>
              Export CSV
            </button>
            <button onClick={handleCreateInvoice} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-md">
              <span className="material-symbols-outlined">add</span>
              Create Invoice
            </button>
          </div>
        </div>
      </header>

      {/* SEARCH BAR */}
      <section className="px-8 py-4">
        <div className="bg-white border border-zinc-200 p-3 rounded-xl shadow-sm flex items-center gap-3">
          <span className="material-symbols-outlined text-zinc-400">search</span>

          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by Invoice # or Customer..."
            className="w-full bg-transparent border-none focus:ring-0 text-sm"
          />

          <div className="flex items-center gap-2 relative">
            <div className="relative">
              <button 
                onClick={() => {
                  setShowStatusDropdown(!showStatusDropdown)
                  setShowDateRangePicker(false)
                }}
                className="flex items-center gap-2 px-3 py-2 bg-zinc-50 rounded-lg text-xs font-semibold text-zinc-600 border border-zinc-100 hover:border-zinc-300 whitespace-nowrap"
              >
                Status: {getStatusDisplayName(statusFilter)}
              <span className="material-symbols-outlined text-sm">expand_more</span>
            </button>

              {showStatusDropdown && (
                <div className="absolute top-full right-0 mt-2 bg-white border border-zinc-200 rounded-lg shadow-lg z-20 p-3 min-w-[200px]">
                  <div className="space-y-2">
                    <button
                      onClick={() => handleStatusFilter("all")}
                      className={`w-full text-left px-3 py-2 rounded text-xs font-semibold ${
                        statusFilter === "all" ? "bg-primary text-white" : "hover:bg-zinc-50"
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => handleStatusFilter("paid")}
                      className={`w-full text-left px-3 py-2 rounded text-xs font-semibold ${
                        statusFilter === "paid" ? "bg-primary text-white" : "hover:bg-zinc-50"
                      }`}
                    >
                      Paid
                    </button>
                    <button
                      onClick={() => handleStatusFilter("pending")}
                      className={`w-full text-left px-3 py-2 rounded text-xs font-semibold ${
                        statusFilter === "pending" ? "bg-primary text-white" : "hover:bg-zinc-50"
                      }`}
                    >
                      Pending
                    </button>
                    <button
                      onClick={() => handleStatusFilter("partial")}
                      className={`w-full text-left px-3 py-2 rounded text-xs font-semibold ${
                        statusFilter === "partial" ? "bg-primary text-white" : "hover:bg-zinc-50"
                      }`}
                    >
                      Partial
                    </button>
                    <button
                      onClick={() => handleStatusFilter("draft")}
                      className={`w-full text-left px-3 py-2 rounded text-xs font-semibold ${
                        statusFilter === "draft" ? "bg-primary text-white" : "hover:bg-zinc-50"
                      }`}
                    >
                      Draft
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button 
                onClick={() => {
                  setShowDateRangePicker(!showDateRangePicker)
                  setShowStatusDropdown(false)
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border whitespace-nowrap ${
                  dateRangeStart || dateRangeEnd
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-zinc-50 border-zinc-100 hover:border-zinc-300 text-zinc-600"
                }`}
              >
                {dateRangeStart || dateRangeEnd 
                  ? `${dateRangeStart ? formatDate(dateRangeStart) : "..."} - ${dateRangeEnd ? formatDate(dateRangeEnd) : "..."}`
                  : "Date Range"
                }
              <span className="material-symbols-outlined text-sm">calendar_month</span>
            </button>
              
              {showDateRangePicker && (
                <div className="absolute top-full right-0 mt-2 bg-white border border-zinc-200 rounded-lg shadow-lg z-20 p-4 min-w-[300px]">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={dateRangeStart}
                        onChange={(e) => setDateRangeStart(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">End Date</label>
                      <input
                        type="date"
                        value={dateRangeEnd}
                        onChange={(e) => setDateRangeEnd(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={handleDateRangeApply}
                        className="flex-1 px-3 py-2 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90"
                      >
                        Apply
                      </button>
                      <button
                        onClick={handleDateRangeClear}
                        className="px-3 py-2 bg-zinc-100 text-zinc-600 rounded-lg text-xs font-semibold hover:bg-zinc-200"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="w-px h-6 bg-zinc-200 mx-1"></div>

            <button className="p-2 text-zinc-500 hover:bg-zinc-100 rounded-lg transition-colors">
              <span className="material-symbols-outlined">filter_list</span>
            </button>
          </div>
        </div>
      </section>

      <section className="px-8 pb-4 flex gap-2 overflow-x-auto no-scrollbar">
        <button 
          onClick={() => handleStatusFilter("all")}
          className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
            statusFilter === "all"
              ? "bg-primary text-white"
              : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
          }`}
        >
          All Invoices
        </button>

        <button 
          onClick={() => handleStatusFilter("paid")}
          className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
            statusFilter === "paid"
              ? "bg-primary text-white"
              : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
          }`}
        >
          Paid
        </button>

        <button 
          onClick={() => handleStatusFilter("pending")}
          className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
            statusFilter === "pending"
              ? "bg-primary text-white"
              : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
          }`}
        >
          Pending
        </button>

        <button 
          onClick={() => handleStatusFilter("partial")}
          className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
            statusFilter === "partial"
              ? "bg-primary text-white"
              : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
          }`}
        >
          Partial
        </button>

        <button 
          onClick={() => handleStatusFilter("draft")}
          className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
            statusFilter === "draft"
              ? "bg-primary text-white"
              : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
          }`}
        >
          Draft
        </button>
      </section>



      {/* TABLE */}
      <section className="px-8 pb-8 flex-1">
        <div className="bg-white border border-zinc-200 rounded-xl shadow-md overflow-hidden flex flex-col h-full">

          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-zinc-50 border-b border-zinc-200 z-10">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase w-[140px]">
                    Invoice #
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase">
                    Customer (Party)
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase">
                    Order No
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase text-right">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase text-right">
                    Paid
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase text-center">
                    Status
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100">
                {filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-10 text-center text-sm text-zinc-500">
                      No invoices found
                    </td>
                  </tr>
                )}

                {filteredInvoices.map(inv => (
                  <tr key={inv.$id} className="hover:bg-zinc-50 transition-colors group">
                    <td className="px-6 py-4 text-sm font-bold text-primary whitespace-nowrap">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600">
                      {formatDate(inv.invoiceDate)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      {partyMap[inv.partyId]?.name || "Unknown"}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-right">
                      {inv.orderNo}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-right">
                      ₹{inv.grandTotal?.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-right">
                      ₹{inv.paidAmount?.toFixed(2) || 0}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${STATUS_STYLES[inv.status] || STATUS_STYLES.pending
                          }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => handleViewInvoice(inv)} className="text-primary text-xs font-bold hover:underline">
                          View
                        </button>
                        <button 
                          onClick={() => handleDownloadPDF(inv)}
                          className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-md"
                          title="Download PDF"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            picture_as_pdf
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* PAGINATION FOOTER (STATIC STYLE) */}
          <div className="p-4 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between">
            <p className="text-xs text-zinc-500 font-medium">
              Showing <b>1 {filteredInvoices.length}</b> of <b>{filteredInvoices.length}</b> invoices
            </p>
            <div className="flex gap-1">
              <button className="p-1 px-3 border border-zinc-200 rounded-lg text-xs font-bold bg-white">
                Previous
              </button>
              <button className="p-1 px-3 border border-primary text-primary rounded-lg text-xs font-bold bg-primary/10">
                1
              </button>
              <button className="p-1 px-3 border border-zinc-200 rounded-lg text-xs font-bold bg-white">
                Next
              </button>
            </div>
          </div>
        </div>
      </section>

      <CreateInvoiceModal
        open={showCreateInvoiceModal}
        onClose={() => setShowCreateInvoiceModal(false)}
        company={company}
        onInvoiceCreated={async () => {
          const invoiceRes = await listInvoices(company.$id)
          setInvoices(invoiceRes.documents)
        }}
      />
    </main>
  )
}
