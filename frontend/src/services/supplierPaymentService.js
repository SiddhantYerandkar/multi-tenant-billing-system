import { databases } from "./appwrite"
import { ID, Query } from "appwrite"

const DB_ID = "billing_db"
const COLLECTION = "supplier_payments"

/**
 * Get all payments for a supplier
 */
export async function getPaymentsForSupplier(companyId, supplierId) {
  let allPayments = []
  let offset = 0
  const limit = 100

  while (true) {
    const response = await databases.listDocuments(
      DB_ID,
      COLLECTION,
      [
        Query.equal("companyId", companyId),
        Query.equal("supplierId", supplierId),
        Query.orderDesc("paymentDate"),
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

  return allPayments
}

/**
 * Get a single payment by ID
 */
export function getPayment(paymentId) {
  return databases.getDocument(DB_ID, COLLECTION, paymentId)
}

/**
 * Create a new payment
 */
export function createSupplierPayment(data) {
  return databases.createDocument(DB_ID, COLLECTION, ID.unique(), data)
}

/**
 * Reverse a payment (creates new record with reversed=true)
 */
export async function reverseSupplierPayment(paymentId, reason, originalPayment) {
  if (!reason || reason.trim() === '') {
    throw new Error('Reversal reason is required')
  }

  // Create reversal payment entry
  const reversalPayment = await createSupplierPayment({
    companyId: originalPayment.companyId,
    supplierId: originalPayment.supplierId,
    referenceType: originalPayment.referenceType,
    referenceId: originalPayment.referenceId,
    amount: -(originalPayment.amount || 0), // Negative amount
    paymentMode: originalPayment.paymentMode,
    paymentDate: new Date().toISOString().split('T')[0],
    reversed: true,
    notes: `Reversal: ${reason.trim()}`,
    reversedFrom: paymentId // Link to original
  })

  return reversalPayment
}

/**
 * Get all supplier ledger data (jobs, purchases, payments)
 */
export async function getSupplierLedgerData(companyId, supplierId) {
  const jobService = await import("./supplierJobService")
  const purchaseService = await import("./purchaseService")
  
  const [jobs, purchases, payments] = await Promise.all([
    jobService.getJobsForSupplier(companyId, supplierId),
    purchaseService.getPurchasesForSupplier(companyId, supplierId),
    getPaymentsForSupplier(companyId, supplierId)
  ])

  return {
    jobs,
    purchases,
    payments
  }
}
