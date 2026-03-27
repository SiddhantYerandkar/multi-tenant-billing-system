import { useState, useEffect } from "react"
import { updatePayment } from "../services/paymentService"

export default function EditPaymentModal({ open, onClose, payment, onPaymentUpdated }) {
  const [formData, setFormData] = useState({
    paymentDate: "",
    reference: ""
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open && payment) {
      setFormData({
        paymentDate: payment.paymentDate || new Date().toISOString().split('T')[0],
        reference: payment.reference || ""
      })
      setError("")
    }
  }, [open, payment])

  if (!open || !payment) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    setLoading(true)
    try {
      await updatePayment(payment.$id, {
        paymentDate: formData.paymentDate,
        reference: formData.reference
      })

      if (onPaymentUpdated) {
        onPaymentUpdated()
      }

      onClose()
    } catch (err) {
      console.error("Error updating payment:", err)
      setError("Failed to update payment. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-6">
      <div className="bg-white dark:bg-[#1a1c20] w-full max-w-md rounded-xl shadow-2xl">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#121617] dark:text-white">
            Edit Payment
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Warning */}
        <div className="px-6 pt-5">
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg mb-4">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 text-sm">info</span>
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                <strong>Financial fields cannot be edited.</strong> Only payment date and notes can be modified. 
                To change the amount, use "Reverse Payment" or "Adjust Payment".
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Amount (Read-only) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Amount (Cannot be changed)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
              <input
                type="text"
                value={payment.amount?.toFixed(2) || '0.00'}
                disabled
                className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-500 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Payment Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Payment Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.paymentDate}
              onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[#121617] dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              required
            />
          </div>

          {/* Reference / Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Notes / Reference
            </label>
            <textarea
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[#121617] dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
              rows="3"
              placeholder="Add notes or reference information..."
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-[#121617] dark:hover:text-white transition"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-bold shadow-md shadow-primary/20 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">save</span>
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
