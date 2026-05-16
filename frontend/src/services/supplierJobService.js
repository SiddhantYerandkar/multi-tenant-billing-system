import { databases } from "./appwrite"
import { ID, Query } from "appwrite"

const DB_ID = "billing_db"
const COLLECTION = "supplier_jobs"

/**
 * Get all jobs for a supplier
 */
export async function getJobsForSupplier(companyId, supplierId) {
  let allJobs = []
  let offset = 0
  const limit = 100

  while (true) {
    const response = await databases.listDocuments(
      DB_ID,
      COLLECTION,
      [
        Query.equal("companyId", companyId),
        Query.equal("supplierId", supplierId),
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

  return allJobs
}

/**
 * Get a single job by ID
 */
export function getJob(jobId) {
  return databases.getDocument(DB_ID, COLLECTION, jobId)
}

/**
 * Create a new job
 */
export function createJob(data) {
  return databases.createDocument(DB_ID, COLLECTION, ID.unique(), data)
}

/**
 * Update job
 */
export function updateJob(jobId, data) {
  return databases.updateDocument(DB_ID, COLLECTION, jobId, data)
}

/**
 * Delete job (only if no payments linked)
 */
export async function deleteJob(jobId, companyId) {
  // Check if any payments are linked to this job
  const { databases: db } = await import("./appwrite")
  const paymentsRes = await db.listDocuments(
    DB_ID,
    "supplier_payments",
    [
      Query.equal("companyId", companyId),
      Query.equal("referenceType", "job"),
      Query.equal("referenceId", jobId),
      Query.equal("reversed", false)
    ]
  )

  if (paymentsRes.total > 0) {
    throw new Error("Cannot delete job with linked payments. Reverse payments first.")
  }

  return databases.deleteDocument(DB_ID, COLLECTION, jobId)
}

/**
 * Generate job number (JOB-YYYY-XXX)
 */
export async function generateJobNumber(companyId, supplierId) {
  const year = new Date().getFullYear()
  const jobs = await getJobsForSupplier(companyId, supplierId)
  
  // Filter jobs from current year
  const currentYearJobs = jobs.filter(job => {
    if (!job.jobDate) return false
    const jobYear = new Date(job.jobDate).getFullYear()
    return jobYear === year
  })

  const nextNum = currentYearJobs.length + 1
  return `JOB-${year}-${String(nextNum).padStart(3, "0")}`
}
