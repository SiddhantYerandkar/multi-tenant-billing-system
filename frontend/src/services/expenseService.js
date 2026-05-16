import { databases } from "./appwrite"
import { ID, Query } from "appwrite"

const DB_ID = "billing_db"
const COLLECTION = "expenses"

/**
 * Get all expenses for a company
 */
export async function getExpenses(companyId) {
  let allExpenses = []
  let offset = 0
  const limit = 100

  while (true) {
    const response = await databases.listDocuments(
      DB_ID,
      COLLECTION,
      [
        Query.equal("companyId", companyId),
        Query.orderDesc("expenseDate"),
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

  return { documents: allExpenses }
}

/**
 * Get a single expense by ID
 */
export function getExpense(expenseId) {
  return databases.getDocument(DB_ID, COLLECTION, expenseId)
}

/**
 * Create a new expense
 */
export function createExpense(data) {
  return databases.createDocument(DB_ID, COLLECTION, ID.unique(), data)
}

/**
 * Update expense
 */
export function updateExpense(expenseId, data) {
  return databases.updateDocument(DB_ID, COLLECTION, expenseId, data)
}

/**
 * Delete expense
 */
export function deleteExpense(expenseId) {
  return databases.deleteDocument(DB_ID, COLLECTION, expenseId)
}
