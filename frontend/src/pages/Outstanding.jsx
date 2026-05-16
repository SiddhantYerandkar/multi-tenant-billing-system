import { useEffect, useState, useMemo } from "react"
import { getOutstandingInvoices } from "../services/invoiceService"
import { getParties } from "../services/partyService"
import { groupInvoicesByParty } from "../utils/groupInvoicesByParty"

export default function Outstanding({ company, onViewLedger, onViewInvoices }) {
  const [outstandingInvoices, setOutstandingInvoices] = useState([])
  const [parties, setParties] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [sortBy, setSortBy] = useState("overdueDays") // "overdueDays" | "amount"
  const [sortOrder, setSortOrder] = useState("desc") // "asc" | "desc"

  useEffect(() => {
    if (company?.$id) {
      loadData()
    }
  }, [company])

  async function loadData() {
    setLoading(true)
    setError("")
    try {
      const [invoicesRes, partiesRes] = await Promise.all([
        getOutstandingInvoices(company.$id),
        getParties(company.$id)
      ])
      setOutstandingInvoices(invoicesRes.documents || [])
      setParties(partiesRes.documents || [])
    } catch (err) {
      console.error("Error loading outstanding payments:", err)
      setError("Failed to load outstanding payments. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Create party map for quick lookup
  const partyMap = useMemo(() => {
    const map = {}
    parties.forEach(p => (map[p.$id] = p))
    return map
  }, [parties])

  // Group invoices by party
  const groupedData = useMemo(() => {
    return groupInvoicesByParty(outstandingInvoices, partyMap)
  }, [outstandingInvoices, partyMap])

  // Sort grouped data
  const sortedData = useMemo(() => {
    const sorted = [...groupedData]
    
    sorted.sort((a, b) => {
      let aValue, bValue

      if (sortBy === "overdueDays") {
        aValue = a.overdueDays || 0
        bValue = b.overdueDays || 0
      } else if (sortBy === "amount") {
        aValue = a.totalOutstanding || 0
        bValue = b.totalOutstanding || 0
      } else {
        return 0
      }

      if (sortOrder === "asc") {
        return aValue - bValue
      } else {
        return bValue - aValue
      }
    })

    return sorted
  }, [groupedData, sortBy, sortOrder])

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(column)
      setSortOrder("desc")
    }
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

  const formatCurrency = (amount) => {
    return `₹${(amount || 0).toFixed(2)}`
  }

  const handleRowClick = (partyId) => {
    if (onViewInvoices) {
      // Filter invoices for this party
      const partyInvoices = outstandingInvoices.filter(inv => inv.partyId === partyId)
      onViewInvoices(partyInvoices, partyMap[partyId])
    }
  }

  if (loading) {
    return (
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <span className="material-symbols-outlined animate-spin text-4xl text-primary mb-2">
              sync
            </span>
            <p className="text-gray-500">Loading outstanding payments...</p>
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
              onClick={loadData}
              className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
            >
              Retry
            </button>
          </div>
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
              Outstanding Payments
            </h2>
            <p className="text-sm text-[#5e878d] font-medium">
              Track customers with unpaid or partially paid invoices.
            </p>
          </div>
        </div>
      </header>

      {/* TABLE */}
      <section className="flex-1 overflow-auto p-6">
        {sortedData.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#dae5e7] p-12 text-center">
            <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">
              check_circle
            </span>
            <h3 className="text-xl font-bold text-gray-600 mb-2">
              No Outstanding Payments
            </h3>
            <p className="text-sm text-gray-500">
              All invoices have been paid in full.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#dae5e7] overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-[#f0f4f5]/60">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold uppercase w-32">
                    Party Code
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase">
                    Party Name
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-center w-32">
                    Invoice Count
                  </th>
                  <th 
                    className="px-6 py-4 text-xs font-bold uppercase text-right w-40 cursor-pointer hover:bg-[#f0f4f5] transition-colors"
                    onClick={() => handleSort("amount")}
                  >
                    <div className="flex items-center justify-end gap-2">
                      <span>Total Outstanding</span>
                      {sortBy === "amount" && (
                        <span className="material-symbols-outlined text-sm">
                          {sortOrder === "asc" ? "arrow_upward" : "arrow_downward"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-center w-40">
                    Oldest Due Date
                  </th>
                  <th 
                    className="px-6 py-4 text-xs font-bold uppercase text-center w-32 cursor-pointer hover:bg-[#f0f4f5] transition-colors"
                    onClick={() => handleSort("overdueDays")}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span>Overdue Days</span>
                      {sortBy === "overdueDays" && (
                        <span className="material-symbols-outlined text-sm">
                          {sortOrder === "asc" ? "arrow_upward" : "arrow_downward"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-right w-32">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#f0f4f5]">
                {sortedData.map((group) => {
                  const isOverdue = group.overdueDays > 30
                  
                  return (
                    <tr
                      key={group.partyId}
                      onClick={() => handleRowClick(group.partyId)}
                      className={`hover:bg-primary/5 transition cursor-pointer ${
                        isOverdue ? "bg-red-50/50 hover:bg-red-100/50" : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 text-xs font-bold rounded bg-primary/10 text-primary">
                          {group.partyCode}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-bold">{group.partyName}</p>
                        {group.partyPhone && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {group.partyPhone}
                          </p>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-700">
                          {group.invoiceCount}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <span className="font-bold text-red-600">
                          {formatCurrency(group.totalOutstanding)}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center text-sm text-gray-600">
                        {formatDate(group.oldestInvoiceDate)}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded ${
                            isOverdue
                              ? "bg-red-100 text-red-700"
                              : group.overdueDays > 0
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {group.overdueDays > 0 ? `${group.overdueDays} days` : "Current"}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (onViewLedger) {
                              onViewLedger(group.partyId)
                            }
                          }}
                          className="text-primary text-xs font-bold hover:underline"
                        >
                          View Ledger
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
