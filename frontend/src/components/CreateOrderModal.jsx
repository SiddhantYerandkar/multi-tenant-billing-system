import { useState, useEffect } from "react"
import { createOrder } from "../services/orderService"
import { getParties } from "../services/partyService"

const JOB_TYPES = [
  { value: "designing", label: "Designing" },
  { value: "printing", label: "Printing" },
  { value: "designing_printing", label: "Designing & Printing" },
  { value: "binding", label: "Binding" },
  { value: "other", label: "Other" }
]

export default function CreateOrderModal({ open, onClose, company, onOrderCreated }) {
  const [formData, setFormData] = useState({
    orderNo: "",
    partyId: "",
    title: "",
    jobType: "designing",
    orderDate: new Date().toISOString().split('T')[0],
    notes: ""
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [parties, setParties] = useState([])

  useEffect(() => {
    if (open && company?.$id) {
      loadData()
    }
  }, [open, company])

  async function loadData() {
    try {
      const partiesRes = await getParties(company.$id)
      setParties(partiesRes.documents || [])
    } catch (err) {
      console.error("Error loading data:", err)
    }
  }

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => (document.body.style.overflow = "")
  }, [open])

  useEffect(() => {
    if (open) {
      setFormData({
        orderNo: "",
        partyId: "",
        title: "",
        jobType: "designing",
        orderDate: new Date().toISOString().split('T')[0],
        notes: ""
      })
      setError("")
    }
  }, [open])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (!formData.orderNo.trim()) {
      setError("Order number is required")
      return
    }

    if (!formData.partyId) {
      setError("Please select a customer")
      return
    }

    if (!formData.title.trim()) {
      setError("Title is required")
      return
    }

    setLoading(true)
    try {
      await createOrder({
        companyId: company.$id,
        partyId: formData.partyId,
        orderNo: formData.orderNo.trim(),
        title: formData.title.trim(),
        jobType: formData.jobType,
        orderDate: formData.orderDate,
        notes: formData.notes.trim(),
        status: "pending",
        jobNo: "",
      })

      if (onOrderCreated) {
        onOrderCreated()
      }
      onClose()
    } catch (err) {
      console.error("Error creating order:", err)
      setError(err.message || "Failed to create order")
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[540px] bg-white rounded-xl shadow-2xl border border-[#dae5e7] overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#dae5e7] flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold">Create Order</h2>
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

          {/* Order Number */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Order No <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.orderNo}
              onChange={(e) => setFormData({ ...formData, orderNo: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              placeholder="ORD-0001"
              required
            />
          </div>

          {/* Customer Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Customer <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.partyId}
              onChange={(e) => setFormData({ ...formData, partyId: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              required
            >
              <option value="">-- Select Customer --</option>
              {parties.map((party) => (
                <option key={party.$id} value={party.$id}>
                  {party.name} {party.partyCode ? `(${party.partyCode})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              placeholder="e.g., Wedding Card Design, Business Cards"
              required
            />
          </div>

          {/* Job Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Job Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.jobType}
              onChange={(e) => setFormData({ ...formData, jobType: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            >
              {JOB_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Order Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Order Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.orderDate}
              onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
              rows="3"
              placeholder="Additional notes..."
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 sticky bottom-0 bg-white pb-2">
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
              className="px-6 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-bold shadow-md shadow-primary/20 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">add_circle</span>
                  <span>Create Order</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}