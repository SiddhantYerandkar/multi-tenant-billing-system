import { useState, useEffect } from "react"
import { updateExpense } from "../services/expenseService"
import { getJobsGroupedByJobNo } from "../services/jobService"

const EXPENSE_CATEGORIES = [
  { value: "salary", label: "Salary" },
  { value: "petrol", label: "Petrol / Travel" },
  { value: "misc", label: "Miscellaneous" },
  { value: "rent", label: "Rent" },
  { value: "electricity", label: "Electricity" },
  { value: "others", label: "Others" }
]

export default function EditExpenseModal({ open, onClose, company, expense, onExpenseSaved }) {
  const [formData, setFormData] = useState({
    title: "",
    category: "misc",
    amount: "",
    expenseDate: "",
    notes: "",
    jobNo: ""
  })
  const [jobNos, setJobNos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open && expense) {
      setFormData({
        title: expense.title || "",
        category: expense.category || "misc",
        amount: expense.amount || "",
        expenseDate: expense.expenseDate ? expense.expenseDate.split('T')[0] : new Date().toISOString().split('T')[0],
        notes: expense.notes || "",
        jobNo: expense.jobNo || ""
      })
      setError("")
      
      // Load existing job numbers
      if (company?.$id) {
        getJobsGroupedByJobNo(company.$id)
          .then(jobsByJobNo => {
            setJobNos(Object.keys(jobsByJobNo).sort().reverse())
          })
          .catch(err => console.error("Error loading job numbers:", err))
      }
    }
  }, [open, expense, company])

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => (document.body.style.overflow = "")
  }, [open])

  if (!open || !expense) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (!formData.title.trim()) {
      setError("Title is required")
      return
    }

    if (!formData.category) {
      setError("Category is required")
      return
    }

    const amount = parseFloat(formData.amount)
    if (!amount || amount <= 0) {
      setError("Amount must be greater than 0")
      return
    }

    setLoading(true)
    try {
      await updateExpense(expense.$id, {
        title: formData.title.trim(),
        category: formData.category,
        amount: amount,
        expenseDate: formData.expenseDate,
        notes: formData.notes.trim() || null,
        jobNo: formData.jobNo || null
      })

      if (onExpenseSaved) {
        onExpenseSaved()
      }
    } catch (err) {
      console.error("Error updating expense:", err)
      setError(err.message || "Failed to update expense")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[560px] bg-white rounded-xl shadow-2xl border border-[#dae5e7] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#dae5e7] flex items-center justify-between">
          <h2 className="text-xl font-bold">Edit Expense</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-gray-500">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              placeholder="e.g., Petrol, Salary, Electricity Bill"
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              required
            >
              {EXPENSE_CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {/* Expense Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Expense Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.expenseDate}
              onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
              rows="3"
              placeholder="Additional notes or description..."
            />
          </div>

          {/* Link to Job (Optional) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Link to Job (Optional)
            </label>
            <select
              value={formData.jobNo}
              onChange={(e) => setFormData({ ...formData, jobNo: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            >
              <option value="">-- No Job --</option>
              {jobNos.map((jobNo) => (
                <option key={jobNo} value={jobNo}>
                  {jobNo}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Link this expense to a job for profit calculation
            </p>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-bold shadow-md shadow-primary/20 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">save</span>
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
