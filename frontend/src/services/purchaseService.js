import { databases } from "./appwrite"
import { ID, Query } from "appwrite"

const DB_ID = "billing_db"
const COLLECTION = "purchases"

/**
 * Get all purchases for a company
 */
export async function getPurchases(companyId) {
  let allPurchases = []
  let offset = 0
  const limit = 100

  while (true) {
    const response = await databases.listDocuments(
      DB_ID,
      COLLECTION,
      [
        Query.equal("companyId", companyId),
        Query.orderDesc("purchaseDate"),
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

  return { documents: allPurchases }
}

/**
 * Get all purchases for a supplier
 */
export async function getPurchasesForSupplier(companyId, supplierId) {
  let allPurchases = []
  let offset = 0
  const limit = 100

  while (true) {
    const response = await databases.listDocuments(
      DB_ID,
      COLLECTION,
      [
        Query.equal("companyId", companyId),
        Query.equal("supplierId", supplierId),
        Query.orderDesc("purchaseDate"),
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
 * Get a single purchase by ID
 */
export function getPurchase(purchaseId) {
  return databases.getDocument(DB_ID, COLLECTION, purchaseId)
}

/**
 * Create a new purchase
 */
export function createPurchase(data) {
  return databases.createDocument(DB_ID, COLLECTION, ID.unique(), data)
}

/**
 * Update purchase
 */
export function updatePurchase(purchaseId, data) {
  return databases.updateDocument(DB_ID, COLLECTION, purchaseId, data)
}

/**
 * Delete purchase (only if no payments linked)
 */
export async function deletePurchase(purchaseId, companyId) {
  // Check if any payments are linked to this purchase
  const { databases: db } = await import("./appwrite")
  const paymentsRes = await db.listDocuments(
    DB_ID,
    "supplier_payments",
    [
      Query.equal("companyId", companyId),
      Query.equal("referenceType", "purchase"),
      Query.equal("referenceId", purchaseId),
      Query.equal("reversed", false)
    ]
  )

  if (paymentsRes.total > 0) {
    throw new Error("Cannot delete purchase with linked payments. Reverse payments first.")
  }

  return databases.deleteDocument(DB_ID, COLLECTION, purchaseId)
}
