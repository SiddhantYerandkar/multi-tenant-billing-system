import { Query, createDocument, deleteDocument, getDocument, listDocuments, updateDocument } from "./dbService"
const COLLECTION = "purchases"

/**
 * Get all purchases for a company
 */
export async function getPurchases(companyId) {
  let allPurchases = []
  let offset = 0
  const limit = 100

  while (true) {
    const response = await listDocuments(
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
  console.log("Fetched purchases:", allPurchases)
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
    const response = await listDocuments(
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
  return getDocument(COLLECTION, purchaseId)
}

/**
 * Create a new purchase
 */
export function createPurchase(data) {
  return createDocument(COLLECTION, data)
}

/**
 * Update purchase
 */
export function updatePurchase(purchaseId, data) {
  return updateDocument(COLLECTION, purchaseId, data)
}

/**
 * Delete purchase (only if no payments linked)
 */
export async function deletePurchase(purchaseId) {
  // Check if any payments are linked to this purchase
  return deleteDocument(COLLECTION, purchaseId)
}
