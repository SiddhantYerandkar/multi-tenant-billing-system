import { useState, useEffect } from "react"
import { adjustPayment } from "../services/paymentService"
import { recalculateInvoiceTotals } from "../utils/recalculateInvoiceTotals"
import { updateInvoice } from "../services/invoiceService"
import { calculateInvoiceStatus, mapStatusForDatabase } from "../utils/invoiceStatus"

export default function AdjustPaymentModal({ open, onClose, payment, invoice, payments = [], onPaymentAdjusted }) {
  const [formData, setFormData] = useState({
    newAmount: "",
    reason: ""
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open && payment) {
      setFormData({
        newAmount: (payment.amount || 0).toFixed(2),
        reason: ""
      })
      setError("")
    }
  }, [open, payment])

  if (!open || !payment) return null

  const originalAmount = payment.amount || 0
  const newAmount = parseFloat(formData.newAmount) || 0
  const adjustmentAmount = newAmount - originalAmount
  const grandTotal = invoice.grandTotal || 0
  const currentPaid = payments
    .filter(p => p.status === 'completed' || p.status === 'adjusted')
    .reduce((sum, p) => sum + (p.amount || 0), 0)
  const maxAllowed = grandTotal - currentPaid + originalAmount

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (!formData.reason.trim()) {
      setError("Adjustment reason is required")
      return
    }

    if (newAmount === originalAmount) {
      setError("New amount must be different from the original amount")
      return
    }

    if (newAmount < 0) {
      setError("Amount cannot be negative")
      return
    }

    if (newAmount > maxAllowed) {
      setError(`Amount exceeds invoice total. Maximum allowed: ₹${maxAllowed.toFixed(2)}`)
      return
    }

    setLoading(true)
    try {
      // Create adjustment payment
      const adjustmentPayment = await adjustPayment(
        payment,
        newAmount,
        formData.reason.trim()
      )

      // Recalculate invoice totals with adjustment
      const updatedPayments = [...payments, adjustmentPayment]
      const totals = recalculateInvoiceTotals(invoice, updatedPayments)
      const displayStatus = calculateInvoiceStatus(invoice, updatedPayments)
      const dbStatus = mapStatusForDatabase(displayStatus, invoice, updatedPayments)

      // Update invoice
      await updateInvoice(invoice.$id, {
        paidAmount: totals.totalPaid,
        balanceAmount: totals.balanceAmount,
        status: dbStatus
      })

      if (onPaymentAdjusted) {
        onPaymentAdjusted()
      }

      onClose()
    } catch (err) {
      console.error("Error adjusting payment:", err)
      setError(err.message || "Failed to adjust payment. Please try again.")
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
            Adjust Payment
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            disabled={loading}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Info */}
        <div className="px-6 pt-5">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-4">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-sm">info</span>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                This will create an adjustment entry without modifying the original payment. 
                The original payment remains unchanged for audit purposes.
              </p>
            </div>
          </div>

          {/* Current Payment */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg mb-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Current Amount</p>
            <p className="text-lg font-bold text-[#121617] dark:text-white">
              ₹{originalAmount.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* New Amount */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              New Total Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
              <input
                type="number"
                step="0.01"
                min="0"
                max={maxAllowed}
                value={formData.newAmount}
                onChange={(e) => setFormData({ ...formData, newAmount: e.target.value })}
                className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[#121617] dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                placeholder="0.00"
                required
              />
            </div>
            {adjustmentAmount !== 0 && (
              <p className="text-xs mt-1">
                <span className={`font-medium ${adjustmentAmount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  Adjustment: {adjustmentAmount > 0 ? '+' : ''}₹{adjustmentAmount.toFixed(2)}
                </span>
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Maximum: ₹{maxAllowed.toFixed(2)}
            </p>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Reason for Adjustment <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[#121617] dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
              rows="3"
              placeholder="Enter the reason for this adjustment..."
              required
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
              disabled={loading || !formData.reason.trim() || newAmount === originalAmount}
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                  <span>Adjusting...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">tune</span>
                  <span>Create Adjustment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
