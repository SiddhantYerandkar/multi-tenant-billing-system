import { Query, createDocument, deleteDocument, getDocument, listDocuments } from "./dbService"
const COLLECTION = "parties"
const API_URL = import.meta.env.VITE_API_URL

function getToken() {
    return localStorage.getItem("token")
}

export async function getParties({ page = 1, limit = 20 } = {}) {
    const res = await fetch(
        `${API_URL}/parties?page=${page}&limit=${limit}`,
        {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
                "x-company-id": localStorage.getItem("companyId"),
            },
        }
    );

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.message || "Failed to fetch parties");
    }

    return data;
}

export async function getAllParties({ page = 1, limit = 20 } = {}) {
    const res = await fetch(
        `${API_URL}/parties?page=${page}&limit=${limit}`,
        {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
                "x-company-id": localStorage.getItem("companyId"),
            },
        }
    );

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.message || "Failed to fetch parties");
    }

    return data;
}

export async function addParty(data) {
    console.log("Adding party with data:", data)
    const res = await fetch(`${API_URL}/parties`, {
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${getToken()}`,
            "x-company-id": localStorage.getItem("companyId")
        },
        body: JSON.stringify(data)
    })

    const responseData = await res.json()

    if (!responseData.success) {
        throw new Error(responseData.message || "Failed to create party")
    }

    return responseData
}

export async function deleteParty(id) {
    const res = await fetch(`${API_URL}/parties/${id}`, {
        method: 'DELETE',
        headers: {
            "Authorization": `Bearer ${getToken()}`,
            "x-company-id": localStorage.getItem("companyId")
        }
    })

    const responseData = await res.json()

    if (!responseData.success) {
        throw new Error(responseData.message || "Failed to delete party")
    }

    return responseData
}

export async function generatePartyCode(companyId) {
    const res = await getAllParties(companyId)
    const parties = res.data
    console.log("Existing parties for code generation:", parties)
    if (parties.length === 0) {
        return "P001"
    }

    // Extract numeric part from existing codes (e.g., "P001" -> 1)
    const codes = parties
        .map(p => p.party_code)
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
    return getDocument(COLLECTION, partyId)
}