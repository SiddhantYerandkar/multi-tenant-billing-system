import { useEffect, useState, useMemo } from "react"
import { getPurchases } from "../services/purchaseService"
import { getSuppliers } from "../services/supplierService"
import CreatePurchaseModal from "../components/CreatePurchaseModal"
import EditPurchaseModal from "../components/EditPurchaseModal"

export default function Purchases({ company }) {
  const [purchases, setPurchases] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState(null)
  const [supplierFilter, setSupplierFilter] = useState("all")
  const [dateRangeStart, setDateRangeStart] = useState("")
  const [dateRangeEnd, setDateRangeEnd] = useState("")

  useEffect(() => {
    if (company?.$id) {
      loadData()
    }
  }, [company])

  async function loadData() {
    setLoading(true)
    setError("")
    try {
      const [purchasesRes, suppliersRes] = await Promise.all([
        getPurchases(company.$id),
        getSuppliers(company.$id)
      ])
      setPurchases(purchasesRes.documents || [])
      setSuppliers(suppliersRes.documents || [])
    } catch (err) {
      console.error("Error loading purchases:", err)
      setError("Failed to load purchases. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const filteredPurchases = useMemo(() => {
    let filtered = [...purchases]

    // Filter by supplier
    if (supplierFilter !== "all") {
      filtered = filtered.filter(p => p.supplierId === supplierFilter)
    }

    // Filter by date range
    if (dateRangeStart) {
      const startDate = new Date(dateRangeStart)
      startDate.setHours(0, 0, 0, 0)
      filtered = filtered.filter(p => {
        const purchaseDate = new Date(p.purchaseDate)
        purchaseDate.setHours(0, 0, 0, 0)
        return purchaseDate >= startDate
      })
    }

    if (dateRangeEnd) {
      const endDate = new Date(dateRangeEnd)
      endDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter(p => {
        const purchaseDate = new Date(p.purchaseDate)
        return purchaseDate <= endDate
      })
    }

    // Sort by date DESC
    filtered.sort((a, b) => {
      const dateA = new Date(a.purchaseDate || a.$createdAt).getTime()
      const dateB = new Date(b.purchaseDate || b.$createdAt).getTime()
      return dateB - dateA
    })

    return filtered
  }, [purchases, supplierFilter, dateRangeStart, dateRangeEnd])

  const supplierMap = useMemo(() => {
    const map = {}
    suppliers.forEach(s => (map[s.$id] = s))
    return map
  }, [suppliers])

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

  const handleEdit = (purchase) => {
    setSelectedPurchase(purchase)
    setShowEditModal(true)
  }

  const handlePurchaseSaved = () => {
    loadData()
    setShowAddModal(false)
    setShowEditModal(false)
    setSelectedPurchase(null)
  }

  if (loading) {
    return (
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <span className="material-symbols-outlined animate-spin text-4xl text-primary mb-2">
              sync
            </span>
            <p className="text-gray-500">Loading purchases...</p>
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
              Purchases
            </h2>
            <p className="text-sm text-[#5e878d] font-medium">
              Track material expenses and supplies.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 h-11 px-6 rounded-lg bg-primary text-white font-bold shadow"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Add Purchase
          </button>
        </div>
      </header>

      {/* FILTERS */}
      <div className="bg-[#f0f4f5]/60 px-6 py-4 flex flex-col md:flex-row gap-4">
        {/* Supplier Filter */}
        <div className="bg-white border border-[#dae5e7] rounded-xl">
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border-0 bg-white text-sm focus:ring-2 focus:ring-primary/50 outline-none"
          >
            <option value="all">All Suppliers</option>
            {suppliers.map((supplier) => (
              <option key={supplier.$id} value={supplier.$id}>
                {supplier.name} ({supplier.supplierCode})
              </option>
            ))}
          </select>
        </div>

        {/* Date Range */}
        <div className="flex gap-2">
          <input
            type="date"
            value={dateRangeStart}
            onChange={(e) => setDateRangeStart(e.target.value)}
            placeholder="Start Date"
            className="px-4 py-2.5 rounded-xl border border-[#dae5e7] bg-white text-sm focus:ring-2 focus:ring-primary/50 outline-none"
          />
          <input
            type="date"
            value={dateRangeEnd}
            onChange={(e) => setDateRangeEnd(e.target.value)}
            placeholder="End Date"
            className="px-4 py-2.5 rounded-xl border border-[#dae5e7] bg-white text-sm focus:ring-2 focus:ring-primary/50 outline-none"
          />
          {(dateRangeStart || dateRangeEnd) && (
            <button
              onClick={() => {
                setDateRangeStart("")
                setDateRangeEnd("")
              }}
              className="px-4 py-2.5 rounded-xl border border-[#dae5e7] bg-white text-sm hover:bg-gray-50 transition"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* TABLE */}
      <section className="flex-1 overflow-auto p-6">
        {filteredPurchases.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#dae5e7] p-12 text-center">
            <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">
              shopping_cart
            </span>
            <h3 className="text-xl font-bold text-gray-600 mb-2">
              No Purchases Found
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {supplierFilter !== "all" || dateRangeStart || dateRangeEnd
                ? "Try adjusting your filters"
                : "Create your first purchase to get started"}
            </p>
            {!supplierFilter && !dateRangeStart && !dateRangeEnd && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
              >
                Add Purchase
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#dae5e7] overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-[#f0f4f5]/60">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold uppercase w-40">Purchase Date</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase">Supplier Name</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase">Item Name</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-right w-32">Quantity</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-right w-32">Amount</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-right w-32">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#f0f4f5]">
                {filteredPurchases.map((purchase) => {
                  const supplier = supplierMap[purchase.supplierId]

                  return (
                    <tr key={purchase.$id} className="hover:bg-primary/5 transition">
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">
                          {formatDate(purchase.purchaseDate)}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-semibold">{supplier?.name || "Unknown Supplier"}</p>
                        {supplier?.supplierCode && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {supplier.supplierCode}
                          </p>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-medium">{purchase.itemName || "-"}</p>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <span className="text-sm text-gray-600">
                          {purchase.qty || 0}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <span className="font-bold text-red-600">
                          {formatCurrency(purchase.amount)}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleEdit(purchase)}
                          className="text-primary text-xs font-bold hover:underline"
                        >
                          Edit
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

      {/* MODALS */}
      <CreatePurchaseModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        company={company}
        suppliers={suppliers}
        onPurchaseSaved={handlePurchaseSaved}
      />

      {selectedPurchase && (
        <EditPurchaseModal
          open={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setSelectedPurchase(null)
          }}
          company={company}
          purchase={selectedPurchase}
          suppliers={suppliers}
          onPurchaseSaved={handlePurchaseSaved}
        />
      )}
    </main>
  )
}
