// services/designService.js
import { Query, createDocument, deleteDocument, listDocuments, updateDocument } from "./dbService"
const DESIGNERS_COLLECTION = "designers"

/* ------------------ DESIGNERS ------------------ */

// List all designers for a company
export async function listDesigners(companyId) {
    const res = await listDocuments(DESIGNERS_COLLECTION, [
        Query.equal("companyId", companyId)
    ])
    return res.documents
}

// Create a new designer
export async function createDesigner(companyId, data) {
    const res = await createDocument(DESIGNERS_COLLECTION, {
        ...data,
        companyId
    })
    return res
}

// Update designer by ID
export async function updateDesigner(companyId, designerId, data) {
    const res = await updateDocument(DESIGNERS_COLLECTION, designerId, {
        ...data,
        companyId
    })
    return res
}

// Delete designer by ID
export async function deleteDesigner(companyId, designerId) {
    const res = await deleteDocument(DESIGNERS_COLLECTION, designerId)
    return res
}
