import { useState, useEffect } from "react"
import { reversePayment } from "../services/paymentService"
import { recalculateInvoiceTotals } from "../utils/recalculateInvoiceTotals"
import { updateInvoice } from "../services/invoiceService"
import { calculateInvoiceStatus, mapStatusForDatabase } from "../utils/invoiceStatus"

export default function ReversePaymentModal({ open, onClose, payment, invoice, payments = [], onPaymentReversed }) {
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      setReason("")
      setError("")
    }
  }, [open])

  if (!open || !payment) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (!reason.trim()) {
      setError("Reversal reason is required")
      return
    }

    setLoading(true)
    try {
      // Reverse the payment
      const result = await reversePayment(payment.$id, reason.trim(), payment)

      // Recalculate invoice totals with updated payments
      // Include the reversal payment in the list
      const updatedPayments = [...payments, result.reversal]
      const totals = recalculateInvoiceTotals(invoice, updatedPayments)
      const displayStatus = calculateInvoiceStatus(invoice, updatedPayments)
      const dbStatus = mapStatusForDatabase(displayStatus, invoice, updatedPayments)

      // Update invoice
      await updateInvoice(invoice.$id, {
        paidAmount: totals.totalPaid,
        balanceAmount: totals.balanceAmount,
        status: dbStatus
      })

      if (onPaymentReversed) {
        onPaymentReversed()
      }

      onClose()
    } catch (err) {
      console.error("Error reversing payment:", err)
      setError(err.message || "Failed to reverse payment. Please try again.")
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
            Reverse Payment
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            disabled={loading}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Warning */}
        <div className="px-6 pt-5">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-red-600 dark:text-red-400">warning</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-red-700 dark:text-red-300 mb-2">
                  This action cannot be undone
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed">
                  Reversing this payment will:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Mark the original payment as reversed</li>
                    <li>Create a negative payment entry</li>
                    <li>Update invoice totals automatically</li>
                    <li>Disable receipt generation for this payment</li>
                  </ul>
                </p>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg mb-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Payment to Reverse</p>
            <p className="text-lg font-bold text-[#121617] dark:text-white">
              ₹{payment.amount?.toFixed(2) || '0.00'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Receipt: {payment.receiptNumber || 'N/A'}
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

          {/* Reason */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Reason for Reversal <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[#121617] dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
              rows="4"
              placeholder="Enter the reason for reversing this payment..."
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              This reason will be recorded in the audit trail.
            </p>
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
              className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow-md shadow-red-600/20 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || !reason.trim()}
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                  <span>Reversing...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">undo</span>
                  <span>Reverse Payment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
