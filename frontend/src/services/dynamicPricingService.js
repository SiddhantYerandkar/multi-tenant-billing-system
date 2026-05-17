import { Query, createDocument, deleteDocument, listDocuments, updateDocument } from "./dbService"
const COLLECTION = "dynamic_pricing"

const API_URL = import.meta.env.VITE_API_URL

function getToken() {
    return localStorage.getItem("token")
}


/**
 * Get dynamic prices for a specific party
 */
export async function getDynamicPricesForParty(companyId, partyId) {
    const res = await fetch(
        `${API_URL}/dynamic-pricing/party/${partyId}`,
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${getToken()}`,
                "x-company-id": localStorage.getItem("companyId")
            }
        }
    )

    const data = await res.json()
    return data
}


// UPSERT price
export async function setDynamicPrice(partyId, productId, price) {
    const res = await fetch(`${API_URL}/dynamic-pricing`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
            "x-company-id": localStorage.getItem("companyId")
        },
        body: JSON.stringify({
            partyId,
            productId,
            price
        })
    })

    return res.json()
}

// DELETE price
export async function deleteDynamicPrice(partyId, productId) {
    const res = await fetch(`${API_URL}/dynamic-pricing`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
            "x-company-id": localStorage.getItem("companyId")
        },
        body: JSON.stringify({
            party_id: partyId,
            product_id: productId
        })
    })

    return res.json()
}

/**
 * Get effective price (dynamic price if exists, else basePrice)
 */
export async function getEffectivePrice(companyId, partyId, productId, basePrice) {
    const dynamicPrice = await getDynamicPrice(companyId, partyId, productId)
    return dynamicPrice ? dynamicPrice.price : basePrice
}
