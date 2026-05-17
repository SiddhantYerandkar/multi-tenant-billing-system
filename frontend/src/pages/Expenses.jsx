
import { useEffect, useState, useMemo } from "react"
import { getPurchases, createPurchase, updatePurchase, deletePurchase } from "../services/purchaseService"
import { getExpenses, createExpense } from "../services/expenseService"
import PurchaseModal from "../components/PurchaseModal"
import ExpenseModal from "../components/ExpenseModal"

const getEntityId = (item) => item?.id || item?.$id

export default function Expenses({ company }) {
    const [activeTab, setActiveTab] = useState("purchases")
    const [purchases, setPurchases] = useState([])
    const [expenses, setExpenses] = useState([])
    const [loading, setLoading] = useState(false)
    const [showPurchaseModal, setShowPurchaseModal] = useState(false)
    const [showExpenseModal, setShowExpenseModal] = useState(false)
    const [editingPurchase, setEditingPurchase] = useState(null)
    const [search, setSearch] = useState("")
    const [dateFrom, setDateFrom] = useState("")
    const [dateTo, setDateTo] = useState("")

    const companyId = getEntityId(company)

    useEffect(() => {
        loadData()
    }, [companyId])

    const loadData = async () => {
        if (!companyId) return

        setLoading(true)
        try {
            const [purchasesRes, expensesRes] = await Promise.all([
                getPurchases(companyId),
                getExpenses(companyId)
            ])

            setPurchases(purchasesRes.documents || [])
            setExpenses(expensesRes.documents || [])
        } catch (err) {
            console.error("Failed to load expenses data:", err)
            setPurchases([])
            setExpenses([])
        } finally {
            setLoading(false)
        }
    }

    const filteredPurchases = useMemo(() => {
        let result = purchases

        if (search.trim()) {
            const s = search.toLowerCase()
            result = result.filter((purchase) =>
                (purchase.supplier || "").toLowerCase().includes(s) ||
                (purchase.itemDescription || "").toLowerCase().includes(s) ||
                (purchase.notes || "").toLowerCase().includes(s)
            )
        }

        if (dateFrom) {
            result = result.filter((purchase) => (purchase.purchaseDate || "") >= dateFrom)
        }
        if (dateTo) {
            result = result.filter((purchase) => (purchase.purchaseDate || "") <= dateTo)
        }


        return result
    }, [purchases, search, dateFrom, dateTo])

    const filteredExpenses = useMemo(() => {
        let result = expenses

        if (search.trim()) {
            const s = search.toLowerCase()
            result = result.filter((expense) =>
                (expense.description || "").toLowerCase().includes(s) ||
                (expense.type || "").toLowerCase().includes(s)
            )
        }

        if (dateFrom) {
            result = result.filter((expense) => (expense.expenseDate || "") >= dateFrom)
        }
        if (dateTo) {
            result = result.filter((expense) => (expense.expenseDate || "") <= dateTo)
        }

        return result
    }, [expenses, search, dateFrom, dateTo])

    const purchaseSummary = useMemo(() => {
        const total = filteredPurchases.reduce((sum, purchase) => sum + Number(purchase.totalAmount || 0), 0)
        return { total, count: filteredPurchases.length }
    }, [filteredPurchases])

    const expenseSummary = useMemo(() => {
        const total = filteredExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0)
        return { total, count: filteredExpenses.length }
    }, [filteredExpenses])

    const handleCreatePurchase = async (purchaseData) => {
        try {
            await createPurchase(purchaseData)
            await loadData()
            setShowPurchaseModal(false)
        } catch (err) {
            console.error("Failed to create purchase:", err)
            alert("Failed to create purchase")
        }
    }

    const handleUpdatePurchase = async (purchaseData) => {
        try {
            await updatePurchase(getEntityId(editingPurchase), purchaseData)
            await loadData()
            setShowPurchaseModal(false)
            setEditingPurchase(null)
        } catch (err) {
            console.error("Failed to update purchase:", err)
            alert("Failed to update purchase")
        }
    }

    const handleCreateExpense = async (expenseData) => {
        try {
            await createExpense(expenseData)
            await loadData()
            setShowExpenseModal(false)
        } catch (err) {
            console.error("Failed to create expense:", err)
            alert("Failed to create expense")
        }
    }

    const handleEditPurchase = (purchase) => {
        setEditingPurchase(purchase)
        setShowPurchaseModal(true)
    }

    const handleDeletePurchase = async (purchase) => {
        if (!confirm(`Are you sure you want to delete this purchase from ${purchase.supplier}?`)) {
            return
        }

        try {
            await deletePurchase(getEntityId(purchase))
            await loadData()
        } catch (err) {
            console.error("Failed to delete purchase:", err)
            alert("Failed to delete purchase")
        }
    }

    const handleClosePurchaseModal = () => {
        setShowPurchaseModal(false)
        setEditingPurchase(null)
    }

    return (
        <main className="flex-1 flex flex-col overflow-hidden">
            <header className="bg-white border-b border-[#dae5e7] p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-black tracking-tight">Expenses & Purchases</h2>
                        <p className="text-sm text-[#5e878d] font-medium">
                            Manage purchases and expenses for your business
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowPurchaseModal(true)}
                            className="px-4 py-2 bg-primary hover:bg-[#006a78] text-white text-sm font-bold rounded-lg shadow-md shadow-primary/20 transition flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-sm">add</span>
                            Add Purchase
                        </button>
                        <button
                            onClick={() => setShowExpenseModal(true)}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg shadow-md shadow-green-600/20 transition flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-sm">add</span>
                            Add Expense
                        </button>
                    </div>
                </div>
            </header>

            {/* Tabs */}
            <div className="bg-[#f0f4f5]/60 px-6 py-4 border-b border-[#dae5e7]">
                <div className="flex gap-1 p-1 bg-white rounded-lg border border-[#dae5e7] w-fit">
                    <button
                        onClick={() => setActiveTab("purchases")}
                        className={`px-6 py-2 text-sm font-semibold rounded-md transition ${activeTab === "purchases"
                            ? "bg-primary text-white shadow-sm"
                            : "text-[#5e878d] hover:text-[#101818]"
                            }`}
                    >
                        Purchases ({purchaseSummary.count})
                    </button>
                    <button
                        onClick={() => setActiveTab("expenses")}
                        className={`px-6 py-2 text-sm font-semibold rounded-md transition ${activeTab === "expenses"
                            ? "bg-primary text-white shadow-sm"
                            : "text-[#5e878d] hover:text-[#101818]"
                            }`}
                    >
                        Expenses ({expenseSummary.count})
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-[#f0f4f5]/60 px-6 py-4 space-y-3 border-b border-[#dae5e7]">
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="bg-white border border-[#dae5e7] rounded-lg relative w-full md:w-72">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#5e878d] text-lg">
                            search
                        </span>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={activeTab === "purchases" ? "Search supplier, item..." : "Search description, type..."}
                            className="w-full pl-10 pr-4 py-2 rounded-lg bg-white text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                        />
                    </div>

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

                <div className="text-sm text-[#2f4f54] flex gap-4">
                    <span><strong>Total {activeTab === "purchases" ? "Purchases" : "Expenses"}:</strong> ₹{(activeTab === "purchases" ? purchaseSummary.total : expenseSummary.total).toFixed(2)}</span>
                </div>
            </div>

            {/* Content */}
            <section className="flex-1 overflow-auto p-6">
                {activeTab === "purchases" ? (
                    <div className="bg-white rounded-xl border border-[#dae5e7] overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-[#f0f4f5]/60">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold uppercase">Supplier</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase">Item Description</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase text-center">Quantity</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase text-right">Unit Price</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase text-right">Total Amount</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase">Date</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#f0f4f5]">
                                {!loading && filteredPurchases.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="p-8 text-center text-sm text-gray-500">
                                            No purchases found.
                                        </td>
                                    </tr>
                                )}

                                {filteredPurchases.map((purchase) => (
                                    <tr key={getEntityId(purchase)} className="hover:bg-primary/5 transition">
                                        <td className="px-6 py-4 text-sm text-gray-700">{purchase.supplier || "-"}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{purchase.itemDescription || "-"}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700 text-center">{purchase.quantity || "-"}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700 text-right">₹{Number(purchase.unitPrice || 0).toFixed(2)}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700 text-right font-semibold">₹{Number(purchase.totalAmount || 0).toFixed(2)}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{purchase.purchaseDate || "-"}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleEditPurchase(purchase)}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                                                    title="Edit purchase"
                                                >
                                                    <span className="material-symbols-outlined text-sm">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => handleDeletePurchase(purchase)}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                                                    title="Delete purchase"
                                                >
                                                    <span className="material-symbols-outlined text-sm">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-[#dae5e7] overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-[#f0f4f5]/60">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold uppercase">Type</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase">Description</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase text-right">Amount</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#f0f4f5]">
                                {!loading && filteredExpenses.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="p-8 text-center text-sm text-gray-500">
                                            No expenses found.
                                        </td>
                                    </tr>
                                )}

                                {filteredExpenses.map((expense) => (
                                    <tr key={getEntityId(expense)} className="hover:bg-primary/5 transition">
                                        <td className="px-6 py-4 text-sm text-gray-700">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded ${expense.type === "salary"
                                                ? "bg-blue-100 text-blue-700"
                                                : "bg-gray-100 text-gray-700"
                                                }`}>
                                                {expense.type === "salary" ? "Salary" : "General"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{expense.description || "-"}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700 text-right font-semibold">₹{Number(expense.amount || 0).toFixed(2)}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{expense.expenseDate || "-"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* Modals */}
            <PurchaseModal
                open={showPurchaseModal}
                onClose={handleClosePurchaseModal}
                onCreate={editingPurchase ? handleUpdatePurchase : handleCreatePurchase}
                company={company}
                editData={editingPurchase}
            />

            <ExpenseModal
                open={showExpenseModal}
                onClose={() => setShowExpenseModal(false)}
                onCreate={handleCreateExpense}
                company={company}
            />
        </main>
    )
}