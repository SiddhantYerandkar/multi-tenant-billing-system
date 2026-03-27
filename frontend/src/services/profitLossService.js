import { databases } from "./appwrite"
import { Query } from "appwrite"

const DB_ID = "billing_db"
const INVOICES_COLLECTION = "invoices"
const INVOICE_ITEMS_COLLECTION = "invoice_items"
const PAYMENTS_COLLECTION = "payments"
const PURCHASES_COLLECTION = "purchases"
const EXPENSES_COLLECTION = "expenses"

/**
 * Get Profit & Loss data for a date range
 */
export async function getProfitLossData(companyId, startDate, endDate) {
  // Convert dates to ISO strings if needed
  const start = startDate ? new Date(startDate).toISOString() : null
  const end = endDate ? new Date(endDate).toISOString() : null

  // Fetch all required data
  const [invoices, invoiceItems, payments, purchases, expenses] = await Promise.all([
    getInvoicesForPL(companyId, start, end),
    getInvoiceItemsForPL(companyId, start, end),
    getPaymentsForPL(companyId, start, end),
    getPurchasesForPL(companyId, start, end),
    getExpensesForPL(companyId, start, end)
  ])

  // Calculate revenue
  const revenue = calculateRevenue(invoices, invoiceItems, payments)
  
  // Calculate COGS
  const cogs = calculateCOGS(purchases)
  
  // Calculate gross profit
  const grossProfit = revenue.totalRevenue - cogs.totalCOGS
  
  // Calculate operating expenses
  const operatingExpenses = calculateOperatingExpenses(expenses)
  
  // Calculate net profit
  const netProfit = grossProfit - operatingExpenses.totalExpenses

  return {
    revenue,
    cogs,
    grossProfit,
    operatingExpenses,
    netProfit,
    period: {
      startDate: start || null,
      endDate: end || null
    }
  }
}

/**
 * Get invoices for P&L (sale invoices, not cancelled)
 */
async function getInvoicesForPL(companyId, startDate, endDate) {
  let allInvoices = []
  let offset = 0
  const limit = 100

  const queries = [
    Query.equal("companyId", companyId),
    Query.notEqual("status", "cancelled")
  ]

  // Add date filter if provided
  if (startDate) {
    queries.push(Query.greaterThanEqual("invoiceDate", startDate))
  }
  if (endDate) {
    queries.push(Query.lessThanEqual("invoiceDate", endDate))
  }

  while (true) {
    queries.push(Query.limit(limit), Query.offset(offset))
    
    const response = await databases.listDocuments(
      DB_ID,
      INVOICES_COLLECTION,
      queries.slice(0, -2).concat([Query.limit(limit), Query.offset(offset)])
    )

    allInvoices = [...allInvoices, ...response.documents]

    if (response.documents.length < limit) {
      break
    }

    offset += limit
  }

  // Filter for sale invoices (if invoiceType field exists, otherwise include all)
  return allInvoices.filter(inv => {
    // If invoiceType field exists, filter by it, otherwise include all non-cancelled
    return !inv.invoiceType || inv.invoiceType === "sale"
  })
}

/**
 * Get invoice items for P&L
 */
async function getInvoiceItemsForPL(companyId, startDate, endDate) {
  // First get invoice IDs in date range
  const invoices = await getInvoicesForPL(companyId, startDate, endDate)
  const invoiceIds = invoices.map(inv => inv.$id)

  if (invoiceIds.length === 0) {
    return []
  }

  // Fetch invoice items for these invoices
  // Appwrite Query.equal supports arrays, so we can pass invoiceIds array
  let allItems = []
  let offset = 0
  const limit = 100

  // If we have many invoices, we might need to batch the queries
  // For now, try with all invoice IDs
  while (true) {
    try {
      const response = await databases.listDocuments(
        DB_ID,
        INVOICE_ITEMS_COLLECTION,
        [
          Query.equal("invoiceId", invoiceIds),
          Query.limit(limit),
          Query.offset(offset)
        ]
      )

      allItems = [...allItems, ...response.documents]

      if (response.documents.length < limit) {
        break
      }

      offset += limit
    } catch (err) {
      // If array query fails, fetch items per invoice
      console.warn("Batch query failed, fetching items per invoice:", err)
      const itemPromises = invoiceIds.map(invoiceId =>
        databases.listDocuments(
          DB_ID,
          INVOICE_ITEMS_COLLECTION,
          [Query.equal("invoiceId", invoiceId)]
        ).then(res => res.documents)
      )
      const itemArrays = await Promise.all(itemPromises)
      allItems = itemArrays.flat()
      break
    }
  }

  return allItems
}

