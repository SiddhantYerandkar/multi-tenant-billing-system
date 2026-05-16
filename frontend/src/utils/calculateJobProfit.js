/**
 * Calculate job profit/loss
 * 
 * Formula:
 * profit = invoice.total
 *   - SUM(supplier_jobs.cost where jobNo)
 *   - SUM(purchases.cost where jobNo)
 *   - SUM(expenses.amount where jobNo)
 * 
 * @param {Object} invoice - Invoice object (or null)
 * @param {Array} supplierJobs - Array of supplier_jobs
 * @param {Array} purchases - Array of purchases linked to job
 * @param {Array} expenses - Array of expenses linked to job
 * @returns {number} Profit amount (can be negative for loss)
 */
export function calculateJobProfit(invoice, supplierJobs = [], purchases = [], expenses = []) {
  // Invoice total
  const invoiceTotal = invoice ? (invoice.grandTotal || 0) : 0

  // Sum of supplier job costs
  const totalSupplierCost = supplierJobs.reduce((sum, job) => {
    return sum + (job.invoiceAmount || job.sellingAmount || job.cost || 0)
  }, 0)

  // Sum of purchases
  const totalPurchaseCost = purchases.reduce((sum, purchase) => {
    return sum + (purchase.amount || purchase.totalAmount || purchase.cost || 0)
  }, 0)

  // Sum of expenses
  const totalExpenses = expenses.reduce((sum, expense) => {
    return sum + (expense.amount || expense.cost || 0)
  }, 0)

  // Calculate profit
  const profit = invoiceTotal - totalSupplierCost - totalPurchaseCost - totalExpenses

  return profit
}

/**
 * Get job profit breakdown
 */
export function getJobProfitBreakdown(invoice, supplierJobs = [], purchases = [], expenses = []) {
  const invoiceTotal = invoice ? (invoice.grandTotal || 0) : 0
  const totalSupplierCost = supplierJobs.reduce((sum, job) => sum + (job.invoiceAmount || job.sellingAmount || job.cost || 0), 0)
  const totalPurchaseCost = purchases.reduce((sum, purchase) => sum + (purchase.amount || purchase.totalAmount || purchase.cost || 0), 0)
  const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.amount || expense.cost || 0), 0)
  const profit = invoiceTotal - totalSupplierCost - totalPurchaseCost - totalExpenses

  return {
    invoiceTotal,
    totalSupplierCost,
    totalPurchaseCost,
    totalExpenses,
    profit,
    profitMargin: invoiceTotal > 0 ? (profit / invoiceTotal) * 100 : 0
  }
}
