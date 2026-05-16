import { useState } from "react"
import { createPayment, getPaymentsByInvoice } from "../services/paymentService"
import { updateInvoice } from "../services/invoiceService"
import { calculateInvoiceStatus, mapStatusForDatabase } from "../utils/invoiceStatus"
import { recalculateInvoiceTotals } from "../utils/recalculateInvoiceTotals"

const PAYMENT_MODES = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" }
]

export default function AddPaymentModal({ open, onClose, invoice, company, payments = [], onPaymentAdded }) {
  const [formData, setFormData] = useState({
    amount: "",
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMode: "cash",
    reference: ""
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  if (!open) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    // Validation
    const amount = parseFloat(formData.amount)
    if (!amount || amount <= 0) {
      setError("Please enter a valid amount")
      return
    }

    const grandTotal = invoice.grandTotal || 0
    const currentPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0)
    const newPaid = currentPaid + amount

    if (newPaid > grandTotal) {
      setError(`Payment amount exceeds invoice total. Maximum: ₹${(grandTotal - currentPaid).toFixed(2)}`)
      return
    }

    setLoading(true)
    try {
      // Create payment
      await createPayment({
        companyId: company.$id,
        invoiceId: invoice.$id,
        partyId: invoice.partyId,
        amount: amount,
        paymentDate: formData.paymentDate,
        paymentMode: formData.paymentMode,
        reference: formData.reference || ""
      })

      // Reload payments to get the newly created one with status
      const paymentsRes = await getPaymentsByInvoice(company.$id, invoice.$id)
      const updatedPayments = paymentsRes.documents || []

      // Recalculate invoice totals using proper accounting logic
      const totals = recalculateInvoiceTotals(invoice, updatedPayments)
      const displayStatus = calculateInvoiceStatus(invoice, updatedPayments)
      const dbStatus = mapStatusForDatabase(displayStatus, invoice, updatedPayments)

      // Update invoice
      await updateInvoice(invoice.$id, {
        paidAmount: totals.totalPaid,
        balanceAmount: totals.balanceAmount,
        status: dbStatus
      })

      // Reset form
      setFormData({
        amount: "",
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMode: "cash",
        reference: ""
      })

      // Notify parent
      if (onPaymentAdded) {
        onPaymentAdded()
      }

      onClose()
    } catch (err) {
      console.error("Error creating payment:", err)
      setError("Failed to record payment. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const grandTotal = invoice.grandTotal || 0
  const currentPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0)
  const maxAmount = grandTotal - currentPaid

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-6">
      <div className="bg-white dark:bg-[#1a1c20] w-full max-w-md rounded-xl shadow-2xl">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#121617] dark:text-white">
            Record Payment
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={maxAmount}
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[#121617] dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                placeholder="0.00"
                required
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Maximum: ₹{maxAmount.toFixed(2)} (Due: ₹{maxAmount.toFixed(2)})
            </p>
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

          {/* Payment Mode */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Payment Mode <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.paymentMode}
              onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[#121617] dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              required
            >
              {PAYMENT_MODES.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                </option>
              ))}
            </select>
          </div>

          {/* Reference / Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Reference / Notes <span className="text-gray-400 text-xs">(Optional)</span>
            </label>
            <textarea
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[#121617] dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
              rows="3"
              placeholder="Transaction ID, cheque number, or any notes..."
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
                  <span>Recording...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">add_circle</span>
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