/**
 * Get payments for P&L
 */
async function getPaymentsForPL(companyId, startDate, endDate) {
  let allPayments = []
  let offset = 0
  const limit = 100

  const queries = [
    Query.equal("companyId", companyId)
  ]
  
  // Filter out reversed payments by status
  // Note: We'll filter client-side since Appwrite doesn't support OR queries easily

  if (startDate) {
    queries.push(Query.greaterThanEqual("paymentDate", startDate))
  }
  if (endDate) {
    queries.push(Query.lessThanEqual("paymentDate", endDate))
  }

  while (true) {
    const response = await databases.listDocuments(
      DB_ID,
      PAYMENTS_COLLECTION,
      [
        ...queries,
        Query.limit(limit),
        Query.offset(offset)
      ]
    )

    allPayments = [...allPayments, ...response.documents]

    if (response.documents.length < limit) {
      break
    }

    offset += limit
  }

  // Filter out reversed payments (status = 'reversed')
  return allPayments.filter(p => {
    const status = p.status || 'completed'
    return status !== 'reversed'
  })
}

/**
 * Get purchases for P&L
 */
async function getPurchasesForPL(companyId, startDate, endDate) {
  let allPurchases = []
  let offset = 0
  const limit = 100

  const queries = [Query.equal("companyId", companyId)]

  if (startDate) {
    queries.push(Query.greaterThanEqual("purchaseDate", startDate))
  }
  if (endDate) {
    queries.push(Query.lessThanEqual("purchaseDate", endDate))
  }

  while (true) {
    const response = await databases.listDocuments(
      DB_ID,
      PURCHASES_COLLECTION,
      [
        ...queries,
        Query.limit(limit),
        Query.offset(offset)
      ]
    )

    allPurchases = [...allPurchases, ...response.documents]

    if (response.documents.length < limit) {
      break
    }

    offset += limit
  }

  return allPurchases
}

/**
 * Get expenses for P&L
 */
async function getExpensesForPL(companyId, startDate, endDate) {
  let allExpenses = []
  let offset = 0
  const limit = 100

  const queries = [Query.equal("companyId", companyId)]

  if (startDate) {
    queries.push(Query.greaterThanEqual("expenseDate", startDate))
  }
  if (endDate) {
    queries.push(Query.lessThanEqual("expenseDate", endDate))
  }

  while (true) {
    const response = await databases.listDocuments(
      DB_ID,
      EXPENSES_COLLECTION,
      [
        ...queries,
        Query.limit(limit),
        Query.offset(offset)
      ]
    )

    allExpenses = [...allExpenses, ...response.documents]

    if (response.documents.length < limit) {
      break
    }

    offset += limit
  }

  return allExpenses
}

/**
 * Calculate revenue from invoices
 */
