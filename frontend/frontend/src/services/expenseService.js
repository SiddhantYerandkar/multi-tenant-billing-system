import { Query, createDocument, deleteDocument, getDocument, listDocuments, updateDocument } from "./dbService"
const COLLECTION = "expenses"

/**
 * Get all expenses for a company
 */
export async function getExpenses(companyId) {
    let allExpenses = []
    let offset = 0
    const limit = 100

    while (true) {
        const response = await listDocuments(
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
    return getDocument(COLLECTION, expenseId)
}

/**
 * Create a new expense
 */
export function createExpense(data) {
    return createDocument(COLLECTION, data)
}

/**
 * Update expense
 */
export function updateExpense(expenseId, data) {
    return updateDocument(COLLECTION, expenseId, data)
}

/**
 * Delete expense
 */
export function deleteExpense(expenseId) {
    return deleteDocument(COLLECTION, expenseId)
}