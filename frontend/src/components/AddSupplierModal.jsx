import { useEffect, useState } from "react"

export default function AddSupplierModal({ isOpen, onClose, onAddSupplier, supplierCode, supplierTypes = [] }) {
  const [formData, setFormData] = useState({
    name: "",
    supplierType: "designer",
    phone: "",
    address: "",
    openingBalance: "0"
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : ""
    return () => (document.body.style.overflow = "")
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: "",
        supplierType: "designer",
        phone: "",
        address: "",
        openingBalance: "0"
      })
      setLoading(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (!formData.name.trim()) return

    setLoading(true)
    try {
      await onAddSupplier({
        name: formData.name.trim(),
        supplierType: formData.supplierType,
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        openingBalance: parseFloat(formData.openingBalance) || 0,
      })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[560px] max-h-[90vh] bg-white rounded-xl shadow-2xl border border-[#dae5e7] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#dae5e7] flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-bold">Add New Supplier</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-gray-500">close</span>
          </button>
        </div>

        {/* Scrollable Form */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {/* Supplier Code */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Supplier Code
            </label>
            <input
              type="text"
              value={supplierCode || ""}
              disabled
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>

          {/* Supplier Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Supplier Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              placeholder="Enter supplier name"
              required
            />
          </div>

          {/* Supplier Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Supplier Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.supplierType}
              onChange={(e) => setFormData({ ...formData, supplierType: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            >
              {supplierTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Phone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              placeholder="Enter phone number"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Address
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
              rows="3"
              placeholder="Enter address"
            />
          </div>

          {/* Opening Balance */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Opening Balance
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
              <input
                type="number"
                step="0.01"
                value={formData.openingBalance}
                onChange={(e) => setFormData({ ...formData, openingBalance: e.target.value })}
                className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                placeholder="0.00"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Positive = you owe them, Negative = they owe you
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 bg-[#f0f4f5] flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !formData.name.trim()}
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
                <span>Create Supplier</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>

  )
}
