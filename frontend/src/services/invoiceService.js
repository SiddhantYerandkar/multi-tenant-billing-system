import {
    listDocuments,
    createDocument,
    getDocument,
    updateDocument,
    deleteDocument,
    Query,
} from "./dbService"

const COLLECTION = "invoices"

/* ---------------- GET ALL INVOICES ---------------- */
export async function getInvoices(companyId) {
    const query = [
        Query.equal("companyId", companyId),
        Query.orderDesc("date"),
    ]

    return await listDocuments(COLLECTION, query)
}

/* ---------------- GET INVOICES BY PARTY ---------------- */
export async function getInvoicesByParty(companyId, partyId) {
    const query = [
        Query.equal("companyId", companyId),
        Query.equal("partyId", partyId),
        Query.orderAsc("date"),
    ]

    return await listDocuments(COLLECTION, query)
}

/* ---------------- GET SINGLE INVOICE ---------------- */
export async function getInvoiceById(invoiceId) {
    return await getDocument(COLLECTION, invoiceId)
}

/* ---------------- CREATE INVOICE ---------------- */
export async function createInvoice(data) {
    const explicitStatus = String(data.status || "").toLowerCase()
    const payload = {
        ...data,
        paidAmount: Number(data.paidAmount || 0),
        totalAmount: Number(data.totalAmount || 0),
        status:
            explicitStatus === "cancelled"
                ? "cancelled"
                : calculateStatus(data.paidAmount, data.totalAmount),
        date: data.date || new Date().toISOString(),
    }

    return await createDocument(COLLECTION, payload)
}

/* ---------------- UPDATE INVOICE ---------------- */
export async function updateInvoice(invoiceId, data) {
    const explicitStatus = String(data.status || "").toLowerCase()
    const payload = {
        ...data,
        paidAmount: Number(data.paidAmount || 0),
        totalAmount: Number(data.totalAmount || 0),
        status:
            explicitStatus === "cancelled"
                ? "cancelled"
                : calculateStatus(data.paidAmount, data.totalAmount),
    }

    return await updateDocument(COLLECTION, invoiceId, payload)
}

/* ---------------- DELETE ---------------- */
export async function deleteInvoice(invoiceId) {
    return await deleteDocument(COLLECTION, invoiceId)
}

/* ---------------- CREATE FROM ORDER ---------------- */
export async function createInvoiceFromOrder(order) {
    const totalAmount = order.items?.reduce(
        (sum, i) => sum + Number(i.totalAmount),
        0
    )

    const payload = {
        companyId: order.companyId,
        orderId: order.$id || order.id,
        partyId: order.partyId,
        items: order.items || [],
        totalAmount,
        paidAmount: 0,
        status: "unpaid",
        invoiceNo: generateInvoiceNumber(),
        date: new Date().toISOString(),
    }

    return await createDocument(COLLECTION, payload)
}

/* ---------------- HELPERS ---------------- */

function calculateStatus(paid = 0, total = 0) {
    const p = Number(paid || 0)
    const t = Number(total || 0)

    if (p <= 0) return "unpaid"
    if (p < t) return "partial"
    return "paid"
}

/* Simple generator (replace later with backend-safe logic) */
export function generateInvoiceNumber() {
    const timestamp = Date.now().toString().slice(-6)
    return `INV-${timestamp}`
}