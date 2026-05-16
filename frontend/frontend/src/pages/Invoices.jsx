import { useCallback, useEffect, useMemo, useState } from "react"
import {
    createInvoice,
    getInvoices,
    updateInvoice,
} from "../services/invoiceService"
import { updateOrderInvoiceId } from "../services/orderService"
import { getParties } from "../services/partyService"
import InvoiceModal from "../components/InvoiceModal"
import { exportToXLSX } from "../utils/exportUtils"
import * as XLSX from "xlsx"

export default function Invoices({
    company,
    draftFromOrder,
    onDraftConsumed,
    viewInvoiceIdFromOrder,
    onViewInvoiceConsumed,
}) {
    const [invoices, setInvoices] = useState([])
    const [partyMap, setPartyMap] = useState({})
    const [loading, setLoading] = useState(true)
    const [openModal, setOpenModal] = useState(false)
    const [modalDraft, setModalDraft] = useState(null)
    const [viewInvoice, setViewInvoice] = useState(null)

    const [search, setSearch] = useState("")
    const [fromDate, setFromDate] = useState("")
    const [toDate, setToDate] = useState("")
    const [statusFilter, setStatusFilter] = useState("")

    // Pagination (match Parties page style)
    const itemsPerPage = 4
    const [currentPage, setCurrentPage] = useState(1)

    // UI toggles
    const [isFilterOpen, setIsFilterOpen] = useState(false)

    const loadInvoices = useCallback(async () => {
        if (!company?.$id) return
        setLoading(true)
        try {
            const [res, partiesRes] = await Promise.all([
                getInvoices(company.$id),
                getParties(company.$id),
            ])
            const map = {}
                ; (partiesRes.documents || []).forEach((p) => {
                    map[p.$id] = p.name
                })
            setPartyMap(map)
            setInvoices(res.documents || [])
        } finally {
            setLoading(false)
        }
    }, [company])

    useEffect(() => {
        loadInvoices()
    }, [loadInvoices])

    useEffect(() => {
        if (!draftFromOrder) return
        setModalDraft({
            orderId: draftFromOrder.orderId,
            partyId: draftFromOrder.partyId,
            partyName: draftFromOrder.partyName,
            orderDate: draftFromOrder.orderDate,
            items: draftFromOrder.items || [],
            title: draftFromOrder.title || "",
        })
        setViewInvoice(null)
        setOpenModal(true)
        onDraftConsumed?.()
    }, [draftFromOrder, onDraftConsumed])

    useEffect(() => {
        if (!viewInvoiceIdFromOrder || invoices.length === 0) return
        const target = invoices.find((inv) => inv.$id === viewInvoiceIdFromOrder)
        if (!target) return

        setModalDraft(null)
        setViewInvoice(target)
        setOpenModal(true)
        onViewInvoiceConsumed?.()
    }, [viewInvoiceIdFromOrder, invoices, onViewInvoiceConsumed])

    const rows = useMemo(() => {
        return invoices
            .map((inv) => ({
                ...inv,
                displayParty: partyMap[inv.partyId] || "—",
            }))
            .filter((inv) => {
                const searchMatch =
                    !search ||
                    inv.invoiceNo?.toString().toLowerCase().includes(search.toLowerCase()) ||
                    inv.displayParty?.toLowerCase().includes(search.toLowerCase())

                const statusMatch =
                    !statusFilter ||
                    (inv.status || "unpaid").toLowerCase() === statusFilter.toLowerCase()

                let dateMatch = true
                if (fromDate) {
                    dateMatch =
                        dateMatch &&
                        new Date(inv.date) >= new Date(fromDate)
                }
                if (toDate) {
                    const to = new Date(toDate)
                    to.setHours(23, 59, 59, 999)
                    dateMatch =
                        dateMatch &&
                        new Date(inv.date) <= to
                }

                return searchMatch && statusMatch && dateMatch
            })
    }, [invoices, partyMap, search, statusFilter, fromDate, toDate])

    useEffect(() => {
        setCurrentPage(1)
    }, [search, statusFilter, fromDate, toDate])

    const totalPages = Math.ceil(rows.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedRows = rows.slice(startIndex, endIndex)

    const startEntry = rows.length === 0 ? 0 : startIndex + 1
    const endEntry = Math.min(endIndex, rows.length)

    const handlePreviousPage = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1)
    }

    const handleNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(currentPage + 1)
    }

    const getPageNumbers = () => {
        const pages = []
        const maxVisiblePages = 5

        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) pages.push(i)
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= 4; i++) pages.push(i)
                pages.push("...")
                pages.push(totalPages)
            } else if (currentPage >= totalPages - 2) {
                pages.push(1)
                pages.push("...")
                for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i)
            } else {
                pages.push(1)
                pages.push("...")
                for (let i = currentPage - 1; i <= currentPage + 1; i++)
                    pages.push(i)
                pages.push("...")
                pages.push(totalPages)
            }
        }

        return pages
    }

    const getStatusBadge = (status) => {
        switch (status) {
            case "paid":
                return "bg-green-100 text-green-600"
            case "partial":
                return "bg-blue-100 text-blue-600"
            case "cancelled":
                return "bg-gray-100 text-gray-600"
            default:
                return "bg-yellow-100 text-yellow-600"
        }
    }

    const handleCreate = async (data) => {
        const inv = await createInvoice({ ...data, companyId: company.$id })
        if (data.orderId) {
            await updateOrderInvoiceId(data.orderId, inv.$id)
        }
        await loadInvoices()
    }

    const handleExport = () => {
        if (!rows || rows.length === 0) {
            alert("No data to export")
            return
        }

        const formatted = rows.map((inv, index) => ({
            "Sr No": index + 1,
            "Invoice No": inv.invoiceNo,
            "Company Id": inv.companyId,
            "Party Id": inv.partyId,
            "Order Id": inv.orderId || "",
            "Items": JSON.stringify(inv.items || []),
            "Total Amount": inv.totalAmount ?? 0,
            "Paid Amount": inv.paidAmount ?? 0,
            "Status": inv.status || "unpaid",
            "Date": inv.date || "",
            "Created At": inv.created_at || "",
        }))

        exportToXLSX(
            formatted,
            `Invoices_${new Date().toISOString().split("T")[0]}`,
            "Invoices"
        )
    }

    const normalizeHeader = (v) =>
        String(v ?? "")
            .toLowerCase()
            .replace(/[\s_]+/g, "")
            .replace(/[^a-z0-9]/g, "")

    const getCellByHeaders = (row, expectedLabels) => {
        const keys = Object.keys(row || {})
        const expected = expectedLabels.map(normalizeHeader)

        for (const key of keys) {
            const nk = normalizeHeader(key)
            if (expected.includes(nk)) return row?.[key]
        }

        return ""
    }


    const handleCancelInvoice = async (inv) => {
        if (!inv?.$id) return
        if (String(inv.status || "").toLowerCase() === "cancelled") return

        const ok = window.confirm(`Cancel invoice #${inv.invoiceNo}?`)
        if (!ok) return

        await updateInvoice(inv.$id, {
            companyId: company.$id,
            invoiceNo: inv.invoiceNo,
            date: inv.date,
            partyId: inv.partyId,
            orderId: inv.orderId,
            items: inv.items,
            totalAmount: inv.totalAmount,
            paidAmount: inv.paidAmount,
            status: "cancelled",
        })
        await loadInvoices()
    }

    const closeModal = () => {
        setOpenModal(false)
        setModalDraft(null)
        setViewInvoice(null)
    }

    return (
        <main className="flex-1 flex flex-col overflow-hidden">
            <header className="bg-white border-b border-[#dae5e7] p-6 flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold">Invoices</h1>
                    <p className="text-sm text-gray-500">
                        Manage and track all invoices
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => {
                        setViewInvoice(null)
                        setModalDraft(null)
                        setOpenModal(true)
                    }}
                    className="px-4 py-2 bg-primary text-white rounded-lg font-semibold"
                >
                    + Create Invoice
                </button>
            </header>

            <div className="bg-white px-6 py-4 flex flex-col md:flex-row gap-4 justify-between border-b border-[#dae5e7]">
                <div className="relative w-full md:w-96">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#5e878d]">
                        search
                    </span>
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by invoice no or party…"
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#f0f4f5] text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                    />
                </div>

                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => setIsFilterOpen((v) => !v)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#dae5e7] bg-white text-sm font-semibold"
                    >
                        <span className="material-symbols-outlined">filter_list</span>
                        Filter
                    </button>

                    <button
                        type="button"
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#dae5e7] bg-white text-sm font-semibold"
                    >
                        <span className="material-symbols-outlined">file_download</span>
                        Export
                    </button>
                </div>
            </div>

            {isFilterOpen ? (
                <div className="bg-white px-6 pb-4 flex flex-wrap gap-4 items-end border-b border-[#dae5e7]">
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-[#dae5e7] text-sm bg-white"
                        />
                        <span className="text-gray-400 text-sm">to</span>
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-[#dae5e7] text-sm bg-white"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-[#dae5e7] text-sm bg-white"
                    >
                        <option value="">All statuses</option>
                        <option value="paid">Paid</option>
                        <option value="partial">Partial</option>
                        <option value="unpaid">Unpaid</option>
                        <option value="cancelled">Cancelled</option>
                    </select>

                    {(search || statusFilter || fromDate || toDate) && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearch("")
                                setStatusFilter("")
                                setFromDate("")
                                setToDate("")
                            }}
                            className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg border border-red-100"
                        >
                            <span className="material-symbols-outlined text-sm">close</span>
                            Clear
                        </button>
                    )}
                </div>
            ) : null}

            <section className="flex-1 overflow-auto p-6">
                <div className="bg-white rounded-xl border border-[#dae5e7] overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-4 py-3 text-xs uppercase">Invoice No</th>
                                <th className="px-4 py-3 text-xs uppercase">Date</th>
                                <th className="px-4 py-3 text-xs uppercase">Party</th>
                                <th className="px-4 py-3 text-xs uppercase">Amount</th>
                                <th className="px-4 py-3 text-xs uppercase">Paid</th>
                                <th className="px-4 py-3 text-xs uppercase">Status</th>
                                <th className="px-4 py-3 text-xs uppercase text-right">
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td
                                        colSpan="7"
                                        className="text-center py-6 text-gray-500"
                                    >
                                        Loading invoices...
                                    </td>
                                </tr>
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan="7"
                                        className="text-center py-6 text-gray-500"
                                    >
                                        No invoices found
                                    </td>
                                </tr>
                            ) : (
                                paginatedRows.map((inv) => (
                                    <tr key={inv.$id} className="border-t border-[#dae5e7]">
                                        <td className="px-4 py-3 font-medium">
                                            #{inv.invoiceNo}
                                        </td>
                                        <td className="px-4 py-3">
                                            {inv.date
                                                ? new Date(inv.date).toLocaleDateString("en-IN")
                                                : "—"}
                                        </td>
                                        <td className="px-4 py-3">{inv.displayParty}</td>
                                        <td className="px-4 py-3">₹{inv.totalAmount}</td>
                                        <td className="px-4 py-3">₹{inv.paidAmount || 0}</td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`px-2 py-1 text-xs rounded-full font-semibold ${getStatusBadge(
                                                    inv.status
                                                )}`}
                                            >
                                                {inv.status || "unpaid"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-2 flex-wrap">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setModalDraft(null)
                                                        setViewInvoice(inv)
                                                        setOpenModal(true)
                                                    }}
                                                    className="px-3 py-1.5 text-xs border border-[#dae5e7] rounded-lg hover:bg-gray-50"
                                                >
                                                    View
                                                </button>
                                                {String(inv.status || "").toLowerCase() !== "cancelled" ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCancelInvoice(inv)}
                                                        className="px-3 py-1.5 text-xs border border-red-200 text-red-700 rounded-lg hover:bg-red-50"
                                                    >
                                                        Cancel
                                                    </button>
                                                ) : null}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {/* PAGINATION FOOTER */}
                    {rows.length > 0 && totalPages > 1 ? (
                        <div className="px-6 py-4 bg-[#f0f4f5]/30 flex items-center justify-between border-t border-[#dae5e7]">
                            <p className="text-xs text-[#5e878d] font-medium">
                                Showing {startEntry} to {endEntry} of {rows.length} entries
                            </p>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handlePreviousPage}
                                    disabled={currentPage === 1}
                                    className="p-1.5 rounded bg-white border border-[#dae5e7] text-[#5e878d] hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span className="material-symbols-outlined text-sm">
                                        chevron_left
                                    </span>
                                </button>

                                {getPageNumbers().map((page, idx) => {
                                    if (page === "...") {
                                        return (
                                            <span
                                                key={`ellipsis-${idx}`}
                                                className="w-8 h-8 flex items-center justify-center text-[#5e878d] text-xs"
                                            >
                                                ...
                                            </span>
                                        )
                                    }

                                    return (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`w-8 h-8 rounded text-xs font-bold transition-colors ${currentPage === page
                                                ? "bg-primary text-white"
                                                : "bg-white text-[#5e878d] hover:bg-primary/5"
                                                }`}
                                        >
                                            {page}
                                        </button>
                                    )
                                })}

                                <button
                                    onClick={handleNextPage}
                                    disabled={currentPage === totalPages}
                                    className="p-1.5 rounded bg-white border border-[#dae5e7] text-[#5e878d] hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span className="material-symbols-outlined text-sm">
                                        chevron_right
                                    </span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="px-6 py-4 bg-[#f0f4f5]/30 flex items-center justify-between border-t border-[#dae5e7]">
                            <p className="text-xs text-[#5e878d] font-medium">
                                Showing {rows.length === 0 ? 0 : 1} to {rows.length} of {rows.length} entries
                            </p>
                        </div>
                    )}
                </div>
            </section>


            <InvoiceModal
                mode={viewInvoice ? "view" : "create"}
                open={openModal}
                onClose={closeModal}
                onCreate={handleCreate}
                company={company}
                initialDraft={modalDraft}
                editInvoice={viewInvoice}
            />
        </main>
    )
}
