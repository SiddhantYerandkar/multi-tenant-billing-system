import { useState, useEffect, useMemo } from "react"
import { createDesignJob, deleteDesignJob, listDesignJobs, updateDesignJob } from "../services/designingService"
import { listDesigners } from "../services/designerService"
import CreateJobModal from "../components/CreatJobModal"
const STATUS_OPTIONS = ["pending", "approval", "done"]

export default function Designing({ company }) {
    const [jobs, setJobs] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editJob, setEditJob] = useState(null)
    const [deletingId, setDeletingId] = useState(null)
    const [designers, setDesigners] = useState([])
    const [designerNameMap, setDesignerNameMap] = useState({})
    const getEntityId = (item) => item?.id || item?.$id

    // filters
    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState("")
    const [dateFrom, setDateFrom] = useState("")
    const [dateTo, setDateTo] = useState("")

    // pagination
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)

    async function load() {
        setLoading(true)

        try {
            const res = await listDesignJobs(company.$id)

            // map DB data → UI format
            const mapped = res.map((doc, index) => ({
                id: getEntityId(doc),
                srNo: doc.srNo || index + 1,
                dateIn: doc.dateIn,
                party: doc.party,
                status: doc.status,
                title: doc.title,
                function: doc.function,
                size: doc.size,
                pages: doc.pages,
                orderNo: doc.orderNo,
                designerId: doc.designerId || "",
                designer: doc.designer || ""
            }))

            setJobs(mapped)

        } catch (err) {
            console.error("Failed to load design jobs:", err)
        }

        setLoading(false)
    }

    async function handleCreateJob(data) {
        try {
            if (editJob) {
                // ✅ UPDATE
                await updateDesignJob(editJob.id, {
                    ...data,
                    companyId: getEntityId(company)
                })
            } else {
                // ✅ CREATE
                await createDesignJob({
                    ...data,
                    companyId: getEntityId(company)
                })
            }

            setShowModal(false)
            setEditJob(null)
            load()

        } catch (err) {
            console.error("Save job failed:", err)
        }
    }

    async function handleDelete(id) {
        if (deletingId) return // prevent double click

        const confirmDelete = window.confirm("Delete this job permanently?")

        if (!confirmDelete) return

        try {
            setDeletingId(id)

            await deleteDesignJob(id)

            // remove from UI instantly (better UX)
            setJobs(prev => prev.filter(j => j.id !== id))

        } catch (err) {
            console.error("Delete failed:", err)
        } finally {
            setDeletingId(null)
        }
    }

    useEffect(() => {
        if (getEntityId(company)) {
            load()
        }
    }, [company])

    useEffect(() => {
        async function loadDesigners() {
            if (!getEntityId(company)) return
            try {
                const res = await listDesigners(getEntityId(company))
                const list = Array.isArray(res) ? res : (res?.documents || [])
                setDesigners(list)
            } catch (err) {
                console.error("Failed to load designers:", err)
                setDesigners([])
            }
        }

        loadDesigners()
    }, [company])

    useEffect(() => {
        const map = {}
        designers.forEach((d) => {
            map[getEntityId(d)] = d.name || "-"
        })
        setDesignerNameMap(map)
    }, [designers])

    const filteredJobs = useMemo(() => {
        let result = jobs

        if (search.trim()) {
            const s = search.toLowerCase()
            result = result.filter(j =>
                j.party.toLowerCase().includes(s) ||
                j.title.toLowerCase().includes(s) ||
                (designerNameMap[j.designerId] || j.designer || "").toLowerCase().includes(s)
            )
        }

        if (statusFilter) {
            result = result.filter(j => j.status === statusFilter)
        }

        if (dateFrom) {
            result = result.filter(j => j.dateIn >= dateFrom)
        }

        if (dateTo) {
            result = result.filter(j => j.dateIn <= dateTo)
        }

        return result
    }, [jobs, search, statusFilter, dateFrom, dateTo])

    const totalPages = Math.ceil(filteredJobs.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginated = filteredJobs.slice(startIndex, endIndex)

    useEffect(() => {
        setCurrentPage(1)
    }, [search, statusFilter, dateFrom, dateTo, itemsPerPage])

    function handleEdit(job) {
        setEditJob(job)
        setShowModal(true)
    }

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
                <div className="flex justify-between items-end">
                    <div>
                        <h2 className="text-3xl font-black">Designing</h2>
                        <p className="text-sm text-[#5e878d]">
                            Manage all design jobs and approvals
                        </p>
                    </div>

                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-6 h-11 bg-primary text-white rounded-lg font-bold"
                    >
                        <span className="material-symbols-outlined">add</span>
                        Add Job
                    </button>
                </div>
            </header>

            {/* TOOLBAR */}
            <div className="bg-[#f0f4f5]/60 px-6 py-4 space-y-3">

                {/* Row 1: Search + Filters */}
                <div className="flex flex-wrap gap-3 items-center">

                    {/* SEARCH */}
                    <div className="bg-white border border-[#dae5e7] rounded-lg relative w-full md:w-72">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#5e878d] text-lg">
                            search
                        </span>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search jobs..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg bg-white text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                        />
                    </div>

                    {/* DATE RANGE */}
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-[#dae5e7] bg-white text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                        />
                        <span className="text-gray-400 text-sm">to</span>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-[#dae5e7] bg-white text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                        />
                    </div>

                    {/* STATUS FILTER */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-[#dae5e7] bg-white text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                    >
                        <option value="">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="approval">Approval</option>
                        <option value="done">Done</option>
                    </select>

                    {/* CLEAR FILTERS */}
                    {(search || statusFilter || dateFrom || dateTo) && (
                        <button
                            onClick={() => {
                                setSearch("")
                                setStatusFilter("")
                                setDateFrom("")
                                setDateTo("")
                            }}
                            className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                            <span className="material-symbols-outlined text-sm">close</span>
                            Clear Filters
                        </button>
                    )}
                </div>

                {/* Row 2: Count + Per Page */}
                <div className="flex items-center justify-between text-sm">

                    <span className="text-gray-500">
                        Showing {filteredJobs.length === 0 ? 0 : startIndex + 1} - {Math.min(endIndex, filteredJobs.length)} of {filteredJobs.length}
                        {(search || statusFilter || dateFrom || dateTo) && (
                            <span className="text-primary ml-1">(filtered)</span>
                        )}
                    </span>

                    <div className="flex items-center gap-2">
                        <span className="text-gray-500">Show:</span>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => setItemsPerPage(Number(e.target.value))}
                            className="px-2 py-1 rounded border border-[#dae5e7] bg-white text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                        >
                            {[10, 25, 50, 100].map(n => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                        <span className="text-gray-500">per page</span>
                    </div>
                </div>

            </div>

            {/* TABLE */}
            <section className="flex-1 overflow-auto p-6">
                {filteredJobs.length === 0 ? (
                    <div className="bg-white p-10 text-center border border-[#dae5e7] rounded-xl">
                        <span className="material-symbols-outlined text-5xl text-gray-300">palette</span>
                        <p className="mt-3 text-gray-500">No design jobs found</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-[#dae5e7] overflow-hidden">
                        <table className="w-full text-left">

                            {/* HEADER */}
                            <thead className="bg-[#f0f4f5]/60">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold uppercase">Sr No</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase">Date In</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase">Party</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase">Title</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase">Function</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase">Size</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase">Pages</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase">Designer</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase">Order No</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase">Actions</th>
                                </tr>
                            </thead>

                            {/* BODY */}
                            <tbody className="divide-y divide-[#f0f4f5]">
                                {paginated.map(j => (
                                    <tr key={j.id} className="hover:bg-primary/5 transition">

                                        <td className="px-6 py-4">
                                            <span className="text-sm text-gray-600">{j.srNo}</span>
                                        </td>

                                        <td className="px-6 py-4">
                                            <span className="text-sm text-gray-600">
                                                {new Date(j.dateIn).toLocaleDateString("en-IN")}
                                            </span>
                                        </td>

                                        <td className="px-6 py-4">
                                            <p className="font-bold">{j.party}</p>
                                        </td>

                                        <td className="px-6 py-4">
                                            <span className="text-sm text-gray-700 font-medium">
                                                {j.title}
                                            </span>
                                        </td>

                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {j.function}
                                        </td>

                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {j.size}
                                        </td>

                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {j.pages}
                                        </td>

                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {designerNameMap[j.designerId] || j.designer || "-"}
                                        </td>

                                        {/* STATUS BADGE */}
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-medium rounded ${j.status === "done"
                                                ? "bg-green-100 text-green-700"
                                                : j.status === "approval"
                                                    ? "bg-yellow-100 text-yellow-700"
                                                    : "bg-gray-100 text-gray-600"
                                                }`}>
                                                {j.status}
                                            </span>
                                        </td>

                                        {/* ORDER BADGE */}
                                        <td className="px-6 py-4">
                                            {j.status === "done" ? (
                                                <span className="px-3 py-1 text-xs font-bold rounded bg-blue-100 text-blue-700">
                                                    {j.orderNo}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-400">-</span>
                                            )}
                                        </td>

                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">

                                                <button
                                                    onClick={() => handleEdit(j)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 text-blue-600"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                                </button>

                                                <button
                                                    onClick={() => handleDelete(j.id)}
                                                    disabled={deletingId === j.id}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-red-600 disabled:opacity-40"
                                                >
                                                    {deletingId === j.id ? (
                                                        <span className="material-symbols-outlined animate-spin text-[18px]">
                                                            sync
                                                        </span>
                                                    ) : (
                                                        <span className="material-symbols-outlined text-[18px]">
                                                            delete
                                                        </span>
                                                    )}
                                                </button>

                                            </div>
                                        </td>

                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* PAGINATION (EXACT SAME AS ORDERS) */}
                        {totalPages > 1 && (
                            <div className="px-6 py-4 border-t border-[#f0f4f5] flex items-center justify-between">
                                <div className="text-sm text-gray-500">
                                    Page {currentPage} of {totalPages}
                                </div>

                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setCurrentPage(1)}
                                        disabled={currentPage === 1}
                                        className="p-2 rounded hover:bg-gray-100 disabled:opacity-40"
                                    >
                                        <span className="material-symbols-outlined text-lg">first_page</span>
                                    </button>

                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 rounded hover:bg-gray-100 disabled:opacity-40"
                                    >
                                        <span className="material-symbols-outlined text-lg">chevron_left</span>
                                    </button>

                                    {/* Page Numbers */}
                                    <div className="flex items-center gap-1 mx-2">
                                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                            let pageNum
                                            if (totalPages <= 5) pageNum = i + 1
                                            else if (currentPage <= 3) pageNum = i + 1
                                            else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i
                                            else pageNum = currentPage - 2 + i

                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => setCurrentPage(pageNum)}
                                                    className={`w-8 h-8 rounded text-sm font-medium ${currentPage === pageNum
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
                                        className="p-2 rounded hover:bg-gray-100 disabled:opacity-40"
                                    >
                                        <span className="material-symbols-outlined text-lg">chevron_right</span>
                                    </button>

                                    <button
                                        onClick={() => setCurrentPage(totalPages)}
                                        disabled={currentPage === totalPages}
                                        className="p-2 rounded hover:bg-gray-100 disabled:opacity-40"
                                    >
                                        <span className="material-symbols-outlined text-lg">last_page</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </section>

            <CreateJobModal
                open={showModal}
                onClose={() => {
                    setShowModal(false)
                    setEditJob(null)
                }}
                onCreate={handleCreateJob}
                editData={editJob}
                companyId={getEntityId(company)}
            />
        </main>
    )
}