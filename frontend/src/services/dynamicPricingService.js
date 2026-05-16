import { databases } from "./appwrite"
import { ID, Query } from "appwrite"

const DB_ID = "billing_db"
const COLLECTION = "dynamic_pricing"

/**
 * Get all dynamic prices for a company
 */
export function getDynamicPrices(companyId) {
    return databases.listDocuments(DB_ID, COLLECTION, [
        Query.equal("companyId", companyId),
    ])
}

/**
 * Get dynamic prices for a specific party
 */
export function getDynamicPricesForParty(companyId, partyId) {
    return databases.listDocuments(DB_ID, COLLECTION, [
        Query.equal("companyId", companyId),
        Query.equal("partyId", partyId),
    ])
}

/**
 * Get dynamic price for a specific party-product combination
 */
export async function getDynamicPrice(companyId, partyId, productId) {
    try {
        const res = await databases.listDocuments(DB_ID, COLLECTION, [
            Query.equal("companyId", companyId),
            Query.equal("partyId", partyId),
            Query.equal("productId", productId),
        ])
        
        if (res.total > 0) {
            return res.documents[0]
        }
        return null
    } catch (error) {
        console.error("Error getting dynamic price:", error)
        return null
    }
}

/**
 * Set or update dynamic price for a party-product combination
 */
export async function setDynamicPrice(companyId, partyId, productId, price) {
    // Check if price already exists
    const existing = await getDynamicPrice(companyId, partyId, productId)
    
    if (existing) {
        // Update existing
        return databases.updateDocument(
            DB_ID,
            COLLECTION,
            existing.$id,
            { price: Number(price) }
        )
    } else {
        // Create new
        return databases.createDocument(DB_ID, COLLECTION, ID.unique(), {
            companyId,
            partyId,
            productId,
            price: Number(price),
        })
    }
}

/**
 * Delete dynamic price for a party-product combination
 */
export async function deleteDynamicPrice(companyId, partyId, productId) {
    const existing = await getDynamicPrice(companyId, partyId, productId)
    
    if (existing) {
        return databases.deleteDocument(DB_ID, COLLECTION, existing.$id)
    }
    
    return Promise.resolve()
}

/**
 * Get effective price (dynamic price if exists, else basePrice)
 */
export async function getEffectivePrice(companyId, partyId, productId, basePrice) {
    const dynamicPrice = await getDynamicPrice(companyId, partyId, productId)
    return dynamicPrice ? dynamicPrice.price : basePrice
}
