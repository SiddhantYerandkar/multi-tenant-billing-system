import { databases } from "./appwrite"
import { ID, Query } from "appwrite"

const DB_ID = "billing_db"
const COLLECTION = "parties"

export async function getParties(companyId) {
    let allParties = []
    let offset = 0
    const limit = 100 // Appwrite max limit per request
    
    // Fetch all parties using pagination
    while (true) {
        const response = await databases.listDocuments(
            DB_ID, 
            COLLECTION, 
            [
                Query.equal("companyId", companyId),
                Query.equal("isActive", true),
                Query.limit(limit),
                Query.offset(offset)
            ]
        )
        
        allParties = [...allParties, ...response.documents]
        
        // If we got fewer documents than the limit, we've reached the end
        if (response.documents.length < limit) {
            break
        }
        
        offset += limit
    }
    
    return { documents: allParties }
}

export async function getAllParties(companyId) {
    let allParties = []
    let offset = 0
    const limit = 100 // Appwrite max limit per request
    
    // Fetch all parties using pagination
    while (true) {
        const response = await databases.listDocuments(
            DB_ID, 
            COLLECTION, 
            [
                Query.equal("companyId", companyId),
                Query.limit(limit),
                Query.offset(offset)
            ]
        )
        
        allParties = [...allParties, ...response.documents]
        
        // If we got fewer documents than the limit, we've reached the end
        if (response.documents.length < limit) {
            break
        }
        
        offset += limit
    }
    
    return { documents: allParties }
}

export function addParty(data) {
    return databases.createDocument(DB_ID, COLLECTION, ID.unique(), data)
}

export function deleteParty(id) {
    return databases.deleteDocument(DB_ID, COLLECTION, id)
}

export async function generatePartyCode(companyId) {
    const res = await getAllParties(companyId)
    const parties = res.documents
    
    if (parties.length === 0) {
        return "P001"
    }
    
    // Extract numeric part from existing codes (e.g., "P001" -> 1)
    const codes = parties
        .map(p => p.partyCode)
        .filter(code => code && code.match(/^P\d+$/))
        .map(code => parseInt(code.substring(1)))
    
    if (codes.length === 0) {
        return "P001"
    }
    
    const maxCode = Math.max(...codes)
    const nextCode = maxCode + 1
    return `P${String(nextCode).padStart(3, "0")}`
}

export function getParty(companyId, partyId) {
    return databases.getDocument(DB_ID, COLLECTION, partyId)
}