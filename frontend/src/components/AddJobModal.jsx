import { useState, useEffect } from "react"
import { createJob, generateJobNumber } from "../services/supplierJobService"

const JOB_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "billed", label: "Billed" },
  { value: "paid", label: "Paid" }
]

export default function AddJobModal({ open, onClose, supplier, company, onJobAdded }) {
  const [formData, setFormData] = useState({
    jobNo: "",
    description: "",
    invoiceAmount: "",
    jobDate: new Date().toISOString().split('T')[0],
    status: "pending"
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open && supplier?.$id && company?.$id) {
      loadJobNumber()
    }
  }, [open, supplier, company])

  async function loadJobNumber() {
    try {
      const jobNo = await generateJobNumber(company.$id, supplier.$id)
      setFormData(prev => ({ ...prev, jobNo }))
    } catch (err) {
      console.error("Error generating job number:", err)
    }
  }

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => (document.body.style.overflow = "")
  }, [open])

  if (!open) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    const amount = parseFloat(formData.invoiceAmount)
    if (!amount || amount <= 0) {
      setError("Invoice amount must be greater than 0")
      return
    }

    if (!formData.jobNo.trim()) {
      setError("Job number is required")
      return
    }

    setLoading(true)
    try {
      await createJob({
        companyId: company.$id,
        supplierId: supplier.$id,
        jobNo: formData.jobNo.trim(),
        description: formData.description.trim(),
        invoiceAmount: amount,
        jobDate: formData.jobDate,
        status: formData.status
      })

      if (onJobAdded) {
        onJobAdded()
      }
      onClose()
    } catch (err) {
      console.error("Error creating job:", err)
      setError(err.message || "Failed to create job")
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
          <h2 className="text-xl font-bold">Add Job Work</h2>
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

          {/* Job Number */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Job Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.jobNo}
              onChange={(e) => setFormData({ ...formData, jobNo: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              placeholder="JOB-YYYY-XXX"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
              rows="3"
              placeholder="Job description..."
            />
          </div>

          {/* Invoice Amount */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Invoice Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
              <input
                type="number"
                step="0.01"
                value={formData.invoiceAmount}
                onChange={(e) => setFormData({ ...formData, invoiceAmount: e.target.value })}
                className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {/* Job Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Job Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.jobDate}
              onChange={(e) => setFormData({ ...formData, jobDate: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              required
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            >
              {JOB_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
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
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">add_circle</span>
                  <span>Create Job</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
