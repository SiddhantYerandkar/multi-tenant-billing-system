import { useEffect, useState } from "react"
import { listDesigners } from "../services/designerService"
import { listJobsByDesigner } from "../services/designingService"

const getEntityId = (item) => item?.id || item?.$id

export default function ExpenseModal({ open, onClose, onCreate, company }) {
    const [expenseType, setExpenseType] = useState("general")
    const [description, setDescription] = useState("")
    const [amount, setAmount] = useState("")
    const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0])
    const [designers, setDesigners] = useState([])
    const [selectedDesigner, setSelectedDesigner] = useState("")
    const [salaryPeriod, setSalaryPeriod] = useState({
        startDate: "",
        endDate: ""
    })
    const [calculatedSalary, setCalculatedSalary] = useState(0)
    const [loading, setLoading] = useState(false)

    const companyId = getEntityId(company)

    useEffect(() => {
        if (open && expenseType === "salary") {
            loadDesigners()
        }
    }, [open, expenseType])

    const loadDesigners = async () => {
        if (!companyId) return

        try {
            const designersList = await listDesigners(companyId)
            setDesigners(designersList)
        } catch (err) {
            console.error("Failed to load designers:", err)
        }
    }

    const calculateSalary = async () => {
        if (!selectedDesigner || !salaryPeriod.startDate || !salaryPeriod.endDate) return

        setLoading(true)
        try {
            const jobs = await listJobsByDesigner(companyId, selectedDesigner)
            const jobsList = Array.isArray(jobs) ? jobs : (jobs?.documents || [])

            console.log("Fetched jobs for designer:", jobsList) // Debug log

            // Filter jobs within the salary period
            const periodJobs = jobsList.filter(job => {
                const jobDate = job.dateIn || job.createdAt
                return jobDate >= salaryPeriod.startDate && jobDate <= salaryPeriod.endDate
            })

            // Calculate total salary based on completed jobs
            let totalSalary = 0
            //const designer = designers.find(d => getEntityId(d) === selectedDesigner)
            const designer = designers.find(
                d => String(getEntityId(d)) === String(selectedDesigner)
            )
            console.log("Selected designer for salary calculation:", designer) // Debug log
            if (designer) {
                periodJobs.forEach(job => {
                    if (job.status === 'done') {
                        const rate = getRateForJobSize(designer, job.size)
                        console.log(`Job ID: ${getEntityId(job)}, Size: ${job.size}, Rate: ${rate}`) // Debug log
                        totalSalary += rate * Number(job.pages || 0)
                    }
                })
            }

            setCalculatedSalary(totalSalary)
            setAmount(totalSalary.toString())
        } catch (err) {
            console.error("Failed to calculate salary:", err)
        } finally {
            setLoading(false)
        }
    }

    const getRateForJobSize = (designer, size) => {
        const normalizedSize = String(size || "").trim().toLowerCase()
        const sizeRates = Array.isArray(designer?.sizeRates) ? designer.sizeRates : []

        const matched = sizeRates.find((entry) => String(entry?.size || "").trim().toLowerCase() === normalizedSize)
        if (matched && Number(matched.rate) >= 0) {
            return Number(matched.rate)
        }

        return Number(designer?.rate || 0)
    }

    const handleSubmit = () => {
        if (!description || !amount || !expenseDate) return

        const expenseData = {
            companyId,
            type: expenseType,
            description,
            amount: Number(amount),
            expenseDate,
            ...(expenseType === "salary" && {
                designerId: selectedDesigner,
                salaryPeriod
            })
        }
        console.log("Creating expense with data:", expenseData) // Debug log
        onCreate(expenseData)

        // Reset form
        setExpenseType("general")
        setDescription("")
        setAmount("")
        setExpenseDate(new Date().toISOString().split('T')[0])
        setSelectedDesigner("")
        setSalaryPeriod({ startDate: "", endDate: "" })
        setCalculatedSalary(0)
    }

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-[600px] bg-white dark:bg-[#2c3136] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-[#f0f4f5] dark:border-slate-700">
                    <h1 className="text-[#101818] dark:text-white text-xl font-bold tracking-tight">
                        Add New Expense
                    </h1>
                    <button
                        onClick={onClose}
                        className="size-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[#5e878d] transition"
                    >
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 flex flex-col gap-6">

                    {/* Expense Type */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[#101818] dark:text-slate-200 text-sm font-semibold">
                            Expense Type
                        </label>
                        <div className="flex p-1 bg-[#f0f4f5] dark:bg-slate-800 rounded-lg border border-[#dae5e7] dark:border-slate-600">
                            {[
                                { label: "General Expense", value: "general" },
                                { label: "Salary", value: "salary" },
                            ].map((type) => (
                                <button
                                    key={type.value}
                                    onClick={() => setExpenseType(type.value)}
                                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition
                                        ${expenseType === type.value
                                            ? "bg-white dark:bg-primary text-primary dark:text-white shadow-sm"
                                            : "text-[#5e878d] hover:text-[#101818] dark:hover:text-white"
                                        }`}
                                >
                                    {type.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Description */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[#101818] dark:text-slate-200 text-sm font-semibold">
                            Description
                        </label>
                        <input
                            type="text"
                            placeholder={expenseType === "salary" ? "e.g. Monthly Salary" : "e.g. Printing Cost"}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-[#dae5e7] dark:border-slate-600
                                bg-white dark:bg-slate-800 text-[#101818] dark:text-white
                                outline-none focus:ring-2 focus:ring-primary/20
                                focus:border-primary placeholder:text-[#5e878d]"
                        />
                    </div>

                    {/* Salary specific fields */}
                    {expenseType === "salary" && (
                        <>
                            {/* Designer Selection */}
                            <div className="flex flex-col gap-2">
                                <label className="text-[#101818] dark:text-slate-200 text-sm font-semibold">
                                    Designer
                                </label>
                                <select
                                    value={selectedDesigner}
                                    onChange={(e) => setSelectedDesigner(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border border-[#dae5e7] dark:border-slate-600
                                        bg-white dark:bg-slate-800 text-[#101818] dark:text-white
                                        outline-none focus:ring-2 focus:ring-primary/20
                                        focus:border-primary"
                                >
                                    <option value="">Select Designer</option>
                                    {designers.map((designer) => (
                                        <option key={getEntityId(designer)} value={getEntityId(designer)}>
                                            {designer.name || "Unnamed Designer"}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Salary Period */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-[#101818] dark:text-slate-200 text-sm font-semibold">
                                        Start Date
                                    </label>
                                    <input
                                        type="date"
                                        value={salaryPeriod.startDate}
                                        onChange={(e) => setSalaryPeriod(prev => ({ ...prev, startDate: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-lg border border-[#dae5e7] dark:border-slate-600
                                            bg-white dark:bg-slate-800 text-[#101818] dark:text-white
                                            outline-none focus:ring-2 focus:ring-primary/20
                                            focus:border-primary"
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-[#101818] dark:text-slate-200 text-sm font-semibold">
                                        End Date
                                    </label>
                                    <input
                                        type="date"
                                        value={salaryPeriod.endDate}
                                        onChange={(e) => setSalaryPeriod(prev => ({ ...prev, endDate: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-lg border border-[#dae5e7] dark:border-slate-600
                                            bg-white dark:bg-slate-800 text-[#101818] dark:text-white
                                            outline-none focus:ring-2 focus:ring-primary/20
                                            focus:border-primary"
                                    />
                                </div>
                            </div>

                            {/* Calculate Salary Button */}
                            <button
                                onClick={calculateSalary}
                                disabled={!selectedDesigner || !salaryPeriod.startDate || !salaryPeriod.endDate || loading}
                                className="w-full px-4 py-3 rounded-lg bg-[#f0f4f5] dark:bg-slate-800 border border-[#dae5e7] dark:border-slate-600
                                    text-[#5e878d] hover:text-[#101818] dark:hover:text-white transition disabled:opacity-50
                                    flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <span className="material-symbols-outlined animate-spin text-sm">refresh</span>
                                        Calculating...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-sm">calculate</span>
                                        Calculate Salary
                                    </>
                                )}
                            </button>

                            {/* Calculated Amount Display */}
                            {calculatedSalary > 0 && (
                                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                    <p className="text-sm text-green-700 dark:text-green-300">
                                        Calculated Salary: <span className="font-bold">₹{calculatedSalary.toFixed(2)}</span>
                                    </p>
                                </div>
                            )}
                        </>
                    )}

                    {/* Amount */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[#101818] dark:text-slate-200 text-sm font-semibold">
                            Amount
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5e878d] material-symbols-outlined text-[20px]">
                                currency_rupee
                            </span>
                            <input
                                type="number"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                disabled={expenseType === "salary" && calculatedSalary > 0}
                                className="w-full pl-10 pr-4 py-3 rounded-lg border border-[#dae5e7] dark:border-slate-600
                                    bg-white dark:bg-slate-800 text-[#101818] dark:text-white
                                    outline-none focus:ring-2 focus:ring-primary/20
                                    focus:border-primary placeholder:text-[#5e878d]
                                    disabled:bg-gray-100 dark:disabled:bg-slate-700 disabled:cursor-not-allowed"
                            />
                        </div>
                    </div>

                    {/* Date */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[#101818] dark:text-slate-200 text-sm font-semibold">
                            Expense Date
                        </label>
                        <input
                            type="date"
                            value={expenseDate}
                            onChange={(e) => setExpenseDate(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-[#dae5e7] dark:border-slate-600
                                bg-white dark:bg-slate-800 text-[#101818] dark:text-white
                                outline-none focus:ring-2 focus:ring-primary/20
                                focus:border-primary"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-5 bg-[#f9fafa] dark:bg-slate-800/50 flex justify-end gap-3 border-t border-[#f0f4f5] dark:border-slate-700">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-sm font-semibold text-[#5e878d] hover:text-[#101818] dark:hover:text-white transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!description || !amount || !expenseDate}
                        className="px-6 py-2.5 rounded-lg bg-primary hover:bg-[#006a78]
                            text-white text-sm font-bold shadow-md shadow-primary/20 transition
                            flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="material-symbols-outlined text-sm">
                            add_circle
                        </span>
                        Add Expense
                    </button>
                </div>
            </div>
        </div>
    )
}