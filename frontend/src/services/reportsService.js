import { databases } from "./appwrite"
import { Query } from "appwrite"

const DB_ID = "billing_db"
const INVOICES_COLLECTION = "invoices"
const INVOICE_ITEMS_COLLECTION = "invoice_items"
const PAYMENTS_COLLECTION = "payments"
const PARTIES_COLLECTION = "parties"
const SUPPLIERS_COLLECTION = "suppliers"
const SUPPLIER_JOBS_COLLECTION = "supplier_jobs"
const PURCHASES_COLLECTION = "purchases"
const EXPENSES_COLLECTION = "expenses"

/**
 * Get Sales Report
 */
export async function getSalesReport(companyId, startDate, endDate) {
  const invoices = await getInvoicesInRange(companyId, startDate, endDate)
  const payments = await getPaymentsInRange(companyId, startDate, endDate)
  const parties = await getAllParties(companyId)

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

  // Create party map
  const partyMap = {}
  parties.forEach(party => {
    partyMap[party.$id] = party
  })

  const salesData = invoices
    .filter(inv => inv.invoiceType !== "purchase" && inv.status !== "cancelled")
    .map(invoice => {
      const invoicePayments = paymentsByInvoice[invoice.$id] || []
      const paidAmount = invoicePayments.reduce((sum, p) => {
        const status = p.status || 'completed'
        if (status === 'completed' || status === 'adjusted') {
          return sum + (p.amount || 0)
        }
        return sum
      }, 0)

      const totalAmount = invoice.finalAmount || invoice.grandTotal || 0
      const outstandingAmount = totalAmount - paidAmount

      return {
        invoiceId: invoice.$id,
        invoiceNo: invoice.invoiceNumber,
        partyName: partyMap[invoice.partyId]?.name || "N/A",
        invoiceDate: invoice.invoiceDate,
        totalAmount,
        paidAmount,
        outstandingAmount
      }
    })

  return salesData
}

/**
 * Get Outstanding Report
 */
export async function getOutstandingReport(companyId) {
  const [invoices, payments, parties, suppliers, supplierJobs, purchases, supplierPayments] = await Promise.all([
    getAllInvoices(companyId),
    getAllPayments(companyId),
    getAllParties(companyId),
    getAllSuppliers(companyId),
    getAllSupplierJobs(companyId),
    getAllPurchases(companyId),
    getAllSupplierPayments(companyId)
  ])

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

  // Group supplier payments by supplier
  const supplierPaymentsBySupplier = {}
  supplierPayments.forEach(payment => {
    if (payment.supplierId) {
      if (!supplierPaymentsBySupplier[payment.supplierId]) {
        supplierPaymentsBySupplier[payment.supplierId] = []
      }
      supplierPaymentsBySupplier[payment.supplierId].push(payment)
    }
  })

  const outstandingData = []

  // Customer outstanding (from invoices)
  invoices
    .filter(inv => inv.status !== "cancelled" && inv.status !== "paid")
    .forEach(invoice => {
      const invoicePayments = paymentsByInvoice[invoice.$id] || []
      const paidAmount = invoicePayments.reduce((sum, p) => {
        const status = p.status || 'completed'
        if (status === 'completed' || status === 'adjusted') {
          return sum + (p.amount || 0)
        }
        return sum
      }, 0)

      const totalAmount = invoice.finalAmount || invoice.grandTotal || 0
      const outstandingAmount = totalAmount - paidAmount

      if (outstandingAmount > 0) {
        outstandingData.push({
          id: invoice.$id,
          name: parties.find(p => p.$id === invoice.partyId)?.name || "N/A",
          type: "Customer",
          totalAmount,
          paidAmount,
          outstandingAmount
        })
      }
    })

  // Supplier outstanding (from jobs and purchases)
  suppliers.forEach(supplier => {
    const jobs = supplierJobs.filter(job => job.supplierId === supplier.$id)
    const supplierPurchases = purchases.filter(p => p.supplierId === supplier.$id)
    const payments = supplierPaymentsBySupplier[supplier.$id] || []

    const jobCost = jobs.reduce((sum, job) => sum + (job.cost || job.sellingAmount || 0), 0)
    const purchaseCost = supplierPurchases.reduce((sum, p) => sum + (p.amount || 0), 0)
    const totalCost = jobCost + purchaseCost

    const paidAmount = payments.reduce((sum, p) => {
      if (!p.reversed) {
        return sum + (p.amount || 0)
      }
      return sum
    }, 0)

    const outstandingAmount = totalCost - paidAmount

    if (outstandingAmount > 0) {
      outstandingData.push({
        id: supplier.$id,
        name: supplier.name,
        type: "Supplier",
        totalAmount: totalCost,
        paidAmount,
        outstandingAmount
      })
    }
  })

  return outstandingData
}

