import { useEffect, useMemo, useState } from "react"
import { listJobsByDesigner, updateDesignJob } from "../services/designingService"
import { getAllParties } from "../services/partyService"

const getEntityId = (item) => item?.id || item?.$id

export default function DesignerLedger({ company, designer, onBack }) {
    const [jobs, setJobs] = useState([])
    const [partiesMap, setPartiesMap] = useState({})
    const [loading, setLoading] = useState(false)
    const [updatingPaymentId, setUpdatingPaymentId] = useState(null)
    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState("")
    const [paymentFilter, setPaymentFilter] = useState("")
    const [dateFrom, setDateFrom] = useState("")
    const [dateTo, setDateTo] = useState("")

    const companyId = getEntityId(company)
    const designerId = getEntityId(designer)

    useEffect(() => {
        async function loadData() {
            if (!companyId || !designerId) return

            setLoading(true)
            try {
                const [jobsRes, partiesRes] = await Promise.all([
                    listJobsByDesigner(companyId, designerId),
                    getAllParties(companyId),
                ])

                const jobsList = Array.isArray(jobsRes) ? jobsRes : (jobsRes?.documents || [])
                setJobs(jobsList)

                const partiesList = Array.isArray(partiesRes) ? partiesRes : (partiesRes?.documents || [])
                const map = {}
                partiesList.forEach((party) => {
                    map[getEntityId(party)] = party.name || party.partyName || "-"
                })
                setPartiesMap(map)
            } catch (err) {
                console.error("Failed to load designer ledger:", err)
                setJobs([])
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [companyId, designerId])

    const filteredJobs = useMemo(() => {
        let result = jobs

        if (search.trim()) {
            const s = search.toLowerCase()
            result = result.filter((job) =>
                (job.title || "").toLowerCase().includes(s) ||
                (job.party || "").toLowerCase().includes(s) ||
                (partiesMap[job.partyId] || "").toLowerCase().includes(s) ||
                (job.size || "").toLowerCase().includes(s)
            )
        }

        if (statusFilter) {
            result = result.filter((job) => job.status === statusFilter)
        }

        if (paymentFilter === "paid") {
            result = result.filter((job) => Boolean(job.isPaid))
        } else if (paymentFilter === "unpaid") {
            result = result.filter((job) => !job.isPaid)
        }

        if (dateFrom) {
            result = result.filter((job) => (job.dateIn || "") >= dateFrom)
        }
        if (dateTo) {
            result = result.filter((job) => (job.dateIn || "") <= dateTo)
        }

        return result
    }, [jobs, search, statusFilter, paymentFilter, dateFrom, dateTo, partiesMap])

    const normalizeSize = (value) => String(value || "").trim().toLowerCase()

    const getRateForJobSize = (size) => {
        const normalizedSize = normalizeSize(size)
        const sizeRates = Array.isArray(designer?.sizeRates) ? designer.sizeRates : []

        const matched = sizeRates.find((entry) => normalizeSize(entry?.size) === normalizedSize)
        if (matched && Number(matched.rate) >= 0) {
            return Number(matched.rate)
        }

        return Number(designer?.rate || 0)
    }

    const summary = useMemo(() => {
        let totalWorkAmount = 0
        let totalPaidAmount = 0

        filteredJobs.forEach((job) => {
            const calculatedAmount = getRateForJobSize(job.size) * Number(job.pages || 0)
            totalWorkAmount += calculatedAmount
            if (job.isPaid) {
                totalPaidAmount += Number(job.paidAmount || calculatedAmount)
            }
        })

        return {
            totalJobs: filteredJobs.length,
            totalWorkAmount,
            totalPaidAmount,
            dueAmount: Math.max(0, totalWorkAmount - totalPaidAmount),
        }
    }, [filteredJobs, designer?.rate, designer?.sizeRates])

    async function togglePaid(job) {
        const jobId = getEntityId(job)
        if (!jobId) return

        const willBePaid = !job.isPaid
        const calculatedAmount = getRateForJobSize(job.size) * Number(job.pages || 0)
        const paidDate = willBePaid ? new Date().toISOString().slice(0, 10) : null
        const paidAmount = willBePaid ? (Number(job.paidAmount || 0) || calculatedAmount) : 0

        try {
            setUpdatingPaymentId(jobId)
            await updateDesignJob(jobId, {
                isPaid: willBePaid,
                paidDate,
                paidAmount,
            })
            setJobs((prev) =>
                prev.map((j) =>
                    getEntityId(j) === jobId
                        ? { ...j, isPaid: willBePaid, paidDate, paidAmount }
                        : j
                )
            )
        } catch (err) {
            console.error("Failed to update payment status:", err)
            alert("Failed to update payment status")
        } finally {
            setUpdatingPaymentId(null)
        }
    }

    return (
        <main className="flex-1 flex flex-col overflow-hidden">
            <header className="bg-white border-b border-[#dae5e7] p-6">
                <div>
                    <button
                        onClick={onBack}
                        className="mb-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#dae5e7] text-[#2f4f54] hover:bg-primary/5"
                    >
                        <span className="material-symbols-outlined text-base">arrow_back</span>
                        Back to Designers
                    </button>
                    <h2 className="text-3xl font-black tracking-tight">Designer Ledger</h2>
                    <p className="text-sm text-[#5e878d] font-medium">
                        {designer?.name || "Designer"} - Assigned jobs and cost details
                    </p>
                </div>
            </header>

            <div className="bg-[#f0f4f5]/60 px-6 py-4 space-y-3 border-b border-[#dae5e7]">
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="bg-white border border-[#dae5e7] rounded-lg relative w-full md:w-72">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#5e878d] text-lg">
                            search
                        </span>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search title, party, size..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg bg-white text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                        />
                    </div>

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

                    <select
                        value={paymentFilter}
                        onChange={(e) => setPaymentFilter(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-[#dae5e7] bg-white text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                    >
                        <option value="">All Payment</option>
                        <option value="paid">Paid</option>
                        <option value="unpaid">Unpaid</option>
                    </select>

                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-[#dae5e7] bg-white text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                    />
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-[#dae5e7] bg-white text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                    />
                </div>

                <div className="text-sm text-[#2f4f54] flex flex-wrap gap-4">
                    <span><strong>Jobs:</strong> {summary.totalJobs}</span>
                    <span><strong>Work Amount:</strong> ₹{summary.totalWorkAmount.toFixed(2)}</span>
                    <span><strong>Paid:</strong> ₹{summary.totalPaidAmount.toFixed(2)}</span>
                    <span><strong>Due:</strong> ₹{summary.dueAmount.toFixed(2)}</span>
                </div>
            </div>

            <section className="flex-1 overflow-auto p-6">
                <div className="bg-white rounded-xl border border-[#dae5e7] overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-[#f0f4f5]/60">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold uppercase">Title</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase">Party Name</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase">Size</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase">Pages</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase">Status</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase text-right">Total Cost</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase">Payment</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f0f4f5]">
                            {!loading && filteredJobs.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-sm text-gray-500">
                                        No jobs assigned to this designer.
                                    </td>
                                </tr>
                            )}

                            {filteredJobs.map((job) => (
                                <tr key={getEntityId(job)} className="hover:bg-primary/5 transition">
                                    <td className="px-6 py-4 text-sm text-gray-700">{job.title || "-"}</td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{partiesMap[job.partyId] || job.party || "-"}</td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{job.size || "-"}</td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{job.pages ?? "-"}</td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{job.status || "-"}</td>
                                    <td className="px-6 py-4 text-sm text-gray-700 text-right">
                                        ₹{(getRateForJobSize(job.size) * Number(job.pages || 0)).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700">
                                        <button
                                            onClick={() => togglePaid(job)}
                                            disabled={updatingPaymentId === getEntityId(job)}
                                            className={`px-3 py-1.5 text-xs font-semibold rounded ${job.isPaid
                                                ? "bg-green-100 text-green-700"
                                                : "bg-gray-100 text-gray-700"
                                                } disabled:opacity-50`}
                                        >
                                            {updatingPaymentId === getEntityId(job)
                                                ? "Saving..."
                                                : job.isPaid
                                                    ? `Paid${job.paidDate ? ` (${job.paidDate})` : ""}`
                                                    : "Mark Paid"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </main>
    )
}
