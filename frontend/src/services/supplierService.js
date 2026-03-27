import { databases } from "./appwrite"
import { ID, Query } from "appwrite"

const DB_ID = "billing_db"
const COLLECTION = "suppliers"

/**
 * Get all suppliers for a company
 */
export async function getSuppliers(companyId) {
  let allSuppliers = []
  let offset = 0
  const limit = 100

  while (true) {
    const response = await databases.listDocuments(
      DB_ID,
      COLLECTION,
      [
        Query.equal("companyId", companyId),
        Query.orderAsc("supplierCode"),
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

  return { documents: allSuppliers }
}

/**
 * Get a single supplier by ID
 */
export function getSupplier(companyId, supplierId) {
  return databases.getDocument(DB_ID, COLLECTION, supplierId)
}

/**
 * Create a new supplier
 */
export function createSupplier(data) {
  return databases.createDocument(DB_ID, COLLECTION, ID.unique(), data)
}

/**
 * Update supplier
 */
export function updateSupplier(supplierId, data) {
  return databases.updateDocument(DB_ID, COLLECTION, supplierId, data)
}

/**
 * Delete supplier
 */
export function deleteSupplier(supplierId) {
  return databases.deleteDocument(DB_ID, COLLECTION, supplierId)
}

/**
 * Generate supplier code (S001, S002, etc.)
 */
export async function generateSupplierCode(companyId) {
  const res = await getSuppliers(companyId)
  const suppliers = res.documents

  if (suppliers.length === 0) {
    return "S001"
  }

  // Extract numeric part from existing codes (e.g., "S001" -> 1)
  const codes = suppliers
    .map(s => s.supplierCode)
    .filter(code => code && code.match(/^S\d+$/))
    .map(code => parseInt(code.substring(1)))

  if (codes.length === 0) {
    return "S001"
  }

  const maxCode = Math.max(...codes)
  const nextCode = maxCode + 1
  return `S${String(nextCode).padStart(3, "0")}`
}
