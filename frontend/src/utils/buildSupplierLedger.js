/**
 * Build Supplier Ledger from jobs, purchases, and payments
 * 
 * Accounting Rules (Supplier = Payable):
 * - Job/Purchase: Debit = expense amount (we owe them)
 * - Payment: Credit = payment amount (we paid them)
 * - Reversed Payment: Debit = |amount| (reversal increases payable)
 * 
 * Running Balance: Previous Balance + Debit - Credit
 * Positive balance = we owe them (payable)
 */

/**
 * Transform jobs into ledger entries
 */
function jobsToLedgerEntries(jobs = []) {
  return jobs
    .filter(job => job.status !== 'cancelled') // Exclude cancelled jobs
    .map(job => ({
      id: `job-${job.$id}`,
      date: job.jobDate || job.$createdAt,
      type: 'Job',
      referenceType: 'Job',
      referenceNumber: job.jobNo || `JOB-${job.$id.slice(0, 8)}`,
      debit: job.invoiceAmount || job.sellingAmount || 0,
      credit: 0,
      status: job.status || 'pending',
      jobId: job.$id,
      purchaseId: null,
      paymentId: null,
      metadata: {
        job: job
      }
    }))
}

/**
 * Transform purchases into ledger entries
 */
function purchasesToLedgerEntries(purchases = []) {
  return purchases.map(purchase => ({
    id: `purchase-${purchase.$id}`,
    date: purchase.purchaseDate || purchase.$createdAt,
    type: 'Purchase',
    referenceType: 'Purchase',
    referenceNumber: `Material Purchase - ${purchase.itemName || 'N/A'}`,
    debit: purchase.amount || 0,
    credit: 0,
    status: 'completed',
    jobId: null,
    purchaseId: purchase.$id,
    paymentId: null,
    metadata: {
      purchase: purchase
    }
  }))
}

/**
 * Transform payments into ledger entries
 */
function supplierPaymentsToLedgerEntries(payments = []) {
  const entries = []

  payments.forEach(payment => {
    const amount = payment.amount || 0
    const isReversed = payment.reversed === true

    if (isReversed) {
      // Reversed payment: Debit = |amount|, Credit = 0
      entries.push({
        id: `payment-${payment.$id}`,
        date: payment.paymentDate || payment.$createdAt,
        type: 'Payment Reversal',
        referenceType: 'Payment',
        referenceNumber: payment.reversedFrom ? `REV-${payment.$id.slice(0, 8)}` : `REV-${payment.$id.slice(0, 8)}`,
        debit: Math.abs(amount), // Negative amount becomes positive debit
        credit: 0,
        status: 'reversed',
        jobId: payment.referenceType === 'job' ? payment.referenceId : null,
        purchaseId: payment.referenceType === 'purchase' ? payment.referenceId : null,
        paymentId: payment.$id,
        reversedFrom: payment.reversedFrom,
        metadata: {
          payment: payment
        }
      })
    } else {
      // Normal payment: Debit = 0, Credit = amount
      entries.push({
        id: `payment-${payment.$id}`,
        date: payment.paymentDate || payment.$createdAt,
        type: 'Payment',
        referenceType: 'Payment',
        referenceNumber: payment.referenceType === 'job' ? `PAY-JOB` : 
                         payment.referenceType === 'purchase' ? `PAY-PUR` : 
                         `PAY-${payment.$id.slice(0, 8)}`,
        debit: 0,
        credit: amount,
        status: 'completed',
        jobId: payment.referenceType === 'job' ? payment.referenceId : null,
        purchaseId: payment.referenceType === 'purchase' ? payment.referenceId : null,
        paymentId: payment.$id,
        metadata: {
          payment: payment
        }
      })
    }
  })

  return entries
}

/**
 * Build complete supplier ledger with running balance
 * 
 * @param {object} supplier - Supplier object (may have openingBalance)
 * @param {array} jobs - Array of job documents
 * @param {array} purchases - Array of purchase documents
 * @param {array} payments - Array of payment documents
 * @returns {array} Sorted ledger entries with running balance
 */
export function buildSupplierLedger(supplier = {}, jobs = [], purchases = [], payments = []) {
  const entries = []

  // Add opening balance if exists
  const openingBalance = supplier.openingBalance || 0
  if (openingBalance !== 0) {
    entries.push({
      id: 'opening-balance',
      date: new Date(0).toISOString(), // Earliest date for sorting
      type: 'Opening Balance',
      referenceType: 'Opening Balance',
      referenceNumber: 'OB',
      debit: openingBalance > 0 ? openingBalance : 0,
      credit: openingBalance < 0 ? Math.abs(openingBalance) : 0,
      status: 'opening',
      jobId: null,
      purchaseId: null,
      paymentId: null,
      balance: openingBalance,
      metadata: {}
    })
  }

  // Add job entries
  entries.push(...jobsToLedgerEntries(jobs))

  // Add purchase entries
  entries.push(...purchasesToLedgerEntries(purchases))

  // Add payment entries
  entries.push(...supplierPaymentsToLedgerEntries(payments))

  // Sort by date (ASC), then by type for same date
  entries.sort((a, b) => {
    const dateA = new Date(a.date).getTime()
    const dateB = new Date(b.date).getTime()
    if (dateA !== dateB) {
      return dateA - dateB
    }
    // For same date: opening balance first, then jobs/purchases, then payments
    const orderA = a.type === 'Opening Balance' ? 0 : 
                   (a.type === 'Job' || a.type === 'Purchase') ? 1 : 2
    const orderB = b.type === 'Opening Balance' ? 0 : 
                   (b.type === 'Job' || b.type === 'Purchase') ? 1 : 2
    return orderA - orderB
  })

  // Calculate running balance
  let runningBalance = openingBalance
  entries.forEach(entry => {
    if (entry.id !== 'opening-balance') {
      runningBalance = runningBalance + entry.debit - entry.credit
    }
    entry.balance = runningBalance
  })

  return entries
}

/**
 * Calculate supplier ledger summary totals
 */
export function calculateSupplierLedgerSummary(ledgerEntries = []) {
  const totals = {
    totalExpense: 0,
    totalPaid: 0,
    outstandingPayable: 0
  }

  ledgerEntries.forEach(entry => {
    if (entry.type === 'Job' || entry.type === 'Purchase') {
      totals.totalExpense += entry.debit
    } else if (entry.type === 'Payment' && entry.status === 'completed') {
      totals.totalPaid += entry.credit
    } else if (entry.type === 'Payment Reversal') {
      totals.totalPaid -= entry.debit
    }
  })

  // Outstanding payable is the last running balance
  if (ledgerEntries.length > 0) {
    totals.outstandingPayable = ledgerEntries[ledgerEntries.length - 1].balance || 0
  }

  return totals
}
