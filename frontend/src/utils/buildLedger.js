/**
 * Build Party Ledger from invoices and payments
 * 
 * Accounting Rules:
 * - Invoice: Debit = grandTotal, Credit = 0
 * - Payment (completed/adjusted): Debit = 0, Credit = amount
 * - Payment (reversed): Debit = |amount| (negative becomes positive debit), Credit = 0
 * - Adjustment: Positive = Credit, Negative = Debit
 * 
 * Running Balance: Previous Balance + Debit - Credit
 */

/**
 * Transform invoices into ledger entries
 */
function invoicesToLedgerEntries(invoices = []) {
  return invoices
    .filter(invoice => invoice.isDraft !== true) // Exclude drafts
    .map(invoice => ({
      id: `invoice-${invoice.$id}`,
      date: invoice.invoiceDate || invoice.$createdAt,
      type: 'Invoice',
      referenceType: 'Invoice',
      referenceNumber: invoice.invoiceNumber || `INV-${invoice.$id.slice(0, 8)}`,
      debit: invoice.grandTotal || 0,
      credit: 0,
      status: invoice.status || 'pending',
      invoiceId: invoice.$id,
      paymentId: null,
      metadata: {
        invoice: invoice
      }
    }))
}

/**
 * Transform payments into ledger entries
 */
function paymentsToLedgerEntries(payments = []) {
  const entries = []

  payments.forEach(payment => {
    const status = payment.status || 'completed'
    const amount = payment.amount || 0

    if (status === 'reversed') {
      // Reversed payment: Debit = |amount|, Credit = 0
      entries.push({
        id: `payment-${payment.$id}`,
        date: payment.paymentDate || payment.$createdAt,
        type: 'Reversal',
        referenceType: 'Reversal',
        referenceNumber: payment.receiptNumber || `RCPT-${payment.$id.slice(0, 8)}`,
        debit: Math.abs(amount), // Negative amount becomes positive debit
        credit: 0,
        status: 'reversed',
        invoiceId: payment.invoiceId,
        paymentId: payment.$id,
        reversedFrom: payment.reversedFrom,
        metadata: {
          payment: payment
        }
      })
    } else if (status === 'adjusted') {
      // Adjustment: Positive = Credit, Negative = Debit
      if (amount >= 0) {
        entries.push({
          id: `payment-${payment.$id}`,
          date: payment.paymentDate || payment.$createdAt,
          type: 'Adjustment',
          referenceType: 'Adjustment',
          referenceNumber: payment.receiptNumber || `ADJ-${payment.$id.slice(0, 8)}`,
          debit: 0,
          credit: amount,
          status: 'adjusted',
          invoiceId: payment.invoiceId,
          paymentId: payment.$id,
          reversedFrom: payment.reversedFrom,
          metadata: {
            payment: payment
          }
        })
      } else {
        entries.push({
          id: `payment-${payment.$id}`,
          date: payment.paymentDate || payment.$createdAt,
          type: 'Adjustment',
          referenceType: 'Adjustment',
          referenceNumber: payment.receiptNumber || `ADJ-${payment.$id.slice(0, 8)}`,
          debit: Math.abs(amount),
          credit: 0,
          status: 'adjusted',
          invoiceId: payment.invoiceId,
          paymentId: payment.$id,
          reversedFrom: payment.reversedFrom,
          metadata: {
            payment: payment
          }
        })
      }
    } else {
      // Completed payment: Debit = 0, Credit = amount
      entries.push({
        id: `payment-${payment.$id}`,
        date: payment.paymentDate || payment.$createdAt,
        type: 'Payment',
        referenceType: 'Payment',
        referenceNumber: payment.receiptNumber || `RCPT-${payment.$id.slice(0, 8)}`,
        debit: 0,
        credit: amount,
        status: 'completed',
        invoiceId: payment.invoiceId,
        paymentId: payment.$id,
        reversedFrom: payment.reversedFrom,
        metadata: {
          payment: payment
        }
      })
    }
  })

  return entries
}

/**
 * Build complete ledger with running balance
 * 
 * @param {object} party - Party object (may have openingBalance)
 * @param {array} invoices - Array of invoice documents
 * @param {array} payments - Array of payment documents
 * @returns {array} Sorted ledger entries with running balance
 */
export function buildLedger(party = {}, invoices = [], payments = []) {
  const entries = []

  // Add opening balance if exists
  const openingBalance = party.openingBalance || 0
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
      invoiceId: null,
      paymentId: null,
      balance: openingBalance,
      metadata: {}
    })
  }

  // Add invoice entries
  entries.push(...invoicesToLedgerEntries(invoices))

  // Add payment entries
  entries.push(...paymentsToLedgerEntries(payments))

  // Sort by date (ASC), then by creation time for same date
  entries.sort((a, b) => {
    const dateA = new Date(a.date).getTime()
    const dateB = new Date(b.date).getTime()
    if (dateA !== dateB) {
      return dateA - dateB
    }
    // For same date, opening balance first, then invoices, then payments
    const orderA = a.type === 'Opening Balance' ? 0 : a.type === 'Invoice' ? 1 : 2
    const orderB = b.type === 'Opening Balance' ? 0 : b.type === 'Invoice' ? 1 : 2
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
 * Calculate ledger summary totals
 */
export function calculateLedgerSummary(ledgerEntries = []) {
  const totals = {
    totalInvoiced: 0,
    totalPaid: 0,
    outstandingBalance: 0
  }

  ledgerEntries.forEach(entry => {
    if (entry.type === 'Invoice') {
      totals.totalInvoiced += entry.debit
    } else if (entry.type === 'Payment' && entry.status === 'completed') {
      totals.totalPaid += entry.credit
    } else if (entry.type === 'Adjustment' && entry.status === 'adjusted') {
      if (entry.credit > 0) {
        totals.totalPaid += entry.credit
      } else {
        totals.totalPaid -= entry.debit
      }
    } else if (entry.type === 'Reversal') {
      totals.totalPaid -= entry.debit
    }
  })

  // Outstanding balance is the last running balance
  if (ledgerEntries.length > 0) {
    totals.outstandingBalance = ledgerEntries[ledgerEntries.length - 1].balance || 0
  }

  return totals
}
