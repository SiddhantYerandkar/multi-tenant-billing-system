import { databases } from "./appwrite"
import { Query } from "appwrite"
import { listOrders } from "./orderService"

const DB_ID = "billing_db"
const SUPPLIER_JOBS_COLLECTION = "supplier_jobs"
const INVOICES_COLLECTION = "invoices"
const PARTIES_COLLECTION = "parties"
const PURCHASES_COLLECTION = "purchases"
const EXPENSES_COLLECTION = "expenses"
const SUPPLIER_PAYMENTS_COLLECTION = "supplier_payments"

/**
 * Get all supplier jobs grouped by jobNo
 */
export async function getJobsGroupedByJobNo(companyId) {
  let allJobs = []
  let offset = 0
  const limit = 100

  // Fetch all supplier jobs
  while (true) {
    const response = await databases.listDocuments(
      DB_ID,
      SUPPLIER_JOBS_COLLECTION,
      [
        Query.equal("companyId", companyId),
        Query.orderDesc("jobDate"),
        Query.limit(limit),
        Query.offset(offset)
      ]
    )

    allJobs = [...allJobs, ...response.documents]

    if (response.documents.length < limit) {
      break
    }

    offset += limit
  }

  // Group by jobNo
  const grouped = {}
  allJobs.forEach(job => {
    const jobNo = job.jobNo
    if (!jobNo) return

    if (!grouped[jobNo]) {
      grouped[jobNo] = []
    }
    grouped[jobNo].push(job)
  })

  return grouped
}

/**
 * Get all jobs with party and invoice data
 */
export async function getJobsWithDetails(companyId) {
  // Get all supplier jobs
  const jobsRes = await getJobsGroupedByJobNo(companyId)
  const jobsByJobNo = jobsRes

  // Get unique jobNos
  const jobNos = Object.keys(jobsByJobNo)

  if (jobNos.length === 0) {
    return []
  }

  // Get all parties
  const { getParties } = await import("./partyService")
  const partiesRes = await getParties(companyId)
  const parties = partiesRes.documents || []
  const partyMap = {}
  parties.forEach(p => (partyMap[p.$id] = p))

  // Get all invoices
  const { listInvoices } = await import("./invoiceService")
  const invoicesRes = await listInvoices(companyId)
  const invoices = invoicesRes.documents || []
  const invoiceMap = {}
  invoices.forEach(inv => (invoiceMap[inv.$id] = inv))

  const orders = await listOrders(companyId)

  const orderMap = {}
  orders.forEach(o => (orderMap[o.$id] = o))

  // Build job summaries
  const jobSummaries = []

  for (const jobNo of jobNos) {
    const supplierJobs = jobsByJobNo[jobNo]
    if (!supplierJobs || supplierJobs.length === 0) continue

    // Get partyId from first job or from linked invoice
    const firstJob = supplierJobs[0]
    let partyId = firstJob.partyId || null

    // Find linked invoice (check if any job has invoiceId)
    let linkedInvoice = null
    let orderId = null
    let linkedOrder = null

    for (const job of supplierJobs) {
      // ✅ check invoice
      if (!linkedInvoice && job.invoiceId) {
        linkedInvoice = invoiceMap[job.invoiceId]
        if (linkedInvoice && !partyId) {
          partyId = linkedInvoice.partyId
        }
      }

      // ✅ check order
      if (!orderId && job.orderId) {
        orderId = job.orderId
        linkedOrder = orderMap[orderId]
      }
    }

    const party = partyId ? partyMap[partyId] : null

    // Calculate totals
    const totalJobCost = supplierJobs.reduce((sum, job) => sum + (job.invoiceAmount || job.cost || 0), 0)
    const invoiceAmount = linkedInvoice ? (linkedInvoice.grandTotal || 0) : 0

    // Get status (if all completed, mark as completed, else pending)
    const allCompleted = supplierJobs.every(job => job.status === "paid" || job.status === "completed")
    const status = allCompleted ? "completed" : supplierJobs.some(job => job.status === "billed") ? "billed" : "pending"

    // ✅ Extract size & pages
    const sizes = [
      ...new Set(supplierJobs.map(j => j.size).filter(Boolean))
    ]

    const totalPages = supplierJobs.reduce(
      (sum, j) => sum + (j.pages ? Number(j.pages) : 0),
      0
    )

    const jobDate = supplierJobs.reduce((oldest, job) => {
      const date = job.jobDate || job.$createdAt
      return !oldest || (date && new Date(date) < new Date(oldest))
        ? date
        : oldest
    }, null)

    jobSummaries.push({
      jobNo,
      jobDate,
      partyId: partyId || null,
      party: party || null,
      invoiceId: linkedInvoice?.$id || null,
      invoice: linkedInvoice || null,
      order: linkedOrder || null,
      supplierJobs,
      totalJobCost,
      invoiceAmount,
      status,
      size: sizes.join(", "),     // ✅ ADD THIS
      pages: totalPages,
      oldestJobDate: supplierJobs.reduce((oldest, job) => {
        const jobDate = job.jobDate || job.$createdAt
        return !oldest || (jobDate && new Date(jobDate) < new Date(oldest)) ? jobDate : oldest
      }, null)
    })
  }

  return jobSummaries.sort((a, b) => {
    // Sort by oldest job date DESC
    const dateA = a.oldestJobDate ? new Date(a.oldestJobDate).getTime() : 0
    const dateB = b.oldestJobDate ? new Date(b.oldestJobDate).getTime() : 0
    return dateB - dateA
  })
}

