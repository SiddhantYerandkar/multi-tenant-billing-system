import { useEffect, useState } from "react"
import { getProducts } from "../services/productService"

export default function OrderDetailsModal({ order, onClose, onCreateInvoice, onViewInvoice }) {
    const [productMap, setProductMap] = useState({})

    useEffect(() => {
        if (!order) return

        async function loadProducts() {
            const res = await getProducts(order.companyId)

            const map = {}
            res.documents.forEach(p => {
                map[p.$id] = p.name
            })

            setProductMap(map)
        }

        loadProducts()
    }, [order])

    if (!order) return null

    const grandTotal = order.items?.reduce(
        (sum, i) => sum + Number(i.totalAmount),
        0
    )
    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

            <div className="bg-white w-full max-w-4xl rounded-xl shadow-lg">

                {/* HEADER */}
                <div className="px-6 py-4 border border-[#dae5e7] flex justify-between">
                    <h2 className="text-xl font-bold">Order Details</h2>
                    <button onClick={onClose}>✕</button>
                </div>

                {/* BODY */}
                <div className="p-6 space-y-6">

                    {/* BASIC INFO */}
                    <div className="grid grid-cols-3 gap-4 text-sm">

                        <div>
                            <p className="text-gray-500">Order Date</p>
                            <p className="font-medium">
                                {new Date(order.orderDate).toLocaleDateString("en-IN")}
                            </p>
                        </div>

                        <div>
                            <p className="text-gray-500">Title</p>
                            <p className="font-medium">{order.title}</p>
                        </div>

                        <div>
                            <p className="text-gray-500">Job No</p>
                            <p className="font-medium">#{order.jobNo}</p>
                        </div>

                        <div>
                            <p className="text-gray-500">Order No</p>
                            <p className="font-medium">{order.orderNo}</p>
                        </div>

                        <div>
                            <p className="text-gray-500">Party</p>
                            <p className="font-medium">{order.partyName}</p>
                        </div>

                        <div>
                            <p className="text-gray-500">Job Type</p>
                            <p className="font-medium capitalize">{order.jobType}</p>
                        </div>

                    </div>

                    {/* ITEMS TABLE */}
                    <div className="border border-[#dae5e7] rounded-lg overflow-hidden">

                        <table className="w-full text-left">

                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-4 py-3 text-xs uppercase">Product</th>
                                    <th className="px-4 py-3 text-xs uppercase">Price</th>
                                    <th className="px-4 py-3 text-xs uppercase">Qty</th>
                                    <th className="px-4 py-3 text-xs uppercase">Total</th>
                                </tr>
                            </thead>

                            <tbody>
                                {order.items?.map((item, i) => (
                                    <tr key={i} className="border border-[#dae5e7]">

                                        <td className="px-4 py-3">
                                            {productMap[item.productId] || "Unknown"}
                                        </td>

                                        <td className="px-4 py-3">
                                            ₹{item.price}
                                        </td>

                                        <td className="px-4 py-3">
                                            {item.quantity}
                                        </td>

                                        <td className="px-4 py-3 font-medium">
                                            ₹{item.totalAmount}
                                        </td>

                                    </tr>
                                ))}
                            </tbody>

                        </table>

                    </div>

                    {/* TOTAL */}
                    <div className="flex justify-end text-lg font-bold">
                        Grand Total: ₹{grandTotal}
                    </div>

                </div>

                {/* FOOTER */}

                <div className="px-6 py-4 border border-[#dae5e7] flex justify-between">
                    {!order.invoiceId ? (
                        <button
                            type="button"
                            disabled={!onCreateInvoice}
                            onClick={() => onCreateInvoice?.(order)}
                            className="px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Create Invoice
                        </button>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={() => onViewInvoice?.(order.invoiceId)}
                                className="px-4 py-2 border border-[#dae5e7] rounded-lg"
                            >
                                View Invoice
                            </button>
                        </>
                    )}
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-[#dae5e7] rounded-lg"
                    >
                        Close
                    </button>
                </div>


            </div>
        </div>
    )
}