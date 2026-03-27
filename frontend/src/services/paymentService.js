import { databases } from "./appwrite"
import { ID, Query } from "appwrite"

const DB_ID = "billing_db"
const COLLECTION = "payments"

export function listPaymentsForInvoice(companyId, invoiceId) {
  return databases.listDocuments(DB_ID, COLLECTION, [
    Query.equal("companyId", companyId),
    Query.equal("invoiceId", invoiceId),
    Query.orderDesc("$createdAt"),
  ])
}

export function getPaymentsByInvoice(companyId, invoiceId) {
  return listPaymentsForInvoice(companyId, invoiceId)
}

/**
 * Generate receipt number in format RCPT-YYYY-XXX
 * Format: RCPT-2024-001
 */
export function generateReceiptNumber() {
  const year = new Date().getFullYear()
  // Generate a random 3-digit number (001-999)
  const randomNum = Math.floor(Math.random() * 999) + 1
  const paddedNum = randomNum.toString().padStart(3, '0')
  return `RCPT-${year}-${paddedNum}`
}

export function createPayment(data) {
  // Auto-generate receipt number if not provided
  const paymentData = {
    ...data,
    receiptNumber: data.receiptNumber || generateReceiptNumber(),
    status: data.status || 'completed' // Default status
  }
  return databases.createDocument(DB_ID, COLLECTION, ID.unique(), paymentData)
}

/**
 * Update payment (limited fields only)
 * Only allows updating: paymentDate, reference (notes)
 * Financial fields (amount, mode, invoiceId) cannot be changed
 */
export function updatePayment(paymentId, data) {
  // Only allow updating non-financial fields
  const allowedFields = {
    paymentDate: data.paymentDate,
    reference: data.reference || ''
  }
  return databases.updateDocument(DB_ID, COLLECTION, paymentId, allowedFields)
}

/**
 * Reverse a payment
 * Creates a negative payment entry and marks original as reversed
 * 
 * @param {string} paymentId - ID of payment to reverse
 * @param {string} reason - Required reason for reversal
 * @param {object} originalPayment - Original payment document
 * @returns {Promise} - Returns both updated original and new reversal payment
 */
export async function reversePayment(paymentId, reason, originalPayment) {
  if (!reason || reason.trim() === '') {
    throw new Error('Reversal reason is required')
  }

  // Mark original payment as reversed
  const updatedOriginal = await databases.updateDocument(
    DB_ID,
    COLLECTION,
    paymentId,
    {
      status: 'reversed',
      reference: `Reversed: ${reason.trim()}`
    }
  )

  // Create negative payment entry
  const reversalPayment = await createPayment({
    companyId: originalPayment.companyId,
    invoiceId: originalPayment.invoiceId,
    partyId: originalPayment.partyId,
    amount: -(originalPayment.amount || 0), // Negative amount
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMode: originalPayment.paymentMode,
    reference: `Reversal: ${reason.trim()}`,
    status: 'reversed',
    reversedFrom: paymentId // Link to original payment
  })

  return {
    original: updatedOriginal,
    reversal: reversalPayment
  }
}

/**
 * Adjust payment amount
 * Creates a delta payment entry without modifying the original
 * 
 * @param {object} originalPayment - Original payment document
 * @param {number} newAmount - New total amount desired
 * @param {string} reason - Reason for adjustment
 * @returns {Promise} - Returns the adjustment payment
 */
export async function adjustPayment(originalPayment, newAmount, reason) {
  const originalAmount = originalPayment.amount || 0
  const adjustmentAmount = newAmount - originalAmount

  if (adjustmentAmount === 0) {
    throw new Error('No adjustment needed. Amount is the same.')
  }

  // Create adjustment payment entry
  const adjustmentPayment = await createPayment({
    companyId: originalPayment.companyId,
    invoiceId: originalPayment.invoiceId,
    partyId: originalPayment.partyId,
    amount: adjustmentAmount, // Can be positive or negative
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMode: originalPayment.paymentMode,
    reference: `Adjustment: ${reason || 'Amount correction'}`,
    status: 'adjusted',
    originalPaymentId: originalPayment.$id // Link to original
  })

  return adjustmentPayment
}