/**
 * Get job details by jobNo
 */
export async function getJobDetails(companyId, jobNo) {
  // Get all supplier jobs for this jobNo
  let allJobs = []
  let offset = 0
  const limit = 100

  while (true) {
    const response = await databases.listDocuments(
      DB_ID,
      SUPPLIER_JOBS_COLLECTION,
      [
        Query.equal("companyId", companyId),
        Query.equal("jobNo", jobNo),
        Query.orderAsc("jobDate"),
        Query.limit(limit),
        Query.offset(offset)
      ]
    )

    allJobs = [...allJobs, ...response.documents]

    if (response.documents.length < limit) {
      break
    }

    offset += limit
  }

  if (allJobs.length === 0) {
    return null
  }

  // Get party and invoice - check ALL jobs for invoiceId, not just first
  const firstJob = allJobs[0]
  let partyId = firstJob.partyId || null

  // Find invoiceId from any job in this group
  let invoiceId = null
  for (const job of allJobs) {
    if (job.invoiceId) {
      invoiceId = job.invoiceId
      if (!partyId && job.partyId) {
        partyId = job.partyId
      }
      break
    }
  }

  // Get invoice if linked
  let invoice = null
  if (invoiceId) {
    const { getInvoice } = await import("./invoiceService")
    try {
      invoice = await getInvoice(companyId, invoiceId)
      // Get partyId from invoice if not on job
      if (invoice && !partyId) {
        partyId = invoice.partyId
      }
    } catch (err) {
      console.error("Error fetching invoice:", err)
    }
  }

  let party = null
  if (partyId) {
    const { getParty } = await import("./partyService")
    try {
      party = await getParty(companyId, partyId)
    } catch (err) {
      console.error("Error fetching party:", err)
    }
  }

  // Get suppliers for these jobs
  const supplierIds = [...new Set(allJobs.map(job => job.supplierId).filter(Boolean))]
  const suppliers = []
  for (const supplierId of supplierIds) {
    try {
      const { getSupplier } = await import("./supplierService")
      const supplier = await getSupplier(companyId, supplierId)
      suppliers.push(supplier)
    } catch (err) {
      console.error("Error fetching supplier:", err)
    }
  }
  const supplierMap = {}
  suppliers.forEach(s => (supplierMap[s.$id] = s))

  // Get purchases linked to this job (by jobNo or invoiceId)
  // Fetch regardless of whether invoice exists
  let purchases = []
  try {
    const allPurchasesRes = await databases.listDocuments(
      DB_ID,
      PURCHASES_COLLECTION,
      [
        Query.equal("companyId", companyId),
        Query.limit(500)
      ]
    )
    purchases = (allPurchasesRes.documents || []).filter(p =>
      p.jobNo === jobNo || (invoice?.$id && p.invoiceId === invoice.$id)
    )
  } catch (err) {
    console.error("Error fetching purchases:", err)
  }

  // Get expenses linked to this job (by jobNo or invoiceId)
  let expenses = []
  try {
    const allExpensesRes = await databases.listDocuments(
      DB_ID,
      EXPENSES_COLLECTION,
      [
        Query.equal("companyId", companyId),
        Query.limit(500)
      ]
    )
    expenses = (allExpensesRes.documents || []).filter(e =>
      e.jobNo === jobNo || (invoice?.$id && e.invoiceId === invoice.$id)
    )
  } catch (err) {
    console.error("Error fetching expenses:", err)
  }

  // Get supplier payments for these jobs
  let payments = []
  for (const job of allJobs) {
    if (job.supplierId) {
      try {
        const { getPaymentsForSupplier } = await import("./supplierPaymentService")
        const jobPayments = await getPaymentsForSupplier(companyId, job.supplierId)
        // Filter payments linked to this job
        const linkedPayments = jobPayments.filter(p =>
          p.referenceType === "job" && p.referenceId === job.$id
        )
        payments = [...payments, ...linkedPayments]
      } catch (err) {
        console.error("Error fetching payments:", err)
      }
    }
  }

  return {
    jobNo,
    party,
    invoice,
    supplierJobs: allJobs.map(job => ({
      ...job,
      supplier: supplierMap[job.supplierId] || null
    })),
    purchases,
    expenses,
    payments
  }
}
