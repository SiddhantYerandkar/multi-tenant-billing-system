import { useState, useEffect } from "react"
import { createSupplierPayment } from "../services/supplierPaymentService"
import { getJobsForSupplier } from "../services/supplierJobService"
import { getPurchasesForSupplier } from "../services/purchaseService"

const PAYMENT_MODES = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank", label: "Bank Transfer" }
]

const REFERENCE_TYPES = [
  { value: "job", label: "Job Work" },
  { value: "purchase", label: "Purchase" },
  { value: "misc", label: "Misc Expense" }
]

export default function AddSupplierPaymentModal({ open, onClose, supplier, company, onPaymentAdded }) {
  const [formData, setFormData] = useState({
    referenceType: "misc",
    referenceId: "",
    amount: "",
    paymentMode: "cash",
    paymentDate: new Date().toISOString().split('T')[0],
    notes: ""
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [jobs, setJobs] = useState([])
  const [purchases, setPurchases] = useState([])

  useEffect(() => {
    if (open && supplier?.$id && company?.$id) {
      loadReferences()
    }
  }, [open, supplier, company, formData.referenceType])

  async function loadReferences() {
    if (!supplier?.$id || !company?.$id) return

    try {
      if (formData.referenceType === "job") {
        const jobList = await getJobsForSupplier(company.$id, supplier.$id)
        setJobs(jobList)
        setPurchases([])
      } else if (formData.referenceType === "purchase") {
        const purchaseList = await getPurchasesForSupplier(company.$id, supplier.$id)
        setPurchases(purchaseList)
        setJobs([])
      } else {
        setJobs([])
        setPurchases([])
      }
    } catch (err) {
      console.error("Error loading references:", err)
    }
  }

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => (document.body.style.overflow = "")
  }, [open])

  useEffect(() => {
    if (open) {
      setFormData({
        referenceType: "misc",
        referenceId: "",
        amount: "",
        paymentMode: "cash",
        paymentDate: new Date().toISOString().split('T')[0],
        notes: ""
      })
      setError("")
    }
  }, [open])

  if (!open) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    const amount = parseFloat(formData.amount)
    if (!amount || amount <= 0) {
      setError("Amount must be greater than 0")
      return
    }

    // Validate reference selection
    if (formData.referenceType !== "misc" && !formData.referenceId) {
      setError(`Please select a ${formData.referenceType === "job" ? "job" : "purchase"}`)
      return
    }

    setLoading(true)
    try {
      await createSupplierPayment({
        companyId: company.$id,
        supplierId: supplier.$id,
        referenceType: formData.referenceType,
        referenceId: formData.referenceType === "misc" ? "" : formData.referenceId,
        amount: amount,
        paymentMode: formData.paymentMode,
        paymentDate: formData.paymentDate,
        reversed: false,
        notes: formData.notes.trim()
      })

      if (onPaymentAdded) {
        onPaymentAdded()
      }
      onClose()
    } catch (err) {
      console.error("Error creating payment:", err)
      setError(err.message || "Failed to record payment")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[560px] bg-white rounded-xl shadow-2xl border border-[#dae5e7] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#dae5e7] flex items-center justify-between">
          <h2 className="text-xl font-bold">Record Payment</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-gray-500">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Reference Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Payment For <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.referenceType}
              onChange={(e) => {
                setFormData({ ...formData, referenceType: e.target.value, referenceId: "" })
              }}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            >
              {REFERENCE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Reference Selection (Job or Purchase) */}
          {(formData.referenceType === "job" || formData.referenceType === "purchase") && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select {formData.referenceType === "job" ? "Job" : "Purchase"} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.referenceId}
                onChange={(e) => setFormData({ ...formData, referenceId: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                required
              >
                <option value="">-- Select --</option>
                {formData.referenceType === "job" && jobs.map((job) => (
                  <option key={job.$id} value={job.$id}>
                    {job.jobNo} - ₹{job.invoiceAmount?.toFixed(2) || "0.00"}
                  </option>
                ))}
                {formData.referenceType === "purchase" && purchases.map((purchase) => (
                  <option key={purchase.$id} value={purchase.$id}>
                    {purchase.itemName} - ₹{purchase.totalAmount?.toFixed(2) || "0.00"}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {/* Payment Mode */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Payment Mode <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.paymentMode}
              onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            >
              {PAYMENT_MODES.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Payment Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.paymentDate}
              onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
              rows="3"
              placeholder="Payment notes or reference..."
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-bold shadow-md shadow-green-600/20 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                  <span>Recording...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">payments</span>
                  <span>Record Payment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
