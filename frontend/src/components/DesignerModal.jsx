import { useEffect, useState } from "react"

export default function DesignerModal({ open, onClose, onCreate, editData }) {
    const [form, setForm] = useState({
        name: "",
        email: "",
        mobile: "",
        rate: "",
        sizeRates: [{ size: "", rate: "" }],
    })
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (editData) {
            setForm({
                name: editData.name || "",
                email: editData.email || "",
                mobile: editData.mobile || editData.phone || "",
                rate: editData.rate ?? "",
                sizeRates: Array.isArray(editData.sizeRates) && editData.sizeRates.length > 0
                    ? editData.sizeRates.map((entry) => ({
                        size: entry?.size || "",
                        rate: entry?.rate ?? "",
                    }))
                    : [{ size: "", rate: "" }],
            })
        } else {
            setForm({
                name: "",
                email: "",
                mobile: "",
                rate: "",
                sizeRates: [{ size: "", rate: "" }],
            })
        }
    }, [editData])

    const handleSubmit = async () => {
        if (!form.name) {
            alert("Name is required")
            return
        }

        setLoading(true)
        try {
            const cleanedSizeRates = (form.sizeRates || [])
                .map((entry) => ({
                    size: String(entry?.size || "").trim(),
                    rate: Number(entry?.rate || 0),
                }))
                .filter((entry) => entry.size && entry.rate >= 0)

            await onCreate({
                ...form,
                rate: Number(form.rate || 0),
                sizeRates: cleanedSizeRates,
            })

            setForm({
                name: "",
                email: "",
                mobile: "",
                rate: "",
                sizeRates: [{ size: "", rate: "" }],
            })
            onClose()
        } finally {
            setLoading(false)
        }
    }

    const updateSizeRateRow = (index, key, value) => {
        setForm((prev) => ({
            ...prev,
            sizeRates: prev.sizeRates.map((entry, i) =>
                i === index ? { ...entry, [key]: value } : entry
            ),
        }))
    }

    const addSizeRateRow = () => {
        setForm((prev) => ({
            ...prev,
            sizeRates: [...prev.sizeRates, { size: "", rate: "" }],
        }))
    }

    const removeSizeRateRow = (index) => {
        setForm((prev) => {
            if (prev.sizeRates.length <= 1) {
                return { ...prev, sizeRates: [{ size: "", rate: "" }] }
            }
            return {
                ...prev,
                sizeRates: prev.sizeRates.filter((_, i) => i !== index),
            }
        })
    }

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="w-full max-w-xl bg-white rounded-xl shadow-xl border border-[#dae5e7] overflow-hidden">
                <div className="px-6 py-4 border-b border-[#dae5e7] flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold">{editData ? "Edit Designer" : "Add Designer"}</h2>
                        <p className="text-sm text-[#5e878d]">Enter basic designer details.</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-500 hover:text-black">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="p-6 space-y-4 bg-[#f0f4f5]/20">
                    <div>
                        <label className="block text-xs font-bold uppercase text-[#3f6268] mb-2">Name *</label>
                        <input
                            type="text"
                            placeholder="Enter designer name"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-lg bg-white border border-[#dae5e7] text-sm focus:ring-2 focus:ring-primary/40 outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase text-[#3f6268] mb-2">Email</label>
                            <input
                                type="email"
                                placeholder="name@example.com"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-lg bg-white border border-[#dae5e7] text-sm focus:ring-2 focus:ring-primary/40 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase text-[#3f6268] mb-2">Mobile</label>
                            <input
                                type="tel"
                                placeholder="Enter mobile number"
                                value={form.mobile}
                                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-lg bg-white border border-[#dae5e7] text-sm focus:ring-2 focus:ring-primary/40 outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-[#3f6268] mb-2">Default Rate</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Enter designer rate"
                            value={form.rate}
                            onChange={(e) => setForm({ ...form, rate: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-lg bg-white border border-[#dae5e7] text-sm focus:ring-2 focus:ring-primary/40 outline-none"
                        />
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="block text-xs font-bold uppercase text-[#3f6268]">
                                Size-wise Rates
                            </label>
                            <button
                                type="button"
                                onClick={addSizeRateRow}
                                className="px-3 py-1.5 text-xs font-semibold rounded border border-[#dae5e7] text-[#2f4f54] hover:bg-primary/5"
                            >
                                Add Size Rate
                            </button>
                        </div>

                        {form.sizeRates.map((entry, index) => (
                            <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
                                <input
                                    type="text"
                                    placeholder="Size (e.g. 12x36)"
                                    value={entry.size}
                                    onChange={(e) => updateSizeRateRow(index, "size", e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg bg-white border border-[#dae5e7] text-sm focus:ring-2 focus:ring-primary/40 outline-none"
                                />
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="Rate for this size"
                                    value={entry.rate}
                                    onChange={(e) => updateSizeRateRow(index, "rate", e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg bg-white border border-[#dae5e7] text-sm focus:ring-2 focus:ring-primary/40 outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeSizeRateRow(index)}
                                    className="px-3 py-2 rounded-lg border border-[#dae5e7] text-red-600 hover:bg-red-50"
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-[#dae5e7] bg-white flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg border border-[#dae5e7] text-[#2f4f54] hover:bg-primary/5"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-5 py-2 rounded-lg bg-primary text-white font-semibold disabled:opacity-60"
                    >
                        {loading ? "Saving..." : editData ? "Update Designer" : "Add Designer"}
                    </button>
                </div>
            </div>
        </div>
    )
}