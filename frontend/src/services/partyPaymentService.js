import {
  Query,
  createDocument,
  listDocuments,
  updateDocument,
} from "./dbService"

const PAYMENTS_COLLECTION = "party_payments"
const ALLOCATIONS_COLLECTION = "party_payment_allocations"

function toAmount(n) {
  return Number(n || 0)
}

function toISODate(d) {
  try {
    const dd = d ? new Date(d) : new Date()
    if (isNaN(dd.getTime())) return new Date().toISOString()
    return dd.toISOString()
  } catch {
    return new Date().toISOString()
  }
}

export async function getPartyPayments(companyId, { partyId, referenceType } = {}) {
  const query = [
    Query.equal("companyId", companyId),
    Query.orderDesc("paymentDate"),
  ]
  if (partyId) query.push(Query.equal("partyId", partyId))
  if (referenceType) query.push(Query.equal("referenceType", referenceType))

  return await listDocuments(PAYMENTS_COLLECTION, query)
}

export async function getPartyPaymentAllocations(companyId, { paymentId, invoiceId } = {}) {
  const query = [Query.equal("companyId", companyId)]
  if (paymentId) query.push(Query.equal("paymentId", paymentId))
  if (invoiceId) query.push(Query.equal("invoiceId", invoiceId))

  return await listDocuments(ALLOCATIONS_COLLECTION, query)
}

export async function createPartyPayment(data) {
  const payload = {
    companyId: data.companyId,
    partyId: data.partyId,
    paymentDate: data.paymentDate ? toISODate(data.paymentDate) : toISODate(new Date()),
    amount: toAmount(data.amount),
    mode: data.mode || "Cash",
    referenceType: data.referenceType || "advance", // "advance" | "invoice"
    referenceId: data.referenceId || undefined,
    notes: data.notes || undefined,
  }

  return await createDocument(PAYMENTS_COLLECTION, payload)
}

export async function createPartyPaymentAllocationRows(rows) {
  // `rows` should be: [{ companyId, paymentId, invoiceId, allocatedAmount }]
  if (!rows || rows.length === 0) return []
  const payloads = rows.map((r) => ({
    companyId: r.companyId,
    paymentId: r.paymentId,
    invoiceId: r.invoiceId,
    allocatedAmount: toAmount(r.allocatedAmount),
  }))

  const results = await Promise.all(
    payloads.map((p) => createDocument(ALLOCATIONS_COLLECTION, p))
  )

  return results
}

// Optional helper if you later support payment reversals.
export async function updatePartyPayment(paymentId, data) {
  return await updateDocument(PAYMENTS_COLLECTION, paymentId, data)
}

