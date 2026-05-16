import { useEffect, useState } from "react"
import { listDesignJobs } from "../services/designingService"
import { listDesigners, createDesigner, updateDesigner, deleteDesigner } from "../services/designerService"
import DesignerModal from "../components/DesignerModal"

export default function Designer({ company, onViewLedger }) {
    const [designers, setDesigners] = useState([])
    const [jobs, setJobs] = useState([])
    const [loading, setLoading] = useState(false)
    const [search, setSearch] = useState("")
    const [modalOpen, setModalOpen] = useState(false)
    const [selectedDesigner, setSelectedDesigner] = useState(null)
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 5

    useEffect(() => {
        if (!getEntityId(company)) return
        fetchDesigners()
        fetchJobs()
    }, [company])

    const fetchDesigners = async () => {
        setLoading(true)
        try {
            const res = await listDesigners(getEntityId(company))
            const designersList = Array.isArray(res) ? res : (res?.documents || [])
            setDesigners(designersList)
        } catch (err) {
            console.error(err)
        }
        setLoading(false)
    }

    const fetchJobs = async () => {
        if (!getEntityId(company)) return
        try {
            const res = await listDesignJobs(getEntityId(company))
            const jobsList = Array.isArray(res) ? res : (res?.documents || [])
            setJobs(jobsList)
        } catch (err) {
            console.error(err)
        }
    }

    const handleAdd = () => {
        setSelectedDesigner(null)
        setModalOpen(true)
    }

    const handleEdit = (designer) => {
        setSelectedDesigner(designer)
        setModalOpen(true)
    }

    const handleDelete = async (designerId) => {
        if (!confirm("Delete this designer?")) return
        setLoading(true)
        try {
            await deleteDesigner(getEntityId(company), designerId)
            fetchDesigners()
        } catch (err) {
            console.error(err)
        }
        setLoading(false)
    }

    const handleCreateOrUpdate = async (data) => {
        setLoading(true)
        try {
            if (selectedDesigner) {
                await updateDesigner(getEntityId(company), getEntityId(selectedDesigner), data)
            } else {
                await createDesigner(getEntityId(company), data)
            }
            fetchDesigners()
        } catch (err) {
            console.error(err)
        }
        setLoading(false)
    }

    const getEntityId = (item) => item?.id || item?.$id

    const filteredDesigners = designers.filter(d =>
        d.name?.toLowerCase().includes(search.toLowerCase()) ||
        d.email?.toLowerCase().includes(search.toLowerCase())
    )

    const totalPages = Math.ceil(filteredDesigners.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedDesigners = filteredDesigners.slice(startIndex, endIndex)
    const startEntry = filteredDesigners.length === 0 ? 0 : startIndex + 1
    const endEntry = Math.min(endIndex, filteredDesigners.length)

    useEffect(() => setCurrentPage(1), [search])

    const handlePageChange = (page) => setCurrentPage(page)
    const handlePreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1))
    const handleNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages))

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
                for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i)
                pages.push("...")
                pages.push(totalPages)
            }
        }
        return pages
    }

    const hasSizeRates = (designer) => Array.isArray(designer?.sizeRates) && designer.sizeRates.length > 0

    return (
        <main className="flex-1 flex flex-col overflow-hidden">
            {/* HEADER */}
            <header className="bg-white border-b border-[#dae5e7] p-6 flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black tracking-tight">Designer Management</h2>
                    <p className="text-sm text-[#5e878d] font-medium">
                        Manage designers and view assigned jobs in ledger.
                    </p>
                </div>

                <button
                    onClick={handleAdd}
                    className="flex items-center gap-2 h-11 px-6 rounded-lg bg-primary text-white font-bold shadow"
                >
                    <span className="material-symbols-outlined text-lg">person_add</span>
                    Add New Designer
                </button>
            </header>

            {/* TOOLBAR */}
            <div className="bg-[#f0f4f5]/60 px-6 py-4 flex flex-col md:flex-row gap-4 justify-between">
                <div className="relative w-full md:w-96">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#5e878d]">search</span>
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name or email..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                    />
                </div>
            </div>

            {/* TABLE */}
            <section className="flex-1 overflow-auto p-6">
                <div className="bg-white rounded-xl border border-[#dae5e7] overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-[#f0f4f5]/60">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold uppercase">Name</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase">Email</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase">Mobile</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase">Rate</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase text-right">Actions</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-[#f0f4f5]">
                            {!loading && paginatedDesigners.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="p-6 text-center text-sm text-gray-500">
                                        No designers found
                                    </td>
                                </tr>
                            )}

                            {paginatedDesigners.map(designer => (
                                <tr key={getEntityId(designer)} className="hover:bg-primary/5 transition">
                                    <td className="px-6 py-4 font-bold">{designer.name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{designer.email || "-"}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{designer.mobile || designer.phone || "-"}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {hasSizeRates(designer) ? "Variable" : `₹${Number(designer.rate || 0).toFixed(2)}`}
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        <button
                                            onClick={() => onViewLedger?.(designer)}
                                            className="px-3 py-1.5 text-xs font-semibold rounded border border-[#dae5e7] text-[#2f4f54] hover:bg-primary/5"
                                        >
                                            View Details
                                        </button>
                                        <button
                                            onClick={() => handleEdit(designer)}
                                            className="p-2 text-gray-500 hover:text-primary"
                                        >
                                            <span className="material-symbols-outlined">edit</span>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(getEntityId(designer))}
                                            className="p-2 text-gray-500 hover:text-red-500"
                                        >
                                            <span className="material-symbols-outlined">delete</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* PAGINATION FOOTER */}
                    <div className="px-6 py-4 bg-[#f0f4f5]/30 flex items-center justify-between border-t border-[#dae5e7]">
                        <p className="text-xs text-[#5e878d] font-medium">
                            Showing {startEntry} to {endEntry} of {filteredDesigners.length} entries
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handlePreviousPage}
                                disabled={currentPage === 1}
                                className="p-1.5 rounded bg-white border border-[#dae5e7] text-[#5e878d] hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="material-symbols-outlined text-sm">chevron_left</span>
                            </button>
                            {getPageNumbers().map((page, index) =>
                                page === "..." ? (
                                    <span key={index} className="w-8 h-8 flex items-center justify-center text-[#5e878d] text-xs">...</span>
                                ) : (
                                    <button
                                        key={page}
                                        onClick={() => handlePageChange(page)}
                                        className={`w-8 h-8 rounded text-xs font-bold transition-colors ${currentPage === page ? 'bg-primary text-white' : 'bg-white text-[#5e878d] hover:bg-primary/5'}`}
                                    >
                                        {page}
                                    </button>
                                )
                            )}
                            <button
                                onClick={handleNextPage}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className="p-1.5 rounded bg-white border border-[#dae5e7] text-[#5e878d] hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="material-symbols-outlined text-sm">chevron_right</span>
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <DesignerModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onCreate={handleCreateOrUpdate}
                editData={selectedDesigner}
            />
        </main>
    )
}