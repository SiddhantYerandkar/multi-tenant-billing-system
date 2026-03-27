import { useState, useEffect } from "react"
import { createJob, generateJobNumber } from "../services/supplierJobService"
import { getParties } from "../services/partyService"
import { getSuppliers } from "../services/supplierService"
import { linkJobToOrder } from "../services/orderService"
import { getJobsGroupedByJobNo } from "../services/jobService"

const SUPPLIER_TYPES = [
  { value: "designer", label: "Designer" },
  { value: "printer", label: "Printer" },
  { value: "binding", label: "Binding" }
]

export default function CreateJobModal({ open, onClose, company, onJobCreated, orderData }) {
  const [formData, setFormData] = useState({
    jobNo: "",
    partyId: "",
    description: "",
    jobDate: new Date().toISOString().split('T')[0],
    orderId: null
  })

  // Multiple suppliers with their costs
  const [supplierEntries, setSupplierEntries] = useState([
    { id: 1, supplierType: "designer", supplierId: "", cost: "", description: "", pages: "", size: "" }
  ])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [parties, setParties] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [useExistingJobNo, setUseExistingJobNo] = useState(false)
  const [existingJobNos, setExistingJobNos] = useState([])

  useEffect(() => {
    if (open && company?.$id) {
      loadData()
    }
  }, [open, company])

  async function loadData() {
    try {
      const [partiesRes, suppliersRes] = await Promise.all([
        getParties(company.$id),
        getSuppliers(company.$id)
      ])
      setParties(partiesRes.documents || [])
      setSuppliers(suppliersRes.documents || [])
      const jobsByJobNo = await getJobsGroupedByJobNo(company.$id)
      setExistingJobNos(Object.keys(jobsByJobNo).sort().reverse())
    } catch (err) {
      console.error("Error loading data:", err)
    }
  }

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => (document.body.style.overflow = "")
  }, [open])

  useEffect(() => {
    if (open) {
      if (orderData) {
        const initialSupplierType = mapOrderJobTypeToSupplierType(orderData.jobType)
        setFormData({
          jobNo: "",
          partyId: orderData.partyId || "",
          description: orderData.title || "",
          jobDate: orderData.orderDate || new Date().toISOString().split('T')[0],
          orderId: orderData.$id || null
        })
        setSupplierEntries([
          { id: 1, supplierType: initialSupplierType, supplierId: "", cost: "", description: orderData.title || "" }
        ])
      } else {
        setFormData({
          jobNo: "",
          partyId: "",
          description: "",
          jobDate: new Date().toISOString().split('T')[0],
          orderId: null
        })
        setSupplierEntries([
          { id: 1, supplierType: "designer", supplierId: "", cost: "", description: "" }
        ])
      }
      setUseExistingJobNo(false)
      setError("")
    }
  }, [open, orderData])

  function mapOrderJobTypeToSupplierType(orderJobType) {
    if (!orderJobType) return "designer"
    if (orderJobType === "designing" || orderJobType === "designing_printing") return "designer"
    if (orderJobType === "printing") return "printer"
    if (orderJobType === "binding") return "binding"
    return "designer"
  }

  async function generateNewJobNo() {
    if (!company?.$id) return

    try {
      const { getJobsGroupedByJobNo } = await import("../services/jobService")
      const jobsByJobNo = await getJobsGroupedByJobNo(company.$id)

      const existingNos = Object.keys(jobsByJobNo)

      let maxNum = 0

      existingNos.forEach(jn => {
        const num = parseInt(jn, 10)
        if (!isNaN(num) && num > maxNum) {
          maxNum = num
        }
      })

      const jobNo = String(maxNum + 1) // 👉 "1", "2", "3"

      setFormData(prev => ({ ...prev, jobNo }))
    } catch (err) {
      console.error("Error generating job number:", err)
    }
  }

  useEffect(() => {
    if (open && !useExistingJobNo && !formData.jobNo) {
      generateNewJobNo()
    }
  }, [open, useExistingJobNo])

  const getAvailableSuppliers = (supplierType) => {
    return suppliers.filter(s => s.supplierType === supplierType)
  }

  const addSupplierEntry = () => {
    const newId = Math.max(...supplierEntries.map(e => e.id)) + 1
    setSupplierEntries([
      ...supplierEntries,
      { id: newId, supplierType: "designer", supplierId: "", cost: "", description: "", pages: "", size: "" }
    ])
  }

  const removeSupplierEntry = (id) => {
    if (supplierEntries.length > 1) {
      setSupplierEntries(supplierEntries.filter(e => e.id !== id))
    }
  }

  const updateSupplierEntry = (id, field, value) => {
    setSupplierEntries(supplierEntries.map(entry => {
      if (entry.id === id) {
        const updated = { ...entry, [field]: value }
        if (field === "supplierType") {
          updated.supplierId = ""
        }
        return updated
      }
      return entry
    }))
  }

  const totalCost = supplierEntries.reduce((sum, entry) => {
    const cost = parseFloat(entry.cost) || 0
    return sum + cost
  }, 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (!formData.jobNo.trim()) {
      setError("Job number is required")
      return
    }

    if (!formData.partyId) {
      setError("Please select a customer")
      return
    }
    const validEntries = supplierEntries.filter(e => e.supplierId)

    setLoading(true)
    try {
      const jobNo = formData.jobNo.trim()

      for (const entry of validEntries) {
        await createJob({
          companyId: company.$id,
          supplierId: entry.supplierId,
          partyId: formData.partyId,
          jobNo: jobNo,
          jobType: entry.supplierType,
          description: entry.description || formData.description,
          invoiceAmount: entry.cost ? parseFloat(entry.cost) : 0,
          jobDate: formData.jobDate,
          status: "pending",
          orderId: formData.orderId || null,
          size: entry.size || "",
          pages: entry.pages ? Number(entry.pages) : 0,
        })
      }

      if (formData.orderId) {
        await linkJobToOrder(formData.orderId, jobNo)
      }

      if (onJobCreated) {
        onJobCreated(jobNo)
      }
      onClose()
    } catch (err) {
      console.error("Error creating job:", err)
      setError(err.message || "Failed to create job")
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[800px] bg-white rounded-xl shadow-2xl border border-[#dae5e7] overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#dae5e7] flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-bold">Create Job</h2>
            {orderData && (
              <p className="text-sm text-gray-500 mt-1">
                From Order: <span className="font-semibold text-primary">{orderData.orderNo}</span>
                {orderData.title && <span className="ml-2">- {orderData.title}</span>}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-gray-500">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Basic Info Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Job Number */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Job No <span className="text-red-500">*</span>
                </label>
                <label className="flex items-center gap-1 text-xs text-gray-500">
                  <input
                    type="checkbox"
                    checked={useExistingJobNo}
                    onChange={(e) => {
                      setUseExistingJobNo(e.target.checked)
                      if (!e.target.checked) {
                        generateNewJobNo()
                      }
                    }}
                    className="w-3 h-3"
                  />
                  Existing
                </label>
              </div>
              {useExistingJobNo ? (
                <select
                  value={formData.jobNo}
                  onChange={(e) => setFormData({ ...formData, jobNo: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
                  required
                >
                  <option value="">-- Select --</option>
                  {existingJobNos.map((jobNo) => (
                    <option key={jobNo} value={jobNo}>{jobNo}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={formData.jobNo}
                  onChange={(e) => setFormData({ ...formData, jobNo: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
                  placeholder="JOB-YYYY-XXX"
                  required
                />
              )}
            </div>

            {/* Customer */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Customer <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.partyId}
                onChange={(e) => setFormData({ ...formData, partyId: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
                required
                disabled={!!orderData?.partyId}
              >
                <option value="">-- Select Customer --</option>
                {parties.map((party) => (
                  <option key={party.$id} value={party.$id}>
                    {party.name}
                  </option>
                ))}
              </select>
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
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Job Description
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
              placeholder="e.g., Wedding Cards, Business Cards..."
            />
          </div>

          {/* Suppliers Section */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
              <h3 className="font-semibold text-gray-700">Suppliers & Costs</h3>
              <button
                type="button"
                onClick={addSupplierEntry}
                className="flex items-center gap-1 text-sm text-primary font-semibold hover:text-primary/80 transition"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                Add Supplier
              </button>
            </div>

            <div className="divide-y divide-gray-100">
              {supplierEntries.map((entry, index) => (
                <div key={entry.id} className="p-4 bg-white">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-2">
                      {index + 1}
                    </span>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                      {/* Supplier Type */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                        <select
                          value={entry.supplierType}
                          onChange={(e) => updateSupplierEntry(entry.id, "supplierType", e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
                        >
                          {SUPPLIER_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Supplier */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Supplier</label>
                        <select
                          value={entry.supplierId}
                          onChange={(e) => updateSupplierEntry(entry.id, "supplierId", e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
                        >
                          <option value="">-- Select --</option>
                          {getAvailableSuppliers(entry.supplierType).map((supplier) => (
                            <option key={supplier.$id} value={supplier.$id}>
                              {supplier.name}
                            </option>
                          ))}
                        </select>
                        {getAvailableSuppliers(entry.supplierType).length === 0 && (
                          <p className="text-xs text-red-500 mt-1">No suppliers</p>
                        )}
                      </div>

                      {/* Size */}

                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Size</label>
                        <input
                          type="text"
                          step="0.01"
                          value={entry.size || ""}
                          onChange={(e) => updateSupplierEntry(entry.id, "size", e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
                          placeholder="12x12"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Pages</label>
                        <input
                          type="number"
                          step="0.01"
                          value={entry.pages || ""}
                          onChange={(e) => updateSupplierEntry(entry.id, "pages", e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
                          placeholder="12"
                        />
                      </div>

                      {/* Cost */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Cost (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={entry.cost}
                          onChange={(e) => updateSupplierEntry(entry.id, "cost", e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
                          placeholder="0.00"
                        />
                      </div>

                      {/* Work Description */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Work Description</label>
                        <input
                          type="text"
                          value={entry.description}
                          onChange={(e) => updateSupplierEntry(entry.id, "description", e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
                          placeholder="Optional"
                        />
                      </div>
                    </div>

                    {/* Remove Button */}
                    {supplierEntries.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSupplierEntry(entry.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition mt-1"
                        title="Remove"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="bg-gray-50 px-4 py-3 flex items-center justify-end gap-4 border-t">
              <span className="text-sm text-gray-600">Total Supplier Cost:</span>
              <span className="text-lg font-bold text-primary">₹{totalCost.toFixed(2)}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 sticky bottom-0 bg-white pb-2">
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
                  <span>Create Job ({supplierEntries.filter(e => e.supplierId && e.cost).length} suppliers)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
