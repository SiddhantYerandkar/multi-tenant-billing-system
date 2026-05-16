import { Query, createDocument, deleteDocument, listDocuments, updateDocument } from "./dbService"
const COLLECTION_ID = "designing_jobs"

// ➜ Create Job
export async function createDesignJob(data) {
    return createDocument(COLLECTION_ID, data)
}

// ➜ List Jobs
export async function listDesignJobs(companyId) {
    const res = await listDocuments(
        COLLECTION_ID,
        [
            // optional filter
            Query.equal("companyId", companyId)
        ]
    )

    return res.documents
}

export async function updateDesignJob(jobId, data) {
    try {
        return await updateDocument(
            COLLECTION_ID,
            jobId,
            data
        )
    } catch (err) {
        console.error("Error updating job:", err)
        throw err
    }
}

export async function deleteDesignJob(jobId) {
    try {
        await deleteDocument(COLLECTION_ID, jobId)

        return true
    } catch (err) {
        console.error("Error deleting job:", err)
        throw err
    }
}

export async function listJobsByDesigner(companyId, designerId) {
    const res = await listDocuments(COLLECTION_ID, [
        Query.equal("companyId", companyId),
        Query.equal("designerId", designerId)
    ])
    return res.documents
}