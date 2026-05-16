import { useEffect, useState, useMemo } from "react"
import CreateOrderModal from "../components/CreateOrderModal"
import { listOrders } from "../services/orderService"
import { getParties } from "../services/partyService"
import CreateOrderFlowModal from "../components/CreateOrderFlowModal"

const JOB_TYPE_LABELS = {
    designing: "Designing",
    printing: "Printing",
    designing_printing: "Designing & Printing",
    binding: "Binding",
    other: "Other"
}

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100]

export default function Orders({ company, onViewOrder, onCreateJob, refreshKey }) {
    const [orders, setOrders] = useState([])
    const [parties, setParties] = useState({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [showCreateOrderModal, setShowCreateOrderModal] = useState(false)
    const [search, setSearch] = useState("")

    // Filters
    const [dateFrom, setDateFrom] = useState("")
    const [dateTo, setDateTo] = useState("")
    const [filterJobType, setFilterJobType] = useState("")
    const [filterStatus, setFilterStatus] = useState("")
    const [filterCustomer, setFilterCustomer] = useState("")

    // Pagination
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)

    useEffect(() => {
        if (company?.$id) {
            loadOrders()
        }
    }, [company, refreshKey])

    async function loadOrders() {
        setLoading(true)
        setError("")
        try {
            const [ordersList, partiesRes] = await Promise.all([
                listOrders(company.$id),
                getParties(company.$id)
            ])

            setOrders(ordersList)

            const partiesMap = {}
                ; (partiesRes.documents || []).forEach(p => {
                    partiesMap[p.$id] = p
                })
            setParties(partiesMap)
        } catch (err) {
            console.error("Error loading orders:", err)
            setError("Failed to load orders. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    const filteredOrders = useMemo(() => {
        let result = orders

        // Search filter
        if (search.trim()) {
            const searchLower = search.toLowerCase()
            result = result.filter(order => {
                const partyName = parties[order.partyId]?.name || ""
                return (
                    order.orderNo?.toLowerCase().includes(searchLower) ||
                    order.jobNo?.toLowerCase().includes(searchLower) ||
                    order.title?.toLowerCase().includes(searchLower) ||
                    partyName.toLowerCase().includes(searchLower) ||
                    (JOB_TYPE_LABELS[order.jobType] || "").toLowerCase().includes(searchLower)
                )
            })
        }

        // Date range filter
        if (dateFrom) {
            result = result.filter(order => {
                const orderDate = order.orderDate || order.$createdAt?.split('T')[0]
                return orderDate >= dateFrom
            })
        }
        if (dateTo) {
            result = result.filter(order => {
                const orderDate = order.orderDate || order.$createdAt?.split('T')[0]
                return orderDate <= dateTo
            })
        }

        // Job type filter
        if (filterJobType) {
            result = result.filter(order => order.jobType === filterJobType)
        }

        // Status filter
        if (filterStatus) {
            result = result.filter(order => order.status === filterStatus)
        }

        // Customer filter
        if (filterCustomer) {
            result = result.filter(order => order.partyId === filterCustomer)
        }

        return result
    }, [orders, search, parties, dateFrom, dateTo, filterJobType, filterStatus, filterCustomer])

    // Pagination calculations
    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedOrders = filteredOrders.slice(startIndex, endIndex)

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [search, dateFrom, dateTo, filterJobType, filterStatus, filterCustomer, itemsPerPage])

    const clearFilters = () => {
        setSearch("")
        setDateFrom("")
        setDateTo("")
        setFilterJobType("")
        setFilterStatus("")
        setFilterCustomer("")
        setCurrentPage(1)
    }

    const hasActiveFilters = search || dateFrom || dateTo || filterJobType || filterStatus || filterCustomer

    if (loading) {
        return (
            <main className="flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                        <span className="material-symbols-outlined animate-spin text-4xl text-primary mb-2">
                            sync
                        </span>
                        <p className="text-gray-500">Loading orders...</p>
                    </div>
                </div>
            </main>
        )
    }

    if (error) {
        return (
            <main className="flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                        <span className="material-symbols-outlined text-4xl text-red-500 mb-2">
                            error
                        </span>
                        <p className="text-red-600">{error}</p>
                        <button
                            onClick={loadOrders}
                            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </main>
        )
    }

    return (
        <main className="flex-1 flex flex-col overflow-hidden">
            {/* HEADER */}
            <header className="bg-white border-b border-[#dae5e7] p-6">
                <div className="flex justify-between items-end gap-4">
                    <div>
                        <h2 className="text-3xl font-black tracking-tight">
                            Orders
                        </h2>
                        <p className="text-sm text-[#5e878d] font-medium">
                            Create orders first, then assign jobs to track work.
                        </p>
                    </div>

                    <button
                        onClick={() => setShowCreateOrderModal(true)}
                        className="flex items-center gap-2 h-11 px-6 rounded-lg bg-primary text-white font-bold shadow"
                    >
                        <span className="material-symbols-outlined text-lg">add</span>
                        Create Order
                    </button>
                </div>
            </header>

            {/* TOOLBAR */}
            <div className="bg-[#f0f4f5]/60 px-6 py-4 space-y-3">
                {/* Row 1: Search and Quick Actions */}
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="bg-white border border-[#dae5e7] rounded-lg relative w-full md:w-72">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#5e878d] text-lg">
                            search
                        </span>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search orders..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg bg-white text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                        />
                    </div>

                    {/* Date Range */}
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-[#dae5e7] bg-white text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                            title="From Date"
                        />
                        <span className="text-gray-400 text-sm">to</span>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-[#dae5e7] bg-white text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                            title="To Date"
                        />
                    </div>

                    {/* Job Type Filter */}
                    <select
                        value={filterJobType}
                        onChange={(e) => setFilterJobType(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-[#dae5e7] bg-white text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                    >
                        <option value="">All Job Types</option>
                        {Object.entries(JOB_TYPE_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>

                    {/* Status Filter */}
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-[#dae5e7] bg-white text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                    >
                        <option value="">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                    </select>

                    {/* Clear Filters */}
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                            <span className="material-symbols-outlined text-sm">close</span>
                            Clear Filters
                        </button>
                    )}
                </div>

                {/* Row 2: Results count and pagination controls */}
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                        Showing {filteredOrders.length === 0 ? 0 : startIndex + 1} - {Math.min(endIndex, filteredOrders.length)} of {filteredOrders.length} orders
                        {hasActiveFilters && <span className="text-primary ml-1">(filtered)</span>}
                    </span>
                    <div className="flex items-center gap-2">
                        <span className="text-gray-500">Show:</span>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => setItemsPerPage(Number(e.target.value))}
                            className="px-2 py-1 rounded border border-[#dae5e7] bg-white text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                        >
                            {ITEMS_PER_PAGE_OPTIONS.map(n => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                        <span className="text-gray-500">per page</span>
                    </div>
                </div>
            </div>

            {/* TABLE */}
            <section className="flex-1 overflow-auto p-6">
                {filteredOrders.length === 0 ? (
                    <div className="bg-white rounded-xl border border-[#dae5e7] p-12 text-center">
                        <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">
                            shopping_cart
                        </span>
                        <h3 className="text-xl font-bold text-gray-600 mb-2">
                            {search ? "No orders found" : "No Orders Yet"}
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">
                            {search ? "Try adjusting your search criteria" : "Create your first order to get started"}
                        </p>
                        {!search && (
                            <button
                                onClick={() => setShowCreateOrderModal(true)}
                                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
                            >
                                Create Order
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-[#dae5e7] overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-[#f0f4f5]/60">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold uppercase">Date</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase">Job No</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase">Order No</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase">Customer Name</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase">Title</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase">Job Type</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase text-right">Actions</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-[#f0f4f5]">
                                {paginatedOrders.map((order) => {
                                    const party = parties[order.partyId]
                                    const hasJob = order.jobNo && order.jobNo.trim() !== ""
                                    const orderDate = order.orderDate || order.$createdAt?.split('T')[0] || "-"

                                    return (
                                        <tr
                                            key={order.$id}
                                            className="hover:bg-primary/5 transition"
                                        >
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-gray-600">
                                                    {orderDate !== "-" ? new Date(orderDate).toLocaleDateString('en-IN') : "-"}
                                                </span>
                                            </td>

                                            <td className="px-6 py-4">
                                                {hasJob ? (
                                                    <span className="px-3 py-1 text-xs font-bold rounded bg-green-100 text-green-700">
                                                        {order.jobNo}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-400">Not assigned</span>
                                                )}
                                            </td>

                                            <td className="px-6 py-4">
                                                <span className="px-3 py-1 text-xs font-bold rounded bg-blue-100 text-blue-700">
                                                    {order.orderNo}
                                                </span>
                                            </td>

                                            <td className="px-6 py-4">
                                                <p className="font-bold">{party?.name || "N/A"}</p>
                                                {party?.phone && (
                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                        {party.phone}
                                                    </p>
                                                )}
                                            </td>

                                            <td className="px-6 py-4">
                                                <span className="text-sm text-gray-700 font-medium">
                                                    {order.title || "-"}
                                                </span>
                                            </td>

                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 text-xs font-medium rounded bg-purple-100 text-purple-700">
                                                    {JOB_TYPE_LABELS[order.jobType] || order.jobType || "-"}
                                                </span>
                                            </td>

                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 text-xs font-medium rounded ${order.status === "completed"
                                                    ? "bg-green-100 text-green-700"
                                                    : order.status === "in_progress"
                                                        ? "bg-yellow-100 text-yellow-700"
                                                        : "bg-gray-100 text-gray-600"
                                                    }`}>
                                                    {order.status === "completed" ? "Completed" :
                                                        order.status === "in_progress" ? "In Progress" : "Pending"}
                                                </span>
                                            </td>

                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {!hasJob && onCreateJob && (
                                                        <button
                                                            onClick={() => onCreateJob(order)}
                                                            className="px-3 py-1.5 text-xs font-bold text-white bg-primary rounded hover:bg-primary/90 transition"
                                                        >
                                                            Create Job
                                                        </button>
                                                    )}
                                                    {hasJob && onViewOrder && (
                                                        <button
                                                            onClick={() => onViewOrder(order.jobNo)}
                                                            className="text-primary text-xs font-bold hover:underline"
                                                        >
                                                            View Job
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="px-6 py-4 border-t border-[#f0f4f5] flex items-center justify-between">
                                <div className="text-sm text-gray-500">
                                    Page {currentPage} of {totalPages}
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setCurrentPage(1)}
                                        disabled={currentPage === 1}
                                        className="p-2 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                                        title="First Page"
                                    >
                                        <span className="material-symbols-outlined text-lg">first_page</span>
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                                        title="Previous Page"
                                    >
                                        <span className="material-symbols-outlined text-lg">chevron_left</span>
                                    </button>

                                    {/* Page numbers */}
                                    <div className="flex items-center gap-1 mx-2">
                                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                            let pageNum
                                            if (totalPages <= 5) {
                                                pageNum = i + 1
                                            } else if (currentPage <= 3) {
                                                pageNum = i + 1
                                            } else if (currentPage >= totalPages - 2) {
                                                pageNum = totalPages - 4 + i
                                            } else {
                                                pageNum = currentPage - 2 + i
                                            }

                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => setCurrentPage(pageNum)}
                                                    className={`w-8 h-8 rounded text-sm font-medium transition ${currentPage === pageNum
                                                        ? "bg-primary text-white"
                                                        : "hover:bg-gray-100 text-gray-600"
                                                        }`}
                                                >
                                                    {pageNum}
                                                </button>
                                            )
                                        })}
                                    </div>

                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                        className="p-2 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                                        title="Next Page"
                                    >
                                        <span className="material-symbols-outlined text-lg">chevron_right</span>
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(totalPages)}
                                        disabled={currentPage === totalPages}
                                        className="p-2 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                                        title="Last Page"
                                    >
                                        <span className="material-symbols-outlined text-lg">last_page</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </section>

            <CreateOrderFlowModal
                open={showCreateOrderModal}
                onClose={() => setShowCreateOrderModal(false)}
                company={company}
                onOrderCreated={loadOrders}
            />
        </main>
    )
}
