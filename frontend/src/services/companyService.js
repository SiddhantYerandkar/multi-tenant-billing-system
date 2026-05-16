import { databases, storage } from "./appwrite"
import { ID } from "appwrite"

const DB_ID = "billing_db"
const COMPANY_COLLECTION = "companies"
const BUCKET_ID = "company_logos"

export async function createCompany(data, logoFile, userId) {
    let logoUrl = null

    // Try uploading logo; if it fails, continue without blocking company creation.
    if (logoFile) {
        try {
            const upload = await storage.createFile(
                BUCKET_ID,
                ID.unique(),
                logoFile
            )
            // Store the view URL instead of file ID
            logoUrl = storage.getFileView(BUCKET_ID, upload.$id)
        } catch (err) {
            console.error("Logo upload failed, continuing without logo:", err)
        }
    }

    const payload = {
        ...data,
        ownerId: userId,
    }

    // Only include logo URL if upload succeeded
    if (logoUrl) {
        payload.logoUrl = logoUrl
    }

    return databases.createDocument(
        DB_ID,
        COMPANY_COLLECTION,
        ID.unique(),
        payload
    )
}

export function getCompany(companyId) {
    return databases.getDocument(DB_ID, COMPANY_COLLECTION, companyId)
}

export async function updateCompany(companyId, data, logoFile, qrCodeFile) {
    let logoUrl = null
    let qrCodeUrl = null

    // Upload new logo if provided
    if (logoFile) {
        try {
            const upload = await storage.createFile(
                BUCKET_ID,
                ID.unique(),
                logoFile
            )
            // Store the view URL instead of file ID
            logoUrl = storage.getFileView(BUCKET_ID, upload.$id)
        } catch (err) {
            console.error("Logo upload failed:", err)
        }
    }

    // Upload new QR code if provided
    if (qrCodeFile) {
        try {
            const upload = await storage.createFile(
                BUCKET_ID,
                ID.unique(),
                qrCodeFile
            )
            // Store the view URL instead of file ID
            qrCodeUrl = storage.getFileView(BUCKET_ID, upload.$id)
        } catch (err) {
            console.error("QR code upload failed:", err)
        }
    }

    const payload = { ...data }

    // Include logo URL if upload succeeded
    if (logoUrl) {
        payload.logoUrl = logoUrl
    }

    // Include QR code URL if upload succeeded
    if (qrCodeUrl) {
        payload.qrCodeUrl = qrCodeUrl
    }

    return databases.updateDocument(DB_ID, COMPANY_COLLECTION, companyId, payload)
}

// Note: Logo and QR code URLs are now stored directly in the company document
// No need for helper functions to convert IDs to URLs