import { useEffect, useState } from "react"
import { getSupplier } from "../services/supplierService"
import { getSupplierLedgerData } from "../services/supplierPaymentService"
import { buildSupplierLedger, calculateSupplierLedgerSummary } from "../utils/buildSupplierLedger"
import LedgerSummary from "../components/LedgerSummary"
import LedgerTable from "../components/LedgerTable"
import AddJobModal from "../components/AddJobModal"
import AddPurchaseModal from "../components/AddPurchaseModal"
import AddSupplierPaymentModal from "../components/AddSupplierPaymentModal"

const SUPPLIER_TYPE_LABELS = {
  designer: "Designer",
  printer: "Printer",
  binding: "Binding",
  material: "Material",
  misc: "Misc",
  salary: "Salary"
}

export default function SupplierLedger({ company, supplierId, onBack }) {
  const [supplier, setSupplier] = useState(null)
  const [ledgerEntries, setLedgerEntries] = useState([])
  const [summary, setSummary] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showAddJobModal, setShowAddJobModal] = useState(false)
  const [showAddPurchaseModal, setShowAddPurchaseModal] = useState(false)
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false)

  useEffect(() => {
    if (supplierId && company?.$id) {
      loadLedgerData()
    }
  }, [supplierId, company])

  async function loadLedgerData() {
    if (!supplierId || !company?.$id) return

    setLoading(true)
    setError("")
    try {
      // Get supplier details
      const supplierData = await getSupplier(company.$id, supplierId)
      setSupplier(supplierData)

      // Get jobs, purchases, and payments
      const { jobs, purchases, payments } = await getSupplierLedgerData(company.$id, supplierId)

      // Build ledger entries
      const entries = buildSupplierLedger(supplierData, jobs, purchases, payments)
      setLedgerEntries(entries)

      // Calculate summary
      const ledgerSummary = calculateSupplierLedgerSummary(entries)
      setSummary({
        totalInvoiced: ledgerSummary.totalExpense,
        totalPaid: ledgerSummary.totalPaid,
        outstandingBalance: ledgerSummary.outstandingPayable
      })
    } catch (err) {
      console.error("Error loading ledger data:", err)
      setError("Failed to load ledger data. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleDataAdded = () => {
    loadLedgerData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary mb-2">
            sync
          </span>
          <p className="text-gray-500">Loading ledger...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <span className="material-symbols-outlined text-4xl text-red-500 mb-2">
            error
          </span>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!supplier) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Supplier not found</p>
      </div>
    )
  }

  const canAddJob = ['designer', 'printer', 'binding'].includes(supplier.supplierType)
  const canAddPurchase = supplier.supplierType === 'material'

  return (
    <main className="flex-1 overflow-y-auto flex flex-col bg-background-light">
      {/* Header */}
      <header className="p-8 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
              )}
              <h2 className="text-3xl font-black tracking-tight">Supplier Ledger</h2>
            </div>
            <p className="text-[#638288] text-sm mt-1">
              {supplier.name || "Unknown Supplier"}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                {supplier.supplierCode}
              </span>
              <span className="text-xs text-gray-500">
                {SUPPLIER_TYPE_LABELS[supplier.supplierType] || supplier.supplierType}
              </span>
            </div>
            {supplier.address && (
              <p className="text-[#638288] text-xs mt-1">
                {typeof supplier.address === 'string' ? supplier.address : supplier.address.join(', ')}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {canAddJob && (
              <button
                onClick={() => setShowAddJobModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-bold transition"
              >
                <span className="material-symbols-outlined text-sm">work</span>
                <span>Add Job</span>
              </button>
            )}
            {canAddPurchase && (
              <button
                onClick={() => setShowAddPurchaseModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-bold transition"
              >
                <span className="material-symbols-outlined text-sm">shopping_cart</span>
                <span>Add Purchase</span>
              </button>
            )}
            <button
              onClick={() => setShowAddPaymentModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold transition"
            >
              <span className="material-symbols-outlined text-sm">payments</span>
              <span>Record Payment</span>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="px-8 pb-8 flex-1">
        {/* Summary */}
        <LedgerSummary summary={summary} isSupplier={true} />

        {/* Ledger Table */}
        <LedgerTable entries={ledgerEntries} />
      </div>

      {/* Modals */}
      {canAddJob && (
        <AddJobModal
          open={showAddJobModal}
          onClose={() => setShowAddJobModal(false)}
          supplier={supplier}
          company={company}
          onJobAdded={handleDataAdded}
        />
      )}

      {canAddPurchase && (
        <AddPurchaseModal
          open={showAddPurchaseModal}
          onClose={() => setShowAddPurchaseModal(false)}
          supplier={supplier}
          company={company}
          onPurchaseAdded={handleDataAdded}
        />
      )}

      <AddSupplierPaymentModal
        open={showAddPaymentModal}
        onClose={() => setShowAddPaymentModal(false)}
        supplier={supplier}
        company={company}
        onPaymentAdded={handleDataAdded}
      />
    </main>
  )
}
