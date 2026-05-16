import { databases } from "./appwrite"
import { Query } from "appwrite"

const DB_ID = "billing_db"
const INVOICES_COLLECTION = "invoices"
const PAYMENTS_COLLECTION = "payments"

/**
 * Get all invoices for a specific party
 */
export async function getInvoicesForParty(companyId, partyId) {
  let allInvoices = []
  let offset = 0
  const limit = 100

  while (true) {
    const response = await databases.listDocuments(
      DB_ID,
      INVOICES_COLLECTION,
      [
        Query.equal("companyId", companyId),
        Query.equal("partyId", partyId),
        Query.orderAsc("invoiceDate"),
        Query.limit(limit),
        Query.offset(offset)
      ]
    )

    allInvoices = allInvoices.concat(response.documents)
    
    if (response.documents.length < limit) {
      break
    }
    
    offset += limit
  }

  return allInvoices
}

/**
 * Get all payments for a specific party
 */
export async function getPaymentsForParty(companyId, partyId) {
  let allPayments = []
  let offset = 0
  const limit = 100

  while (true) {
    const response = await databases.listDocuments(
      DB_ID,
      PAYMENTS_COLLECTION,
      [
        Query.equal("companyId", companyId),
        Query.equal("partyId", partyId),
        Query.orderAsc("paymentDate"),
        Query.limit(limit),
        Query.offset(offset)
      ]
    )

    allPayments = allPayments.concat(response.documents)
    
    if (response.documents.length < limit) {
      break
    }
    
    offset += limit
  }

  return allPayments
}

/**
 * Get complete ledger data for a party
 */
export async function getPartyLedgerData(companyId, partyId) {
  const [invoices, payments] = await Promise.all([
    getInvoicesForParty(companyId, partyId),
    getPaymentsForParty(companyId, partyId)
  ])

  return {
    invoices,
    payments
  }
}
