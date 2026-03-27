import { databases } from "./appwrite"
import { ID, Query } from "appwrite"

const DB_ID = "billing_db"
const COLLECTION = "products"

export function getProducts(companyId) {
    return databases.listDocuments(DB_ID, COLLECTION, [
        Query.equal("companyId", companyId),
    ])
}

export function addProduct(data) {
    return databases.createDocument(DB_ID, COLLECTION, ID.unique(), data)
}

export function updateProduct(id, data) {
    return databases.updateDocument(DB_ID, COLLECTION, id, data)
}

export function deleteProduct(id) {
    return databases.deleteDocument(DB_ID, COLLECTION, id)
}
