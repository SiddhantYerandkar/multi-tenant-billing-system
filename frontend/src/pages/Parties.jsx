import { useEffect, useState } from "react"
import { getParties, addParty, deleteParty, generatePartyCode } from "../services/partyService"
import AddPartyModal from "../components/AddPartyModal"
import ImportPartiesModal from "../components/ImportPartiesModal"
import * as XLSX from "xlsx"
import { saveAs } from "file-saver"

export default function Parties({ company, onViewLedger }) {
    const [parties, setParties] = useState([])
    const [search, setSearch] = useState("")
    const [loading, setLoading] = useState(false)
    const [showAddPartyModal, setShowAddPartyModal] = useState(false)
    const [partyCode, setPartyCode] = useState(null)
    const [showImportModal, setShowImportModal] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalItems, setTotalItems] = useState(0)

    const itemsPerPage = 10

    async function load(page = 1) {
        setLoading(true)
        try {
            const res = await getParties(page, itemsPerPage)

            setParties(res.data)
            setTotalPages(res.pagination.totalPages)
            setTotalItems(res.pagination.total)
            setCurrentPage(page)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }
    useEffect(() => {
        load(currentPage)
    }, [currentPage])

    // Reset to page 1 when search changes
    useEffect(() => {
        setCurrentPage(1)
    }, [search])

    const handlePageChange = (page) => {
        if (page !== '...') {
            load(page)
        }
    }

    const handlePreviousPage = () => {
        if (currentPage > 1) {
            load(currentPage - 1)
        }
    }

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            load(currentPage + 1)
        }
    }

    // Generate page numbers to display
    const getPageNumbers = () => {
        const pages = []
        const maxVisiblePages = 5

        if (totalPages <= maxVisiblePages) {
            // Show all pages if total pages is less than max visible
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i)
            }
        } else {
            // Show pages with ellipsis logic
            if (currentPage <= 3) {
                // Show first pages
                for (let i = 1; i <= 4; i++) {
                    pages.push(i)
                }
                pages.push('...')
                pages.push(totalPages)
            } else if (currentPage >= totalPages - 2) {
                // Show last pages
                pages.push(1)
                pages.push('...')
                for (let i = totalPages - 3; i <= totalPages; i++) {
                    pages.push(i)
                }
            } else {
                // Show middle pages
                pages.push(1)
                pages.push('...')
                for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                    pages.push(i)
                }
                pages.push('...')
                pages.push(totalPages)
            }
        }

        return pages
    }

    const handleDelete = async (id) => {
        if (!confirm("Delete this party?")) return
        await deleteParty(id)
        load()
    }

    const openAddPartyModal = async () => {
        const code = await generatePartyCode(company.id)
        setPartyCode(code)
        setShowAddPartyModal(true)
    }

    const handleAddParty = async (data) => {
        await addParty({
            ...data,
            party_code: partyCode,
            companyId: company.id,
            opening_balance: data.openingBalance,
            balance_type: data.balanceType
        });

        await load();
        setShowAddPartyModal(false);
    };

    const handleExport = () => {
        if (!parties.length) {
            alert("No data to export")
            return
        }

        // ✅ Format data for Excel
        const formatted = parties.map((p, index) => ({
            "Sr No": index + 1,
            "Party Code": p.party_code || "",
            "Name": p.name || "",
            "Phone": p.phone || "",
            "Address": p.address || ""
        }))

        // ✅ Create worksheet
        const worksheet = XLSX.utils.json_to_sheet(formatted)

        // ✅ Create workbook
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, "Parties")

        // ✅ Write file
        const excelBuffer = XLSX.write(workbook, {
            bookType: "xlsx",
            type: "array"
        })

        const data = new Blob([excelBuffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8"
        })

        saveAs(data, `Parties_${new Date().toISOString().split("T")[0]}.xlsx`)
    }

    return (
        <main className="flex-1 flex flex-col overflow-hidden">

            {/* HEADER */}
            <header className="bg-white border-b border-[#dae5e7] p-6">
                <div className="flex justify-between items-end gap-4">
                    <div>
                        <h2 className="text-3xl font-black tracking-tight">
                            Parties Management
                        </h2>
                        <p className="text-sm text-[#5e878d] font-medium">
                            Create and manage your wholesale customers and distribution partners.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowImportModal(true)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#dae5e7] bg-white text-sm font-semibold"
                        >
                            <span className="material-symbols-outlined">file_upload</span>
                            Import
                        </button>

                        <button onClick={openAddPartyModal} className="flex items-center gap-2 h-11 px-6 rounded-lg bg-primary text-white font-bold shadow">
                            <span className="material-symbols-outlined text-lg">person_add</span>
                            Add New Party
                        </button>
                    </div>
                </div>
            </header>

            {/* TOOLBAR */}
            <div className="bg-white px-6 py-4 flex flex-col md:flex-row gap-4 justify-between">
                <div className="relative w-full md:w-96">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#5e878d]">
                        search
                    </span>
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by code, name or phone..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#f0f4f5] text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                    />
                </div>

                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#dae5e7] bg-white text-sm font-semibold">
                        <span className="material-symbols-outlined">filter_list</span>
                        Filter
                    </button>

                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#dae5e7] bg-white text-sm font-semibold"
                    >
                        <span className="material-symbols-outlined">file_download</span>
                        Export
                    </button>
                </div>
            </div>

            {/* TABLE */}
            <section className="flex-1 overflow-auto p-6">
                <div className="bg-white rounded-xl border border-[#dae5e7] overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-[#f0f4f5]/60">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold uppercase w-40">Party Code</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase">Customer Name</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase">Phone</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase">Address</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase w-24 text-right">Opening Balance</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase text-right">Actions</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-[#f0f4f5]">
                            {!loading && parties.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="p-6 text-center text-sm text-gray-500">
                                        No parties found
                                    </td>
                                </tr>
                            )}

                            {parties.map(party => (
                                <tr key={party.id} className="hover:bg-primary/5 transition">
                                    <td className="px-6 py-4">
                                        <span className="px-3 py-1 text-xs font-bold rounded bg-primary/10 text-primary">
                                            {party.party_code}
                                        </span>
                                    </td>

                                    <td className="px-6 py-4">
                                        <p className="font-bold">{party.name}</p>
                                    </td>

                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {party.phone || "-"}
                                    </td>

                                    <td className="px-6 py-4 text-sm text-gray-600 truncate max-w-xs">
                                        {party.address || "-"}
                                    </td>

                                    <td className="px-6 py-4 text-right font-mono">
                                        <td className="px-6 py-4 text-right font-mono">
                                            {party.opening_balance > 0 ? (
                                                <span className={party.balance_type === "DR" ? "text-red-600" : "text-green-600"}>
                                                    ₹{party.opening_balance.toLocaleString()} {party.balance_type}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                    </td>

                                    <td className="px-6 py-4 text-right">
                                        {onViewLedger && (
                                            <button

                                                onClick={() => onViewLedger?.(party.id)}
                                                className="p-2 text-gray-500 hover:text-primary"
                                                title="View Ledger"
                                            >
                                                <span className="material-symbols-outlined">account_balance_wallet</span>
                                            </button>
                                        )}
                                        <button className="p-2 text-gray-500 hover:text-primary">
                                            <span className="material-symbols-outlined">edit</span>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(party.id)}
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
                            Showing page {currentPage} of {totalPages} (Total: {totalItems})
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handlePreviousPage}
                                disabled={currentPage === 1}
                                className="p-1.5 rounded bg-white border border-[#dae5e7] text-[#5e878d] hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="material-symbols-outlined text-sm">chevron_left</span>
                            </button>

                            {getPageNumbers().map((page, index) => {
                                if (page === '...') {
                                    return (
                                        <span key={`ellipsis-${index}`} className="w-8 h-8 flex items-center justify-center text-[#5e878d] text-xs">
                                            ...
                                        </span>
                                    )
                                }

                                return (
                                    <button
                                        key={page}
                                        onClick={() => handlePageChange(page)}
                                        className={`w-8 h-8 rounded text-xs font-bold transition-colors ${currentPage === page
                                            ? 'bg-primary text-white'
                                            : 'bg-white text-[#5e878d] hover:bg-primary/5'
                                            }`}
                                    >
                                        {page}
                                    </button>
                                )
                            })}

                            <button
                                onClick={handleNextPage}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className="p-1.5 rounded bg-white border border-[#dae5e7] text-[#5e878d] hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="material-symbols-outlined text-sm">chevron_right</span>
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <AddPartyModal
                isOpen={showAddPartyModal}
                onClose={() => setShowAddPartyModal(false)}
                partyCode={partyCode}
                onAddParty={handleAddParty}
            />

            <ImportPartiesModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                company={company}
                onImportComplete={load}
            />

        </main>
    )
}

