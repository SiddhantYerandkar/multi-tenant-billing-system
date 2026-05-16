import { useEffect, useState, useMemo } from "react"
import { getExpenses, deleteExpense } from "../services/expenseService"
import CreateExpenseModal from "../components/CreateExpenseModal"
import EditExpenseModal from "../components/EditExpenseModal"

const EXPENSE_CATEGORIES = [
  { value: "salary", label: "Salary", color: "bg-blue-100 text-blue-700" },
  { value: "petrol", label: "Petrol", color: "bg-yellow-100 text-yellow-700" },
  { value: "misc", label: "Misc", color: "bg-gray-100 text-gray-700" },
  { value: "rent", label: "Rent", color: "bg-purple-100 text-purple-700" },
  { value: "electricity", label: "Electricity", color: "bg-orange-100 text-orange-700" },
  { value: "others", label: "Others", color: "bg-pink-100 text-pink-700" }
]

const CATEGORY_MAP = {}
EXPENSE_CATEGORIES.forEach(cat => {
  CATEGORY_MAP[cat.value] = cat
})

export default function Expenses({ company }) {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState(null)
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [dateRangeStart, setDateRangeStart] = useState("")
  const [dateRangeEnd, setDateRangeEnd] = useState("")

  useEffect(() => {
    if (company?.$id) {
      loadExpenses()
    }
  }, [company])

  async function loadExpenses() {
    setLoading(true)
    setError("")
    try {
      const expensesRes = await getExpenses(company.$id)
      setExpenses(expensesRes.documents || [])
    } catch (err) {
      console.error("Error loading expenses:", err)
      setError("Failed to load expenses. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const filteredExpenses = useMemo(() => {
    let filtered = [...expenses]

    // Filter by category
    if (categoryFilter !== "all") {
      filtered = filtered.filter(e => e.category === categoryFilter)
    }

    // Filter by date range
    if (dateRangeStart) {
      const startDate = new Date(dateRangeStart)
      startDate.setHours(0, 0, 0, 0)
      filtered = filtered.filter(e => {
        const expenseDate = new Date(e.expenseDate)
        expenseDate.setHours(0, 0, 0, 0)
        return expenseDate >= startDate
      })
    }

    if (dateRangeEnd) {
      const endDate = new Date(dateRangeEnd)
      endDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter(e => {
        const expenseDate = new Date(e.expenseDate)
        return expenseDate <= endDate
      })
    }

    // Sort by date DESC
    filtered.sort((a, b) => {
      const dateA = new Date(a.expenseDate || a.$createdAt).getTime()
      const dateB = new Date(b.expenseDate || b.$createdAt).getTime()
      return dateB - dateA
    })

    return filtered
  }, [expenses, categoryFilter, dateRangeStart, dateRangeEnd])

  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
      })
    } catch {
      return dateString
    }
  }

  const formatCurrency = (amount) => {
    return `₹${(amount || 0).toFixed(2)}`
  }

  const handleEdit = (expense) => {
    setSelectedExpense(expense)
    setShowEditModal(true)
  }

  const handleDelete = async (expense) => {
    if (!confirm(`Delete expense "${expense.title}"? This action cannot be undone.`)) {
      return
    }

    try {
      await deleteExpense(expense.$id)
      loadExpenses()
    } catch (err) {
      console.error("Error deleting expense:", err)
      alert("Failed to delete expense. Please try again.")
    }
  }

  const handleExpenseSaved = () => {
    loadExpenses()
    setShowAddModal(false)
    setShowEditModal(false)
    setSelectedExpense(null)
  }

  // Calculate totals
  const totalAmount = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)

  if (loading) {
    return (
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <span className="material-symbols-outlined animate-spin text-4xl text-primary mb-2">
              sync
            </span>
            <p className="text-gray-500">Loading expenses...</p>
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
              onClick={loadExpenses}
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
              Expenses
            </h2>
            <p className="text-sm text-[#5e878d] font-medium">
              Track operational costs and non-supplier expenses.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 h-11 px-6 rounded-lg bg-primary text-white font-bold shadow"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Add Expense
          </button>
        </div>
      </header>

      {/* FILTERS */}
      <div className="bg-[#f0f4f5]/60 px-6 py-4 flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setCategoryFilter("all")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
              categoryFilter === "all"
                ? "bg-primary text-white"
                : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            All Categories
          </button>
          {EXPENSE_CATEGORIES.map((category) => (
            <button
              key={category.value}
              onClick={() => setCategoryFilter(category.value)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                categoryFilter === category.value
                  ? "bg-primary text-white"
                  : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>

        {/* Date Range */}
        <div className="flex gap-2">
          <input
            type="date"
            value={dateRangeStart}
            onChange={(e) => setDateRangeStart(e.target.value)}
            placeholder="Start Date"
            className="px-4 py-2.5 rounded-xl border border-[#dae5e7] bg-white text-sm focus:ring-2 focus:ring-primary/50 outline-none"
          />
          <input
            type="date"
            value={dateRangeEnd}
            onChange={(e) => setDateRangeEnd(e.target.value)}
            placeholder="End Date"
            className="px-4 py-2.5 rounded-xl border border-[#dae5e7] bg-white text-sm focus:ring-2 focus:ring-primary/50 outline-none"
          />
          {(dateRangeStart || dateRangeEnd) && (
            <button
              onClick={() => {
                setDateRangeStart("")
                setDateRangeEnd("")
              }}
              className="px-4 py-2.5 rounded-xl border border-[#dae5e7] bg-white text-sm hover:bg-gray-50 transition"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* SUMMARY */}
      {filteredExpenses.length > 0 && (
        <div className="px-6 py-3 bg-white border-b border-[#dae5e7]">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing <span className="font-semibold">{filteredExpenses.length}</span> expense{filteredExpenses.length !== 1 ? 's' : ''}
            </p>
            <p className="text-sm font-bold text-red-600">
              Total: {formatCurrency(totalAmount)}
            </p>
          </div>
        </div>
      )}

      {/* TABLE */}
      <section className="flex-1 overflow-auto p-6">
        {filteredExpenses.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#dae5e7] p-12 text-center">
            <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">
              receipt_long
            </span>
            <h3 className="text-xl font-bold text-gray-600 mb-2">
              No Expenses Found
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {categoryFilter !== "all" || dateRangeStart || dateRangeEnd
                ? "Try adjusting your filters"
                : "Create your first expense to get started"}
            </p>
            {categoryFilter === "all" && !dateRangeStart && !dateRangeEnd && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
              >
                Add Expense
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#dae5e7] overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-[#f0f4f5]/60">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold uppercase w-40">Expense Date</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase">Title</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase w-32">Category</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-right w-32">Amount</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase">Notes</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-right w-32">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#f0f4f5]">
                {filteredExpenses.map((expense) => {
                  const categoryInfo = CATEGORY_MAP[expense.category] || CATEGORY_MAP.others

                  return (
                    <tr key={expense.$id} className="hover:bg-primary/5 transition">
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">
                          {formatDate(expense.expenseDate)}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-semibold">{expense.title || "-"}</p>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${categoryInfo.color}`}>
                          {categoryInfo.label}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <span className="font-bold text-red-600">
                          {formatCurrency(expense.amount)}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-500 max-w-xs truncate">
                          {expense.notes || "-"}
                        </p>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(expense)}
                            className="text-primary text-xs font-bold hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(expense)}
                            className="text-red-500 text-xs font-bold hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* MODALS */}
      <CreateExpenseModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        company={company}
        onExpenseSaved={handleExpenseSaved}
      />

      {selectedExpense && (
        <EditExpenseModal
          open={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setSelectedExpense(null)
          }}
          company={company}
          expense={selectedExpense}
          onExpenseSaved={handleExpenseSaved}
        />
      )}
    </main>
  )
}
