import { useEffect, useState } from "react"
import { getSuppliers, deleteSupplier, generateSupplierCode, createSupplier } from "../services/supplierService"
import AddSupplierModal from "../components/AddSupplierModal"

const SUPPLIER_TYPES = [
  { value: "designer", label: "Designer", icon: "palette" },
  { value: "printer", label: "Printer", icon: "print" },
  { value: "binding", label: "Binding Unit", icon: "book" },
  { value: "material", label: "Material Supplier", icon: "inventory_2" },
  { value: "misc", label: "Misc Expense", icon: "receipt" },
  { value: "salary", label: "Salary", icon: "account_circle" }
]

const SUPPLIER_TYPE_LABELS = {
  designer: "Designer",
  printer: "Printer",
  binding: "Binding",
  material: "Material",
  misc: "Misc",
  salary: "Salary"
}

export default function Suppliers({ company, onViewSupplier, onViewLedger }) {
  const [suppliers, setSuppliers] = useState([])
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [loading, setLoading] = useState(false)
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false)
  const [supplierCode, setSupplierCode] = useState(null)

  useEffect(() => {
    load()
  }, [company])

  async function load() {
    if (!company?.$id) return
    setLoading(true)
    try {
      const res = await getSuppliers(company.$id)
      setSuppliers(res.documents)
    } catch (error) {
      console.error("Error loading suppliers:", error)
      alert("Failed to load suppliers")
    } finally {
      setLoading(false)
    }
  }

  const filteredSuppliers = suppliers.filter(s => {
    const matchesSearch =
      s.supplierCode?.toLowerCase().includes(search.toLowerCase()) ||
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.phone?.toLowerCase().includes(search.toLowerCase())

    const matchesType = typeFilter === "all" || s.supplierType === typeFilter

    return matchesSearch && matchesType
  })

  const handleDelete = async (id) => {
    if (!confirm("Delete this supplier? This action cannot be undone.")) return
    try {
      await deleteSupplier(id)
      load()
    } catch (error) {
      console.error("Error deleting supplier:", error)
      alert("Failed to delete supplier. Make sure no transactions are linked.")
    }
  }

  const openAddSupplierModal = async () => {
    const code = await generateSupplierCode(company.$id)
    setSupplierCode(code)
    setShowAddSupplierModal(true)
  }

  const handleAddSupplier = async (data) => {
    await createSupplier({
      ...data,
      supplierCode,
      companyId: company.$id,
    })
    await load()
    setShowAddSupplierModal(false)
  }

  const formatBalance = (balance) => {
    const amount = balance || 0
    return `₹${Math.abs(amount).toFixed(2)}`
  }

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      {/* HEADER */}
      <header className="bg-white border-b border-[#dae5e7] p-6">
        <div className="flex justify-between items-end gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight">
              Suppliers Management
            </h2>
            <p className="text-sm text-[#5e878d] font-medium">
              Track vendors, job work, purchases, and payables.
            </p>
          </div>

          <button
            onClick={openAddSupplierModal}
            className="flex items-center gap-2 h-11 px-6 rounded-lg bg-primary text-white font-bold shadow"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Add New Supplier
          </button>
        </div>
      </header>

      {/* TOOLBAR */}
      <div className="bg-[#f0f4f5]/60 px-6 py-4 flex flex-col md:flex-row gap-4 justify-between">
        <div className="bg-white border border-[#dae5e7] rounded-xl relative w-full md:w-96">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#5e878d]">
            search
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code, name or phone..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white text-sm focus:ring-2 focus:ring-primary/50 outline-none"
          />
        </div>
      </div>
      <div className="px-8 pb-4 flex gap-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setTypeFilter("all")}
          className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${typeFilter === "all"
              ? "bg-primary text-white"
              : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
            }`}
        >
          All Types
        </button>
        {SUPPLIER_TYPES.map((type) => (
          <button
            key={type.value}
            onClick={() => setTypeFilter(type.value)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${typeFilter === type.value
                ? "bg-primary text-white"
                : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
              }`}
          >
            {type.label}
          </button>
        ))}
      </div>
      {/* TABLE */}
      <section className="flex-1 overflow-auto p-6">
        <div className="bg-white rounded-xl border border-[#dae5e7] overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-[#f0f4f5]/60">
              <tr>
                <th className="px-6 py-4 text-xs font-bold uppercase w-32">Code</th>
                <th className="px-6 py-4 text-xs font-bold uppercase">Name</th>
                <th className="px-6 py-4 text-xs font-bold uppercase w-32">Type</th>
                <th className="px-6 py-4 text-xs font-bold uppercase">Phone</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-right w-40">Outstanding</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-right w-32">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#f0f4f5]">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-6 text-center text-sm text-gray-500">
                    Loading suppliers...
                  </td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-6 text-center text-sm text-gray-500">
                    No suppliers found
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map(supplier => {
                  const supplierType = SUPPLIER_TYPES.find(t => t.value === supplier.supplierType)
                  const outstanding = supplier.openingBalance || 0 // Will be calculated from ledger later

                  return (
                    <tr key={supplier.$id} className="hover:bg-primary/5 transition">
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 text-xs font-bold rounded bg-primary/10 text-primary">
                          {supplier.supplierCode}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-bold">{supplier.name}</p>
                        {supplier.address && (
                          <p className="text-xs text-gray-500 mt-0.5">{supplier.address}</p>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {supplierType && (
                            <span className="material-symbols-outlined text-sm text-gray-500">
                              {supplierType.icon}
                            </span>
                          )}
                          <span className="text-sm text-gray-600">
                            {SUPPLIER_TYPE_LABELS[supplier.supplierType] || supplier.supplierType}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-600">
                        {supplier.phone || "-"}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <span className={`font-bold ${outstanding > 0 ? 'text-red-600' : outstanding < 0 ? 'text-green-600' : 'text-gray-500'
                          }`}>
                          {outstanding > 0 ? formatBalance(outstanding) : outstanding < 0 ? `(${formatBalance(Math.abs(outstanding))})` : '₹0.00'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {onViewLedger && (
                            <button
                              onClick={() => onViewLedger(supplier.$id)}
                              className="p-2 text-gray-500 hover:text-primary"
                              title="View Ledger"
                            >
                              <span className="material-symbols-outlined">account_balance_wallet</span>
                            </button>
                          )}
                          {onViewSupplier && (
                            <button
                              onClick={() => onViewSupplier(supplier.$id)}
                              className="p-2 text-gray-500 hover:text-primary"
                              title="View Details"
                            >
                              <span className="material-symbols-outlined">visibility</span>
                            </button>
                          )}
                          <button className="p-2 text-gray-500 hover:text-primary">
                            <span className="material-symbols-outlined">edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(supplier.$id)}
                            className="p-2 text-gray-500 hover:text-red-500"
                          >
                            <span className="material-symbols-outlined">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <AddSupplierModal
        isOpen={showAddSupplierModal}
        onClose={() => setShowAddSupplierModal(false)}
        supplierCode={supplierCode}
        onAddSupplier={handleAddSupplier}
        supplierTypes={SUPPLIER_TYPES}
      />
    </main>
  )
}