/**
 * Get Supplier Cost Report
 */
export async function getSupplierCostReport(companyId, startDate, endDate) {
  const [suppliers, supplierJobs, purchases] = await Promise.all([
    getAllSuppliers(companyId),
    getSupplierJobsInRange(companyId, startDate, endDate),
    getPurchasesInRange(companyId, startDate, endDate)
  ])

  const supplierMap = {}
  suppliers.forEach(supplier => {
    supplierMap[supplier.$id] = supplier
  })

  const costData = {}

  // Aggregate job costs
  supplierJobs.forEach(job => {
    const supplierId = job.supplierId
    if (!costData[supplierId]) {
      costData[supplierId] = {
        supplierId,
        supplierName: supplierMap[supplierId]?.name || "N/A",
        jobCosts: 0,
        purchaseCosts: 0,
        totalCost: 0
      }
    }
    costData[supplierId].jobCosts += job.cost || job.sellingAmount || 0
  })

  // Aggregate purchase costs
  purchases.forEach(purchase => {
    const supplierId = purchase.supplierId
    if (supplierId) {
      if (!costData[supplierId]) {
        costData[supplierId] = {
          supplierId,
          supplierName: supplierMap[supplierId]?.name || "N/A",
          jobCosts: 0,
          purchaseCosts: 0,
          totalCost: 0
        }
      }
      costData[supplierId].purchaseCosts += purchase.amount || 0
    }
  })

  // Calculate totals
  Object.values(costData).forEach(data => {
    data.totalCost = data.jobCosts + data.purchaseCosts
  })

  return Object.values(costData).sort((a, b) => b.totalCost - a.totalCost)
}

/**
 * Get Expense Report
 */
export async function getExpenseReport(companyId, startDate, endDate, groupBy = "category") {
  const expenses = await getExpensesInRange(companyId, startDate, endDate)

  if (groupBy === "category") {
    const categoryMap = {}
    expenses.forEach(expense => {
      const category = expense.category || "others"
      if (!categoryMap[category]) {
        categoryMap[category] = {
          category,
          totalAmount: 0,
          count: 0
        }
      }
      categoryMap[category].totalAmount += expense.amount || 0
      categoryMap[category].count += 1
    })
    return Object.values(categoryMap).sort((a, b) => b.totalAmount - a.totalAmount)
  } else {
    // Group by date
    const dateMap = {}
    expenses.forEach(expense => {
      const date = expense.expenseDate ? expense.expenseDate.split('T')[0] : "N/A"
      if (!dateMap[date]) {
        dateMap[date] = {
          date,
          totalAmount: 0,
          count: 0
        }
      }
      dateMap[date].totalAmount += expense.amount || 0
      dateMap[date].count += 1
    })
    return Object.values(dateMap).sort((a, b) => new Date(b.date) - new Date(a.date))
  }
}

/**
 * Get Job Profitability Report
 */
