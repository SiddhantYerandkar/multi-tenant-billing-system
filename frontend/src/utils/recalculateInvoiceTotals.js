/**
 * Recalculate invoice totals from payments
 * 
 * Accounting Rules:
 * - Only count payments with status = "completed" OR "adjusted"
 * - Reversed payments are excluded (they have negative amounts)
 * - totalPaid = sum(payments.amount where status in [completed, adjusted])
 * - balanceAmount = grandTotal - totalPaid
 */

export function recalculateInvoiceTotals(invoice, payments = []) {
  const grandTotal = invoice.grandTotal || 0

  // Filter payments that contribute to total paid
  // Only completed and adjusted payments count
  const validPayments = payments.filter(
    payment => payment.status === 'completed' || payment.status === 'adjusted'
  )

  // Calculate total paid from valid payments
  const totalPaid = validPayments.reduce(
    (sum, payment) => sum + (payment.amount || 0),
    0
  )

  // Calculate balance (due amount)
  const balanceAmount = grandTotal - totalPaid

  return {
    totalPaid,
    balanceAmount,
    grandTotal
  }
}

/**
 * Check if payment can be edited
 * Only non-reversed payments can be edited
 */
export function canEditPayment(payment) {
  return payment.status !== 'reversed'
}

/**
 * Check if payment can be reversed
 * Only completed or adjusted payments can be reversed
 */
export function canReversePayment(payment) {
  return payment.status === 'completed' || payment.status === 'adjusted'
}

/**
 * Check if payment can generate receipt
 * Reversed payments cannot generate receipts
 */
export function canGenerateReceipt(payment) {
  return payment.status !== 'reversed'
}
