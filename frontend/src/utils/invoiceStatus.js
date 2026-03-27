/**
 * Calculate invoice status based on payments and invoice data
 * Status logic:
 * - isDraft === true → Draft
 * - Paid = 0 → Pending
 * - Paid > 0 AND Due > 0 → Partial
 * - Due = 0 → Paid
 * - Due > 0 AND invoiceDate < today → Overdue
 */
export function calculateInvoiceStatus(invoice, payments = []) {
  // If draft, return Draft
  if (invoice.isDraft === true) {
    return 'draft'
  }

  // Calculate total paid amount from payments
  const totalPaid = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0)
  
  // Get grand total from invoice
  const grandTotal = invoice.grandTotal || 0
  
  // Calculate due amount
  const dueAmount = grandTotal - totalPaid

  // Status logic
  if (totalPaid === 0) {
    // Check if overdue
    if (invoice.invoiceDate) {
      const invoiceDate = new Date(invoice.invoiceDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      invoiceDate.setHours(0, 0, 0, 0)
      
      if (invoiceDate < today && dueAmount > 0) {
        return 'overdue'
      }
    }
    return 'pending'
  }

  if (dueAmount > 0) {
    // Check if overdue
    if (invoice.invoiceDate) {
      const invoiceDate = new Date(invoice.invoiceDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      invoiceDate.setHours(0, 0, 0, 0)
      
      if (invoiceDate < today) {
        return 'overdue'
      }
    }
    return 'partial'
  }

  // Due amount is 0 or less
  return 'paid'
}

/**
 * Calculate payment totals from payments array
 */
export function calculatePaymentTotals(payments = []) {
  const totalPaid = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0)
  return {
    totalPaid
  }
}

/**
 * Map display status to database-allowed status
 * Database allows: paid, pending, draft, partial, cancelled
 * Maps "overdue" to "pending" or "partial" based on payment status
 */
export function mapStatusForDatabase(displayStatus, invoice, payments = []) {
  // If not overdue, return as-is (if it's a valid status)
  if (displayStatus !== 'overdue') {
    // Validate it's one of the allowed statuses
    const allowedStatuses = ['paid', 'pending', 'draft', 'partial', 'cancelled']
    return allowedStatuses.includes(displayStatus) ? displayStatus : 'pending'
  }

  // Map "overdue" to appropriate database status
  const totalPaid = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0)
  return totalPaid === 0 ? 'pending' : 'partial'
}
