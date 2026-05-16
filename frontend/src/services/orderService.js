import { databases, ID, Query } from "./dbService"

const DB_ID = "billing_db"
const ORDERS_COLLECTION = "orders"

export async function listOrders(companyId) {
    const response = await databases.listDocuments(DB_ID, ORDERS_COLLECTION, [
        Query.equal("companyId", companyId),
        Query.orderDesc("$createdAt"),
        Query.limit(500)
    ])
    return response.documents || []
}

export async function getOrder(orderId) {
    return databases.getDocument(DB_ID, ORDERS_COLLECTION, orderId)
}

export async function createOrder(data) {
    return databases.createDocument(DB_ID, ORDERS_COLLECTION, ID.unique(), {
        companyId: data.companyId,
        partyId: data.partyId,
        orderNo: data.orderNo,
        title: data.title,
        jobType: data.jobType,
        jobNo: data.jobNo || null,
        status: data.status || "pending",
        orderDate: data.orderDate || new Date().toISOString().split('T')[0],
        notes: data.notes || ""
    })
}

export async function updateOrder(orderId, data) {
    return databases.updateDocument(DB_ID, ORDERS_COLLECTION, orderId, data)
}

export async function deleteOrder(orderId) {
    return databases.deleteDocument(DB_ID, ORDERS_COLLECTION, orderId)
}

export async function generateOrderNumber(companyId) {
    const response = await databases.listDocuments(DB_ID, ORDERS_COLLECTION, [
        Query.equal("companyId", companyId),
        Query.orderDesc("$createdAt"),
        Query.limit(1)
    ])
    
    let nextNum = 1
    if (response.documents.length > 0) {
        const lastOrder = response.documents[0]
        const match = lastOrder.orderNo?.match(/ORD-(\d+)/)
        if (match) {
            nextNum = parseInt(match[1], 10) + 1
        }
    }
    
    return `ORD-${String(nextNum).padStart(4, '0')}`
}

export async function linkJobToOrder(orderId, jobNo) {
    return databases.updateDocument(DB_ID, ORDERS_COLLECTION, orderId, {
        jobNo: jobNo
    })
}