export async function getJobProfitabilityReport(companyId, startDate, endDate) {
  const [supplierJobs, invoices, invoiceItems] = await Promise.all([
    getSupplierJobsInRange(companyId, startDate, endDate),
    getInvoicesInRange(companyId, startDate, endDate),
    getInvoiceItemsInRange(companyId, startDate, endDate)
  ])

  // Group jobs by jobNo
  const jobsByJobNo = {}
  supplierJobs.forEach(job => {
    const jobNo = job.jobNo
    if (!jobsByJobNo[jobNo]) {
      jobsByJobNo[jobNo] = []
    }
    jobsByJobNo[jobNo].push(job)
  })

  // Group invoice items by jobNo (if linked)
  const revenueByJobNo = {}
  invoiceItems.forEach(item => {
    const jobNo = item.jobNo
    if (jobNo) {
      if (!revenueByJobNo[jobNo]) {
        revenueByJobNo[jobNo] = 0
      }
      const qty = item.qty || item.quantity || 0
      const price = item.price || 0
      const discount = item.discount || 0
      const tax = item.tax || item.gstAmount || 0
      revenueByJobNo[jobNo] += (qty * price - discount + tax)
    }
  })

  // Also check invoices for jobNo
  invoices.forEach(invoice => {
    const jobNo = invoice.jobNo
    if (jobNo && !revenueByJobNo[jobNo]) {
      revenueByJobNo[jobNo] = invoice.finalAmount || invoice.grandTotal || 0
    }
  })

  const profitabilityData = []

  Object.keys(jobsByJobNo).forEach(jobNo => {
    const jobs = jobsByJobNo[jobNo]
    const cost = jobs.reduce((sum, job) => sum + (job.cost || job.sellingAmount || 0), 0)
    const revenue = revenueByJobNo[jobNo] || 0
    const profit = revenue - cost

    profitabilityData.push({
      jobNo,
      revenue,
      cost,
      profit,
      profitMargin: revenue > 0 ? ((profit / revenue) * 100).toFixed(2) : 0
    })
  })

  return profitabilityData.sort((a, b) => b.profit - a.profit)
}

/**
 * Get Monthly Summary Report
 */
export async function getMonthlySummaryReport(companyId, startDate, endDate) {
  const [invoices, payments, purchases, expenses, supplierJobs] = await Promise.all([
    getInvoicesInRange(companyId, startDate, endDate),
    getPaymentsInRange(companyId, startDate, endDate),
    getPurchasesInRange(companyId, startDate, endDate),
    getExpensesInRange(companyId, startDate, endDate),
    getSupplierJobsInRange(companyId, startDate, endDate)
  ])

  // Calculate revenue
  const revenue = invoices
    .filter(inv => inv.invoiceType !== "purchase" && inv.status !== "cancelled")
    .reduce((sum, inv) => sum + (inv.finalAmount || inv.grandTotal || 0), 0)

  // Calculate supplier costs
  const supplierCost = supplierJobs.reduce((sum, job) => sum + (job.cost || job.sellingAmount || 0), 0) +
    purchases.reduce((sum, p) => sum + (p.amount || 0), 0)

  // Calculate expenses
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)

  // Calculate net profit
  const netProfit = revenue - supplierCost - totalExpenses

  return {
    totalRevenue: revenue,
    totalSupplierCost: supplierCost,
    totalExpenses,
    netProfit,
    profitMargin: revenue > 0 ? ((netProfit / revenue) * 100).toFixed(2) : 0
  }
}

/* ---------- Helper Functions ---------- */

async function getInvoicesInRange(companyId, startDate, endDate) {
  let allInvoices = []
  let offset = 0
  const limit = 100

  const queries = [Query.equal("companyId", companyId)]

  if (startDate) {
    queries.push(Query.greaterThanEqual("invoiceDate", startDate))
  }
  if (endDate) {
    queries.push(Query.lessThanEqual("invoiceDate", endDate))
  }

  while (true) {
    const response = await databases.listDocuments(
      DB_ID,
      INVOICES_COLLECTION,
      [...queries, Query.limit(limit), Query.offset(offset)]
    )

    allInvoices = [...allInvoices, ...response.documents]

    if (response.documents.length < limit) {
      break
    }

    offset += limit
  }

  return allInvoices
}

async function getAllInvoices(companyId) {
  return getInvoicesInRange(companyId, null, null)
}