function calculateRevenue(invoices, invoiceItems, payments) {
  // Group payments by invoice
  const paymentsByInvoice = {}
  payments.forEach(payment => {
    if (payment.invoiceId) {
      if (!paymentsByInvoice[payment.invoiceId]) {
        paymentsByInvoice[payment.invoiceId] = []
      }
      paymentsByInvoice[payment.invoiceId].push(payment)
    }
  })

  let totalRevenue = 0
  let paidRevenue = 0
  const revenueBreakdown = []

  invoices.forEach(invoice => {
    // Calculate invoice amount
    let invoiceAmount = 0

    // Try to use finalAmount first
    if (invoice.finalAmount) {
      invoiceAmount = invoice.finalAmount
    } else if (invoice.grandTotal) {
      invoiceAmount = invoice.grandTotal
    } else {
      // Calculate from invoice items
      const items = invoiceItems.filter(item => item.invoiceId === invoice.$id)
      invoiceAmount = items.reduce((sum, item) => {
        const qty = item.qty || item.quantity || 0
        const price = item.price || 0
        const discount = item.discount || 0
        const tax = item.tax || item.gstAmount || 0
        return sum + (qty * price - discount + tax)
      }, 0)
    }

    totalRevenue += invoiceAmount

    // Calculate paid amount for this invoice
    const invoicePayments = paymentsByInvoice[invoice.$id] || []
    const paidAmount = invoicePayments.reduce((sum, p) => {
      // Only count completed/adjusted payments
      const status = p.status || 'completed'
      if (status === 'completed' || status === 'adjusted') {
        return sum + (p.amount || 0)
      }
      return sum
    }, 0)

    paidRevenue += Math.min(paidAmount, invoiceAmount)

    revenueBreakdown.push({
      invoiceId: invoice.$id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      amount: invoiceAmount,
      paidAmount: paidAmount,
      outstandingAmount: invoiceAmount - paidAmount
    })
  })

  return {
    totalRevenue,
    paidRevenue,
    outstandingRevenue: totalRevenue - paidRevenue,
    breakdown: revenueBreakdown
  }
}

/**
 * Calculate COGS from purchases
 */
function calculateCOGS(purchases) {
  const totalCOGS = purchases.reduce((sum, purchase) => {
    return sum + (purchase.amount || purchase.totalAmount || 0)
  }, 0)

  // Group by supplier
  const cogsBySupplier = {}
  purchases.forEach(purchase => {
    const supplierId = purchase.supplierId
    if (supplierId) {
      if (!cogsBySupplier[supplierId]) {
        cogsBySupplier[supplierId] = {
          supplierId,
          amount: 0,
          count: 0
        }
      }
      cogsBySupplier[supplierId].amount += purchase.amount || purchase.totalAmount || 0
      cogsBySupplier[supplierId].count += 1
    }
  })
  
  // Also handle purchases without supplierId
  purchases.forEach(purchase => {
    if (!purchase.supplierId) {
      const amount = purchase.amount || purchase.totalAmount || 0
      if (amount > 0) {
        if (!cogsBySupplier['_no_supplier']) {
          cogsBySupplier['_no_supplier'] = {
            supplierId: null,
            amount: 0,
            count: 0
          }
        }
        cogsBySupplier['_no_supplier'].amount += amount
        cogsBySupplier['_no_supplier'].count += 1
      }
    }
  })

  return {
    totalCOGS,
    breakdown: purchases.map(p => ({
      purchaseId: p.$id,
      itemName: p.itemName,
      purchaseDate: p.purchaseDate,
      amount: p.amount || purchase.totalAmount || 0,
      supplierId: p.supplierId
    })),
    bySupplier: Object.values(cogsBySupplier)
  }
}

/**
 * Calculate operating expenses
 */
function calculateOperatingExpenses(expenses) {
  const totalExpenses = expenses.reduce((sum, expense) => {
    return sum + (expense.amount || 0)
  }, 0)

  // Group by category
  const expensesByCategory = {}
  expenses.forEach(expense => {
    const category = expense.category || 'others'
    if (!expensesByCategory[category]) {
      expensesByCategory[category] = {
        category,
        amount: 0,
        count: 0
      }
    }
    expensesByCategory[category].amount += expense.amount || 0
    expensesByCategory[category].count += 1
  })

  return {
    totalExpenses,
    breakdown: expenses.map(e => ({
      expenseId: e.$id,
      title: e.title,
      category: e.category || 'others',
      expenseDate: e.expenseDate,
      amount: e.amount || 0
    })),
    byCategory: Object.values(expensesByCategory)
  }
}
