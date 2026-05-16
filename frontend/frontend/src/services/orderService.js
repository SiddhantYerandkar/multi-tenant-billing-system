import { Query, createDocument, deleteDocument, getDocument, listDocuments, updateDocument } from "./dbService"
const ORDERS_COLLECTION = "orders"
const ORDER_ITEMS_COLLECTION = "order_items"

/* ================================
   📦 CREATE ORDER
================================ */
export async function createOrder(orderData, items = []) {
    try {
        /* ---------------- GET NEXT JOB NO ---------------- */
        const lastOrderRes = await listDocuments(
            ORDERS_COLLECTION,
            [
                Query.equal("companyId", orderData.companyId),
                Query.orderDesc("jobNo"),
                Query.limit(1)
            ]
        )

        let nextJobNo = 1

        if (lastOrderRes.documents.length > 0) {
            nextJobNo = Number(lastOrderRes.documents[0].jobNo) + 1
        }

        // ✅ convert to string
        const jobNoString = String(nextJobNo)

        /* ---------------- CREATE ORDER ---------------- */
        const order = await createDocument(
            ORDERS_COLLECTION,
            {
                companyId: orderData.companyId,
                orderDate: orderData.orderDate,
                jobNo: jobNoString,
                orderNo: orderData.orderNo || "",
                partyId: orderData.partyId,
                jobType: orderData.jobType,
                title: orderData.title
            }
        )

        /* ---------------- CREATE ITEMS ---------------- */
        const itemPromises = items.map(item =>
            createDocument(
                ORDER_ITEMS_COLLECTION,
                {
                    orderId: order.$id,
                    productId: item.productId,
                    price: Number(item.price),
                    quantity: Number(item.quantity),
                    totalAmount: Number(item.price) * Number(item.quantity)
                }
            )
        )

        await Promise.all(itemPromises)

        return order

    } catch (error) {
        console.error("Error creating order:", error)
        throw error
    }
}

/* ================================
   📋 LIST ORDERS
================================ */
export async function listOrders(companyId) {
    try {
        let allOrders = []
        let offset = 0
        const limit = 100

        while (true) {
            const res = await listDocuments(
                ORDERS_COLLECTION,
                [
                    Query.equal("companyId", companyId),
                    Query.orderDesc("jobNo"),
                    Query.limit(limit),
                    Query.offset(offset)
                ]
            )

            allOrders = [...allOrders, ...res.documents]

            if (res.documents.length < limit) break
            offset += limit
        }

        return allOrders

    } catch (error) {
        console.error("Error fetching orders:", error)
        throw error
    }
}

/* ================================
   🔍 GET ORDER WITH ITEMS
================================ */
export async function getOrderDetails(orderId) {
    try {
        const order = await getDocument(
            ORDERS_COLLECTION,
            orderId
        )

        let allItems = []
        let offset = 0
        const limit = 100

        while (true) {
            const res = await listDocuments(
                ORDER_ITEMS_COLLECTION,
                [
                    Query.equal("orderId", orderId),
                    Query.limit(limit),
                    Query.offset(offset)
                ]
            )

            allItems = [...allItems, ...res.documents]

            if (res.documents.length < limit) break
            offset += limit
        }

        return {
            ...order,
            items: allItems
        }

    } catch (error) {
        console.error("Error fetching order details:", error)
        throw error
    }
}

/* ================================
   ❌ DELETE ORDER
================================ */
export async function updateOrder(orderId, data) {
    return await updateDocument(ORDERS_COLLECTION, orderId, data)
}

export async function updateOrderInvoiceId(orderId, invoiceId) {
    return await updateDocument(ORDERS_COLLECTION, orderId, { invoiceId })
}

export async function deleteOrder(orderId) {
    try {
        // delete items
        const items = await listDocuments(
            ORDER_ITEMS_COLLECTION,
            [Query.equal("orderId", orderId)]
        )

        await Promise.all(
            items.documents.map(item =>
                deleteDocument(ORDER_ITEMS_COLLECTION, item.$id)
            )
        )

        // delete order
        await deleteDocument(ORDERS_COLLECTION, orderId)

        return true

    } catch (error) {
        console.error("Error deleting order:", error)
        throw error
    }
}