import { useState, useEffect, useMemo } from "react"
import { createOrder, getOrderDetails, listOrders } from "../services/orderService"
import OrderDetailsModal from "../components/OrderDetailsModal"
import { getParties } from "../services/partyService"
import CreateOrderModal from "../components/CreateOrderModal"

export default function Orders({ company, onStartInvoiceFromOrder, onViewInvoiceFromOrder }) {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [openModal, setOpenModal] = useState(false)

    const [partyMap, setPartyMap] = useState({})
    const [selectedOrder, setSelectedOrder] = useState(null)

    // 🔍 filters
    const [search, setSearch] = useState("")
    const [jobTypeFilter, setJobTypeFilter] = useState("")
    const [dateFrom, setDateFrom] = useState("")
    const [dateTo, setDateTo] = useState("")

    // 📄 pagination
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)

    async function load() {
        setLoading(true)

        try {
            const [ordersRes, partiesRes] = await Promise.all([
                listOrders(company.$id),
                getParties(company.$id)
            ])

            // party map
            const map = {}
            partiesRes.documents.forEach(p => {
                map[p.$id] = p.name
            })
            setPartyMap(map)

            const mapped = ordersRes.map((doc, index) => ({
                id: doc.$id,
                srNo: index + 1,
                orderDate: doc.orderDate,
                jobNo: doc.jobNo,
                orderNo: doc.orderNo,
                partyId: doc.partyId,
                partyName: map[doc.partyId] || "Unknown",
                jobType: doc.jobType,
                title: doc.title,
            }))

            setOrders(mapped)

        } catch (err) {
            console.error(err)
        }

        setLoading(false)
    }

    const handleCreate = async (data) => {
        await createOrder(
            { ...data, companyId: company.$id },
            data.items // ✅ FIX HERE
        )
        load()
    }
    useEffect(() => {
        if (company?.$id) load()
    }, [company])

    /* =========================
       FILTERING
    ========================= */
    const filteredOrders = useMemo(() => {
        let result = orders

        if (search.trim()) {
            const s = search.toLowerCase()
            result = result.filter(o =>
                o.orderNo?.toLowerCase().includes(s) ||
                o.partyName?.toLowerCase().includes(s) ||
                o.jobNo?.toString().includes(s)
            )
        }

        if (jobTypeFilter) {
            result = result.filter(o => o.jobType === jobTypeFilter)
        }

        if (dateFrom) {
            result = result.filter(o => o.orderDate >= dateFrom)
        }

        if (dateTo) {
            result = result.filter(o => o.orderDate <= dateTo)
        }

        return result
    }, [orders, search, jobTypeFilter, dateFrom, dateTo])

    /* =========================
       PAGINATION
    ========================= */
    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginated = filteredOrders.slice(startIndex, endIndex)

    useEffect(() => {
        setCurrentPage(1)
    }, [search, jobTypeFilter, dateFrom, dateTo, itemsPerPage])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <span className="material-symbols-outlined animate-spin text-4xl text-primary">
                    sync
                </span>
            </div>
        )
    }

    return (
        <main className="flex-1 flex flex-col overflow-hidden">

            {/* HEADER */}
            <header className="bg-white border-b border-[#dae5e7] p-6">
                <div className="flex justify-between items-end" >
                    <div>
                        <h2 className="text-3xl font-black">Orders</h2>
                        <p className="text-sm text-[#5e878d]">
                            All confirmed orders
                        </p>
                    </div>

                    <div>
                        <button
                            onClick={() => setOpenModal(true)}
                            className="px-6 h-11 bg-primary text-white rounded-lg font-bold"
                        >
                            Add Order
                        </button>
                    </div>
                </div>
            </header>

            {/* TOOLBAR */}
            <div className="bg-[#f0f4f5]/60 px-6 py-4 space-y-3">

                {/* Row 1 */}
                <div className="flex flex-wrap gap-3 items-center">

                    {/* SEARCH */}
                    <div className="bg-white border border-[#dae5e7] rounded-lg relative w-full md:w-72">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#5e878d] text-lg">
                            search
                        </span>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search orders..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                        />
                    </div>

                    {/* DATE */}
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-[#dae5e7] text-sm"
                        />
                        <span className="text-gray-400 text-sm">to</span>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-[#dae5e7] text-sm"
                        />
                    </div>

                    {/* JOB TYPE */}
                    <select
                        value={jobTypeFilter}
                        onChange={(e) => setJobTypeFilter(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-[#dae5e7] text-sm"
                    >
                        <option value="">All Types</option>
                        <option value="designing">Designing</option>
                        <option value="printing">Printing</option>
                    </select>

                    {/* CLEAR */}
                    {(search || jobTypeFilter || dateFrom || dateTo) && (
                        <button
                            onClick={() => {
                                setSearch("")
                                setJobTypeFilter("")
                                setDateFrom("")
                                setDateTo("")
                            }}
                            className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                        >
                            <span className="material-symbols-outlined text-sm">close</span>
                            Clear
                        </button>
                    )}
                </div>

                {/* Row 2 */}
                <div className="flex justify-between text-sm">
                    <span className="text-gray-500">
                        Showing {filteredOrders.length === 0 ? 0 : startIndex + 1} - {Math.min(endIndex, filteredOrders.length)} of {filteredOrders.length}
                    </span>

                    <select
                        value={itemsPerPage}
                        onChange={(e) => setItemsPerPage(Number(e.target.value))}
                        className="px-2 py-1 border rounded"
                    >
                        {[10, 25, 50].map(n => (
                            <option key={n} value={n}>{n}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* TABLE */}
            <section className="flex-1 overflow-auto p-6">
                {filteredOrders.length === 0 ? (
                    <div className="bg-white p-10 text-center border border-[#dae5e7] rounded-xl">
                        <p className="text-gray-500">No orders found</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-[#dae5e7] overflow-hidden">

                        <table className="w-full text-left">

                            <thead className="bg-[#f0f4f5]/60">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold uppercase">Date</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase">Job No</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase">Order No</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase">Party</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase">Job Type</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase">Actions</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-[#f0f4f5]">
                                {paginated.map(o => (
                                    <tr key={o.id} className="hover:bg-primary/5">

                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {new Date(o.orderDate).toLocaleDateString("en-IN")}
                                        </td>

                                        <td className="px-6 py-4 font-medium">
                                            #{o.jobNo}
                                        </td>

                                        <td className="px-6 py-4">
                                            <span className="px-3 py-1 text-xs font-bold rounded bg-blue-100 text-blue-700">
                                                {o.orderNo}
                                            </span>
                                        </td>

                                        <td className="px-6 py-4 font-semibold">
                                            {o.partyName}
                                        </td>

                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs rounded font-medium ${o.jobType === "designing"
                                                ? "bg-purple-100 text-purple-700"
                                                : "bg-green-100 text-green-700"
                                                }`}>
                                                {o.jobType}
                                            </span>
                                        </td>

                                        <td className="px-6 py-4">
                                            <button
                                                onClick={async () => {
                                                    const full = await getOrderDetails(o.id)
                                                    setSelectedOrder({
                                                        ...full,
                                                        partyName: o.partyName
                                                    })
                                                }}
                                                className="text-primary font-medium hover:underline"
                                            >
                                                View Details
                                            </button>
                                        </td>

                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* PAGINATION */}
                        {totalPages > 1 && (
                            <div className="px-6 py-4 border-t flex justify-between">
                                <span>Page {currentPage} of {totalPages}</span>
                                <div className="flex gap-2">
                                    <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>Prev</button>
                                    <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>Next</button>
                                </div>
                            </div>
                        )}

                    </div>
                )}
            </section>

            <OrderDetailsModal
                order={selectedOrder}
                onClose={() => setSelectedOrder(null)}
                onCreateInvoice={
                    onStartInvoiceFromOrder
                        ? (order) => {
                            onStartInvoiceFromOrder({
                                orderId: order.$id,
                                partyId: order.partyId,
                                partyName: order.partyName,
                                orderDate: order.orderDate,
                                items: order.items || [],
                                title: order.title
                            })
                            setSelectedOrder(null)
                        }
                        : undefined
                }
                onViewInvoice={
                    onViewInvoiceFromOrder
                        ? (invoiceId) => {
                            onViewInvoiceFromOrder(invoiceId)
                            setSelectedOrder(null)
                        }
                        : undefined
                }
            />

            <CreateOrderModal
                open={openModal}
                onClose={() => setOpenModal(false)}
                onCreate={handleCreate}
                parties={Object.entries(partyMap).map(([id, name]) => ({ $id: id, name }))}
                company={company}
            />

        </main>
    )
}