import { useState, useEffect } from "react"
import { createPurchase } from "../services/purchaseService"

export default function AddPurchaseModal({ open, onClose, supplier, company, onPurchaseAdded }) {
  const [formData, setFormData] = useState({
    itemName: "",
    quantity: "",
    unit: "",
    rate: "",
    totalAmount: "",
    purchaseDate: new Date().toISOString().split('T')[0]
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => (document.body.style.overflow = "")
  }, [open])

  useEffect(() => {
    if (open) {
      setFormData({
        itemName: "",
        quantity: "",
        unit: "",
        rate: "",
        totalAmount: "",
        purchaseDate: new Date().toISOString().split('T')[0]
      })
      setError("")
    }
  }, [open])

  // Auto-calculate total when quantity or rate changes
  useEffect(() => {
    const qty = parseFloat(formData.quantity) || 0
    const rt = parseFloat(formData.rate) || 0
    const total = qty * rt
    setFormData(prev => ({ ...prev, totalAmount: total > 0 ? total.toFixed(2) : "" }))
  }, [formData.quantity, formData.rate])

  if (!open) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (!formData.itemName.trim()) {
      setError("Item name is required")
      return
    }

    const totalAmount = parseFloat(formData.totalAmount)
    if (!totalAmount || totalAmount <= 0) {
      setError("Total amount must be greater than 0")
      return
    }

    setLoading(true)
    try {
      await createPurchase({
        companyId: company.$id,
        supplierId: supplier.$id,
        itemName: formData.itemName.trim(),
        quantity: formData.quantity ? parseFloat(formData.quantity) : 0,
        unit: formData.unit.trim(),
        rate: formData.rate ? parseFloat(formData.rate) : 0,
        totalAmount: totalAmount,
        purchaseDate: formData.purchaseDate
      })

      if (onPurchaseAdded) {
        onPurchaseAdded()
      }
      onClose()
    } catch (err) {
      console.error("Error creating purchase:", err)
      setError(err.message || "Failed to create purchase")
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
          <h2 className="text-xl font-bold">Add Purchase</h2>
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

          {/* Item Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Item Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.itemName}
              onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              placeholder="e.g., Paper Roll, Wrapper, Tape"
              required
            />
          </div>

          {/* Quantity & Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Quantity
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Unit
              </label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                placeholder="kg, pcs, roll"
              />
            </div>
          </div>

          {/* Rate */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Rate per Unit
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
              <input
                type="number"
                step="0.01"
                value={formData.rate}
                onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Total Amount */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Total Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
              <input
                type="number"
                step="0.01"
                value={formData.totalAmount}
                onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                placeholder="0.00"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Auto-calculated from Quantity × Rate (can be edited)
            </p>
          </div>

          {/* Purchase Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Purchase Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.purchaseDate}
              onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              required
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
                  <span>Create Purchase</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
