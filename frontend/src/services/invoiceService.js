import { databases } from "./appwrite"
import { ID, Query } from "appwrite"

const DB_ID = "billing_db"
const INVOICES_COLLECTION = "invoices"
const INVOICE_ITEMS_COLLECTION = "invoice_items"

export function listInvoices(companyId) {
  return databases.listDocuments(DB_ID, INVOICES_COLLECTION, [
    Query.equal("companyId", companyId),
    Query.orderDesc("$createdAt"),
  ])
}

export function getInvoice(companyId, invoiceId) {
  return databases.getDocument(DB_ID, INVOICES_COLLECTION, invoiceId)
}

export async function createInvoice(data, items = []) {
  const invoice = await databases.createDocument(DB_ID, INVOICES_COLLECTION, ID.unique(), data)
  
  // Create invoice items
  for (const item of items) {
    await databases.createDocument(DB_ID, INVOICE_ITEMS_COLLECTION, ID.unique(), {
      invoiceId: invoice.$id,
      companyId: data.companyId,
      productId: item.productId || null,
      productName: item.productName,
      description: item.description || "",
      quantity: item.quantity,
      rate: item.rate,
      total: item.total
    })
  }
  
  return invoice
}

export async function generateInvoiceNumber(companyId) {
  const response = await databases.listDocuments(DB_ID, INVOICES_COLLECTION, [
    Query.equal("companyId", companyId),
    Query.orderDesc("$createdAt"),
    Query.limit(100)
  ])
  
  let maxNum = 0
  for (const inv of response.documents) {
    const match = inv.invoiceNumber?.match(/INV-(\d+)/)
    if (match) {
      const num = parseInt(match[1], 10)
      if (num > maxNum) maxNum = num
    }
  }
  
  return `INV-${String(maxNum + 1).padStart(4, '0')}`
}

export function updateInvoice(id, data) {
  return databases.updateDocument(DB_ID, INVOICES_COLLECTION, id, data)
}

export function createInvoiceItem(data) {
  return databases.createDocument(DB_ID, INVOICE_ITEMS_COLLECTION, ID.unique(), data)
}

export function getInvoiceItems(invoiceId) {
  return databases.listDocuments(DB_ID, INVOICE_ITEMS_COLLECTION, [
    Query.equal("invoiceId", invoiceId),
  ])
}



/**
 * Get all outstanding invoices (status != "paid")
 * Also includes invoices without a status field (legacy data)
 */
export async function getOutstandingInvoices(companyId) {
  let allInvoices = []
  let offset = 0
  const limit = 100

  // Fetch ALL invoices first, then filter client-side
  // This handles legacy invoices that might not have status field
  while (true) {
    const response = await databases.listDocuments(
      DB_ID,
      INVOICES_COLLECTION,
      [
        Query.equal("companyId", companyId),
        Query.orderDesc("invoiceDate"),
        Query.limit(limit),
        Query.offset(offset)
      ]
    )

    allInvoices = [...allInvoices, ...response.documents]

    if (response.documents.length < limit) {
      break
    }

    offset += limit
  }

  // Filter client-side: exclude only invoices explicitly marked as "paid"
  // Include invoices with no status, or status other than "paid"
  const outstandingInvoices = allInvoices.filter(invoice => {
    // If status is explicitly "paid", exclude
    if (invoice.status === "paid") {
      return false
    }
    
    // Calculate actual balance
    const grandTotal = invoice.grandTotal || 0
    const paidAmount = invoice.paidAmount || 0
    const balanceAmount = invoice.balanceAmount !== undefined 
      ? invoice.balanceAmount 
      : (grandTotal - paidAmount)
    
    // Include if there's outstanding balance
    return balanceAmount > 0
  })

  return { documents: outstandingInvoices }
}
