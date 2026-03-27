/**
 * Group invoices by partyId and calculate outstanding payment summary
 * 
 * @param {Array} invoices - Array of invoice documents
 * @param {Object} partyMap - Map of partyId -> party object
 * @returns {Array} Array of grouped party summaries
 */
export function groupInvoicesByParty(invoices = [], partyMap = {}) {
  const grouped = {}

  invoices.forEach(invoice => {
    const partyId = invoice.partyId
    if (!partyId) return

    if (!grouped[partyId]) {
      grouped[partyId] = {
        partyId,
        invoices: [],
        totalOutstanding: 0,
        invoiceCount: 0,
        oldestInvoiceDate: null,
        overdueDays: 0
      }
    }

    // Calculate balance: if balanceAmount exists use it, otherwise calculate from grandTotal - paidAmount
    // If neither exists, assume full grandTotal is outstanding (for old invoices without these fields)
    let balanceAmount = invoice.balanceAmount
    if (balanceAmount === undefined || balanceAmount === null) {
      const grandTotal = invoice.grandTotal || 0
      const paidAmount = invoice.paidAmount || 0
      balanceAmount = grandTotal - paidAmount
    }
    
    if (balanceAmount > 0) {
      grouped[partyId].invoices.push(invoice)
      grouped[partyId].totalOutstanding += balanceAmount
      grouped[partyId].invoiceCount += 1

      // Track oldest invoice date
      const invoiceDate = invoice.invoiceDate || invoice.$createdAt
      if (invoiceDate) {
        if (!grouped[partyId].oldestInvoiceDate) {
          grouped[partyId].oldestInvoiceDate = invoiceDate
        } else {
          const currentOldest = new Date(grouped[partyId].oldestInvoiceDate)
          const newDate = new Date(invoiceDate)
          if (newDate < currentOldest) {
            grouped[partyId].oldestInvoiceDate = invoiceDate
          }
        }
      }
    }
  })

  // Calculate overdue days and enrich with party data
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return Object.values(grouped)
    .filter(group => group.invoiceCount > 0) // Only include parties with outstanding invoices
    .map(group => {
      const party = partyMap[group.partyId] || {}
      
      // Calculate overdue days
      if (group.oldestInvoiceDate) {
        const oldestDate = new Date(group.oldestInvoiceDate)
        oldestDate.setHours(0, 0, 0, 0)
        const diffTime = today - oldestDate
        group.overdueDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      }

      return {
        ...group,
        partyCode: party.partyCode || 'N/A',
        partyName: party.name || 'Unknown Party',
        partyPhone: party.phone || '',
        party: party
      }
    })
}