async function getPaymentsInRange(companyId, startDate, endDate) {
  let allPayments = []
  let offset = 0
  const limit = 100

  const queries = [Query.equal("companyId", companyId)]

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
      [...queries, Query.limit(limit), Query.offset(offset)]
    )

    allPayments = [...allPayments, ...response.documents]

    if (response.documents.length < limit) {
      break
    }

    offset += limit
  }

  return allPayments.filter(p => {
    const status = p.status || 'completed'
    return status !== 'reversed'
  })
}

async function getAllPayments(companyId) {
  return getPaymentsInRange(companyId, null, null)
}

async function getAllParties(companyId) {
  let allParties = []
  let offset = 0
  const limit = 100

  while (true) {
    const response = await databases.listDocuments(
      DB_ID,
      PARTIES_COLLECTION,
      [
        Query.equal("companyId", companyId),
        Query.limit(limit),
        Query.offset(offset)
      ]
    )

    allParties = [...allParties, ...response.documents]

    if (response.documents.length < limit) {
      break
    }

    offset += limit
  }

  return allParties
}

async function getAllSuppliers(companyId) {
  let allSuppliers = []
  let offset = 0
  const limit = 100

  while (true) {
    const response = await databases.listDocuments(
      DB_ID,
      SUPPLIERS_COLLECTION,
      [
        Query.equal("companyId", companyId),
        Query.limit(limit),
        Query.offset(offset)
      ]
    )

    allSuppliers = [...allSuppliers, ...response.documents]

    if (response.documents.length < limit) {
      break
    }

    offset += limit
  }

  return allSuppliers
}

async function getSupplierJobsInRange(companyId, startDate, endDate) {
  let allJobs = []
  let offset = 0
  const limit = 100

  const queries = [Query.equal("companyId", companyId)]

  if (startDate) {
    queries.push(Query.greaterThanEqual("jobDate", startDate))
  }
  if (endDate) {
    queries.push(Query.lessThanEqual("jobDate", endDate))
  }

  while (true) {
    const response = await databases.listDocuments(
      DB_ID,
      SUPPLIER_JOBS_COLLECTION,
      [...queries, Query.limit(limit), Query.offset(offset)]
    )

    allJobs = [...allJobs, ...response.documents]

    if (response.documents.length < limit) {
      break
    }

    offset += limit
  }

  return allJobs
}

async function getAllSupplierJobs(companyId) {
  return getSupplierJobsInRange(companyId, null, null)
}

async function getPurchasesInRange(companyId, startDate, endDate) {
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
      [...queries, Query.limit(limit), Query.offset(offset)]
    )

    allPurchases = [...allPurchases, ...response.documents]

    if (response.documents.length < limit) {
      break
    }

    offset += limit
  }

  return allPurchases
}

async function getAllPurchases(companyId) {
  return getPurchasesInRange(companyId, null, null)
}

async function getExpensesInRange(companyId, startDate, endDate) {
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
      [...queries, Query.limit(limit), Query.offset(offset)]
    )

    allExpenses = [...allExpenses, ...response.documents]

    if (response.documents.length < limit) {
      break
    }

    offset += limit
  }

  return allExpenses
}

async function getInvoiceItemsInRange(companyId, startDate, endDate) {
  const invoices = await getInvoicesInRange(companyId, startDate, endDate)
  const invoiceIds = invoices.map(inv => inv.$id)

  if (invoiceIds.length === 0) {
    return []
  }

  let allItems = []
  let offset = 0
  const limit = 100

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
      // Fallback: fetch items per invoice
      const itemPromises = invoiceIds.map(invoiceId =>
        databases.listDocuments(
          DB_ID,
          INVOICE_ITEMS_COLLECTION,
          [Query.equal("invoiceId", invoiceId)]
        ).then(res => res.documents).catch(() => [])
      )
      const itemArrays = await Promise.all(itemPromises)
      allItems = itemArrays.flat()
      break
    }
  }

  return allItems
}

async function getAllSupplierPayments(companyId) {
  let allPayments = []
  let offset = 0
  const limit = 100

  while (true) {
    const response = await databases.listDocuments(
      DB_ID,
      "supplier_payments",
      [
        Query.equal("companyId", companyId),
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

  return allPayments.filter(p => !p.reversed)
}
