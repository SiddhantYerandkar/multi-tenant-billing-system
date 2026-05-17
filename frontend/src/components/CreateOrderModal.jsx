import { useEffect, useState } from "react"
import { getProducts } from "../services/productService"
import { getParties } from "../services/partyService"
import { getDynamicPricesForParty } from "../services/dynamicPricingService"

export default function CreateOrderModal({ open, onClose, onCreate, company }) {

    const [form, setForm] = useState({
        orderDate: "",
        partyId: "",
        jobType: "designing",
        orderNo: "",
        title: ""
    })

    const [products, setProducts] = useState([])
    const [parties, setParties] = useState([])
    const [priceMap, setPriceMap] = useState({})
    const [partySearch, setPartySearch] = useState("")
    const [showPartyDropdown, setShowPartyDropdown] = useState(false)

    const [items, setItems] = useState([
        { productId: "", price: 0, quantity: 1, total: 0 }
    ])

    const [loading, setLoading] = useState(false)

    /* ✅ HOOKS MUST BE HERE (always run) */

    useEffect(() => {
        if (!company?.$id || !open) return

        async function load() {
            const [prodRes, partyRes] = await Promise.all([
                getProducts(company.$id),
                getParties(company.$id)
            ])

            setProducts(prodRes.documents)
            setParties(partyRes.documents)
        }

        load()
    }, [company, open])

    useEffect(() => {
        if (!form.partyId || !open) return

        async function loadPrices() {
            const res = await getDynamicPricesForParty(company.$id, form.partyId)

            const map = {}
            res.documents.forEach(p => {
                map[p.productId] = p.price
            })

            setPriceMap(map)
        }

        loadPrices()
    }, [form.partyId, open])

    useEffect(() => {
        if (!form.partyId) return

        const selected = parties.find(p => p.$id === form.partyId)
        if (selected) {
            setPartySearch(selected.name)
        }
    }, [form.partyId, parties])

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest(".party-dropdown")) {
                setShowPartyDropdown(false)
            }
        }

        document.addEventListener("click", handleClickOutside)
        return () => document.removeEventListener("click", handleClickOutside)
    }, [])

    /* ✅ NOW safe to conditionally render */
    if (!open) return null


    /* ---------------- HANDLE ITEM CHANGE ---------------- */
    const updateItem = (index, key, value) => {
        const updated = [...items]
        updated[index][key] = value

        if (key === "productId") {
            const product = products.find(p => p.$id === value)

            let price = 0

            if (form.partyId) {
                // dynamic price OR fallback to base price
                price = priceMap[value] ?? product?.basePrice ?? 0
            } else {
                // no party → always base price
                price = product?.basePrice ?? 0
            }

            updated[index].price = price
        }

        if (key === "quantity") {
            updated[index].quantity = Number(value)
        }

        // recalc total
        updated[index].total =
            Number(updated[index].price || 0) *
            Number(updated[index].quantity || 0)

        setItems(updated)
    }

    const addItem = () => {
        setItems(prev => [...prev, { productId: "", price: 0, quantity: 1, total: 0 }])
    }

    const removeItem = (index) => {
        setItems(prev => prev.filter((_, i) => i !== index))
    }

    const grandTotal = items.reduce((sum, i) => sum + i.total, 0)

    /* ---------------- SUBMIT ---------------- */
    const handleSubmit = async () => {
        if (!form.partyId) {
            alert("Select party")
            return
        }

        if (!form.orderNo) {
            alert("Enter order number")
            return
        }

        if (items.length === 0) {
            alert("Add at least one item")
            return
        }

        setLoading(true)

        await onCreate({
            ...form,
            companyId: company.$id,
            items
        })

        setLoading(false)
        onClose()
    }

    const filteredParties = parties.filter(p =>
        p.name?.toLowerCase().includes(partySearch.toLowerCase()) ||
        p.partyCode?.toLowerCase().includes(partySearch.toLowerCase()) ||
        p.phone?.toLowerCase().includes(partySearch.toLowerCase())
    )

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

            <div className="bg-white w-full max-w-4xl rounded-xl shadow-lg">

                {/* HEADER */}
                <div className="px-6 py-4 border-b border-[#dae5e7] flex justify-between">
                    <h2 className="text-xl font-bold">Create Order</h2>
                    <button onClick={onClose}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* BODY */}
                <div className="p-6 space-y-6">

                    {/* BASIC INFO */}
                    <div className="grid grid-cols-3 gap-4">

                        <Input
                            label="Order Date"
                            type="date"
                            value={form.orderDate}
                            onChange={v => setForm({ ...form, orderDate: v })}
                        />


                        <Input
                            label="Title"
                            value={form.title}
                            onChange={v => setForm({ ...form, title: v })}
                        />

                        <Input
                            label="Order No"
                            value={form.orderNo}
                            onChange={v => setForm({ ...form, orderNo: v })}
                        />

                        <div className="flex flex-col party-dropdown">
                            <label className="text-xs font-semibold text-gray-500 mb-1">
                                Party
                            </label>

                            {/* INPUT */}
                            <input
                                value={partySearch}
                                onChange={(e) => {
                                    setPartySearch(e.target.value)
                                    setShowPartyDropdown(true)
                                }}
                                onFocus={() => setShowPartyDropdown(true)}
                                placeholder="Search party..."
                                className="px-3 py-2 rounded-lg border border-[#dae5e7] text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                            />

                            {/* DROPDOWN */}
                            {showPartyDropdown && (
                                <div className="mt-1 w-full bg-white border border-[#dae5e7] rounded-lg shadow-lg max-h-30 overflow-auto">
                                    {filteredParties.length === 0 ? (
                                        <div className="p-3 text-sm text-gray-500">
                                            No party found
                                        </div>
                                    ) : (
                                        filteredParties.map(p => (
                                            <div
                                                key={p.$id}
                                                onClick={() => {
                                                    setForm({ ...form, partyId: p.$id })
                                                    setPartySearch(p.name)
                                                    setShowPartyDropdown(false)
                                                }}
                                                className={`px-3 py-2 cursor-pointer hover:bg-primary/10 flex flex-col ${form.partyId === p.$id ? "bg-primary/5" : ""
                                                    }`}
                                            >
                                                <span className="font-medium">{p.name}</span>
                                                <span className="text-xs text-gray-500">
                                                    {p.partyCode} • {p.phone || "No phone"}
                                                </span>
                                            </div>
                                        ))
                                    )}

                                </div>
                            )}
                        </div>

                        <Select
                            label="Job Type"
                            value={form.jobType}
                            onChange={v => setForm({ ...form, jobType: v })}
                            options={[
                                { label: "Designing", value: "designing" },
                                { label: "Printing", value: "printing" }
                            ]}
                        />

                    </div>

                    {/* ITEMS */}
                    <div className="border border-[#dae5e7] rounded-lg overflow-hidden">

                        <table className="w-full text-left">
                            <thead className="bg-[#f0f4f5]/60">
                                <tr>
                                    <th className="px-4 py-3 text-xs font-bold uppercase">Product</th>
                                    <th className="px-4 py-3 text-xs font-bold uppercase">Price</th>
                                    <th className="px-4 py-3 text-xs font-bold uppercase">Qty</th>
                                    <th className="px-4 py-3 text-xs font-bold uppercase">Total</th>
                                    <th></th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-[#f0f4f5]">
                                {items.map((item, i) => (
                                    <tr key={i}>

                                        <td className="px-4 py-3">
                                            <select
                                                value={item.productId}
                                                onChange={(e) => updateItem(i, "productId", e.target.value)}
                                                className="w-full px-2 py-2 border rounded"
                                            >
                                                <option value="">Select Product</option>
                                                {products.map(p => (
                                                    <option key={p.$id} value={p.$id}>
                                                        {p.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>

                                        <td className="px-4 py-3 text-sm">
                                            ₹{item.price}
                                        </td>

                                        <td className="px-4 py-3">
                                            <input
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) => updateItem(i, "quantity", e.target.value)}
                                                className="w-20 px-2 py-1 border rounded"
                                            />
                                        </td>

                                        <td className="px-4 py-3 font-medium">
                                            ₹{item.total}
                                        </td>

                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => removeItem(i)}
                                                className="text-red-500"
                                            >
                                                ✕
                                            </button>
                                        </td>

                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* ADD ITEM */}
                        <div className="p-4">
                            <button
                                onClick={addItem}
                                className="text-primary font-medium"
                            >
                                + Add Item
                            </button>
                        </div>

                    </div>

                    {/* TOTAL */}
                    <div className="flex justify-end text-lg font-bold">
                        Total: ₹{grandTotal}
                    </div>

                </div>

                {/* FOOTER */}
                <div className="px-6 py-4 border-t border-[#dae5e7] flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border rounded-lg"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-6 py-2 bg-primary text-white rounded-lg font-bold"
                    >
                        {loading ? "Creating..." : "Create Order"}
                    </button>
                </div>

            </div>
        </div>
    )
}

/* ---------- SMALL COMPONENTS ---------- */

function Input({ label, value, onChange, type = "text" }) {
    return (
        <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-500 mb-1">
                {label}
            </label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="px-3 py-2 rounded-lg border border-[#dae5e7] text-sm focus:ring-2 focus:ring-primary/50 outline-none"
            />
        </div>
    )
}

function Select({ label, value, onChange, options }) {
    return (
        <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-500 mb-1">
                {label}
            </label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="px-3 py-2 rounded-lg border border-[#dae5e7] text-sm focus:ring-2 focus:ring-primary/50 outline-none"
            >
                <option value="">Select</option>
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    )
}