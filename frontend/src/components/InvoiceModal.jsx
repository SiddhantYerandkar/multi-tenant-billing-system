import { useEffect, useState, useCallback } from "react"
import { getProducts } from "../services/productService"
import { getParties } from "../services/partyService"
import { getDynamicPricesForParty } from "../services/dynamicPricingService"
import { generateInvoiceNumber } from "../services/invoiceService"
import { generateInvoiceHTML } from "../template/invoiceTemplate"
import { logo, qr } from '../utils/assets'

function parseItems(raw) {
    if (!raw) return []
    if (Array.isArray(raw)) return raw
    if (typeof raw === "string") {
        try {
            const p = JSON.parse(raw)
            return Array.isArray(p) ? p : []
        } catch {
            return []
        }
    }
    return []
}

function lineTotal(price, qty) {
    return Number(price || 0) * Number(qty || 0)
}

export default function InvoiceModal({
    open,
    onClose,
    company,
    onCreate,
    onUpdate,
    initialDraft,
    editInvoice,
    mode = "create"
}) {
    const [form, setForm] = useState({
        invoiceNo: "",
        date: "",
        partyId: "",
        orderId: "",
        paidAmount: "0",
        title: ""
    })


    const [products, setProducts] = useState([])
    const [parties, setParties] = useState([])
    const [priceMap, setPriceMap] = useState({})
    const [partySearch, setPartySearch] = useState("")
    const [showPartyDropdown, setShowPartyDropdown] = useState(false)
    const [items, setItems] = useState([
        { productId: "", price: 0, quantity: 1, totalAmount: 0 },
    ])
    const [loading, setLoading] = useState(false)

    const isEdit = Boolean(editInvoice?.$id)
    const isView = mode === "view"

    const resetFromEdit = useCallback(
        (inv) => {
            const lines = parseItems(inv.items).map((i) => ({
                productId: i.productId || "",
                price: Number(i.price || 0),
                quantity: Number(i.quantity || 0),
                totalAmount: Number(i.totalAmount ?? lineTotal(i.price, i.quantity)),
            }))
            setForm({
                invoiceNo: String(inv.invoiceNo ?? ""),
                date: inv.date ? String(inv.date).slice(0, 10) : "",
                partyId: inv.partyId || "",
                orderId: inv.orderId || "",
                paidAmount: String(inv.paidAmount ?? 0),
                title: inv.title || "",
            })
            setItems(
                lines.length
                    ? lines
                    : [{ productId: "", price: 0, quantity: 1, totalAmount: 0 }]
            )
            setPartySearch("")
        },
        []
    )

    const resetFromDraft = useCallback((draft) => {
        const lines = (draft.items || []).map((i) => ({
            productId: i.productId || "",
            price: Number(i.price || 0),
            quantity: Number(i.quantity || 0),
            totalAmount: Number(
                i.totalAmount ?? lineTotal(i.price, i.quantity)
            ),
        }))
        setForm({
            invoiceNo: generateInvoiceNumber(),
            date: draft.orderDate
                ? String(draft.orderDate).slice(0, 10)
                : new Date().toISOString().slice(0, 10),
            partyId: draft.partyId || "",
            orderId: draft.orderId || "",
            paidAmount: "0",
            title: draft.title || "",
        })
        setItems(
            lines.length
                ? lines
                : [{ productId: "", price: 0, quantity: 1, totalAmount: 0 }]
        )
        setPartySearch(draft.partyName || "")
    }, [])

    const resetEmpty = useCallback(() => {
        setForm({
            invoiceNo: generateInvoiceNumber(),
            date: new Date().toISOString().slice(0, 10),
            partyId: "",
            orderId: "",
            paidAmount: "0",
            title: "",
        })
        setItems([{ productId: "", price: 0, quantity: 1, totalAmount: 0 }])
        setPartySearch("")
    }, [])

    useEffect(() => {
        if (!company?.$id || !open) return

        async function load() {
            const [prodRes, partyRes] = await Promise.all([
                getProducts(company.$id),
                getParties(company.$id),
            ])
            setProducts(prodRes.documents || [])
            setParties(partyRes.documents || [])
        }

        load()
    }, [company, open])

    useEffect(() => {
        if (!open) return
        if (editInvoice?.$id) {
            resetFromEdit(editInvoice)
            return
        }
        if (
            initialDraft &&
            (initialDraft.orderId ||
                initialDraft.partyId ||
                (initialDraft.items && initialDraft.items.length > 0))
        ) {
            resetFromDraft(initialDraft)
            return
        }
        resetEmpty()
    }, [open, editInvoice, initialDraft, resetFromEdit, resetFromDraft, resetEmpty])

    useEffect(() => {
        if (!form.partyId || !open) return
        async function loadPrices() {
            const res = await getDynamicPricesForParty(company.$id, form.partyId)
            const map = {}
                ; (res.documents || []).forEach((p) => {
                    map[p.productId] = p.price
                })
            setPriceMap(map)
        }

        loadPrices()
    }, [form.partyId, open, company])

    useEffect(() => {
        if (!form.partyId) return
        const selected = parties.find((p) => p.$id === form.partyId)
        if (selected) setPartySearch(selected.name)
    }, [form.partyId, parties])

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest(".invoice-party-dropdown")) {
                setShowPartyDropdown(false)
            }
        }
        document.addEventListener("click", handleClickOutside)
        return () => document.removeEventListener("click", handleClickOutside)
    }, [])

    if (!open) return null

    const updateItem = (index, key, value) => {
        const updated = [...items]
        updated[index] = { ...updated[index], [key]: value }

        if (key === "productId") {
            const product = products.find((p) => p.$id === value)
            let price = 0
            if (form.partyId) {
                price = priceMap[value] ?? product?.basePrice ?? 0
            } else {
                price = product?.basePrice ?? 0
            }
            updated[index].price = Number(price)
        }

        if (key === "quantity") {
            updated[index].quantity = Number(value)
        }

        if (key === "price") {
            updated[index].price = Number(value)
        }

        updated[index].totalAmount = lineTotal(
            updated[index].price,
            updated[index].quantity
        )

        setItems(updated)
    }

    const addItem = () => {
        setItems((prev) => [
            ...prev,
            { productId: "", price: 0, quantity: 1, totalAmount: 0 },
        ])
    }

    const removeItem = (index) => {
        setItems((prev) => prev.filter((_, i) => i !== index))
    }

    const grandTotal = items.reduce((sum, i) => sum + Number(i.totalAmount || 0), 0)

    const filteredParties = parties.filter(
        (p) =>
            p.name?.toLowerCase().includes(partySearch.toLowerCase()) ||
            p.partyCode?.toLowerCase().includes(partySearch.toLowerCase()) ||
            p.phone?.toLowerCase().includes(partySearch.toLowerCase())
    )

    const handleSubmit = async () => {
        if (isView) return
        if (!form.invoiceNo?.trim()) {
            alert("Enter invoice number")
            return
        }
        if (!form.partyId) {
            alert("Select party")
            return
        }
        if (items.length === 0 || !items.some((i) => i.productId)) {
            alert("Add at least one line with a product")
            return
        }

        const linePayload = items
            .filter((i) => i.productId)
            .map((i) => ({
                productId: i.productId,
                price: Number(i.price || 0),
                quantity: Number(i.quantity || 0),
                totalAmount: Number(i.totalAmount || lineTotal(i.price, i.quantity)),
            }))

        const payload = {
            invoiceNo: form.invoiceNo.trim(),
            date: form.date
                ? new Date(form.date).toISOString()
                : new Date().toISOString(),
            partyId: form.partyId,
            orderId: form.orderId || undefined,
            items: linePayload,
            totalAmount: grandTotal,
            paidAmount: Number(form.paidAmount || 0),
            title: form.title,
        }

        setLoading(true)
        try {
            if (isEdit) {
                await onUpdate(editInvoice.$id, payload)
            } else {
                await onCreate(payload)
            }
            onClose()
        } catch (e) {
            console.error(e)
            alert(e?.message || "Could not save invoice")
        } finally {
            setLoading(false)
        }
    }

    const handleDownloadPDF = async () => {
        const party = parties.find(p => p.$id === form.partyId)

        const html = generateInvoiceHTML({
            company,
            form,
            items,
            party,
            products,
            grandTotal,
            logoUrl: logo,
            qrCodeUrl: qr,
        })

        const res = await window.electronAPI.generatePDF({
            html,
            fileName: `Invoice-${form.invoiceNo}`
        })

        if (res?.success) {
            alert("Saved at: " + res.filePath)
        }
    }

    const handlePrint = async () => {
        const party = parties.find(p => p.$id === form.partyId)

        const html = generateInvoiceHTML({
            company,
            form,
            items,
            party,
            products,
            grandTotal
        })

        await window.electronAPI.printInvoice(html)
    }

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div id="invoice-print" className="bg-white w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-xl shadow-lg">
                <div className="px-6 py-4 border-b border-[#dae5e7] flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold">
                        {isView ? "Invoice" : isEdit ? "Edit invoice" : "Create invoice"}
                    </h2>
                    <button type="button" onClick={onClose} aria-label="Close">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Field label="Invoice no">
                            <input
                                value={form.invoiceNo}
                                disabled={isView}
                                onChange={(e) =>
                                    setForm({ ...form, invoiceNo: e.target.value })
                                }
                                className="w-full px-3 py-2 rounded-lg border border-[#dae5e7] text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                            />
                        </Field>
                        <Field label="Date">
                            <input
                                type="date"
                                value={form.date}
                                disabled={isView}
                                onChange={(e) =>
                                    setForm({ ...form, date: e.target.value })
                                }
                                className="w-full px-3 py-2 rounded-lg border border-[#dae5e7] text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                            />
                        </Field>
                        <Field label="Paid amount">
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.paidAmount}
                                disabled={isView}
                                onChange={(e) =>
                                    setForm({ ...form, paidAmount: e.target.value })
                                }
                                className="w-full px-3 py-2 rounded-lg border border-[#dae5e7] text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                            />
                        </Field>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col invoice-party-dropdown">

                            <label className="text-xs font-semibold text-gray-500 mb-1">
                                Party
                            </label>
                            <input
                                value={partySearch}
                                disabled={isView}
                                onChange={(e) => {
                                    setPartySearch(e.target.value)
                                    setShowPartyDropdown(true)
                                }}
                                onFocus={() => setShowPartyDropdown(true)}
                                placeholder="Search party..."
                                className="px-3 py-2 rounded-lg border border-[#dae5e7] text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                            />
                            {showPartyDropdown && (
                                <div className="mt-1 w-full bg-white border border-[#dae5e7] rounded-lg shadow-lg max-h-48 overflow-auto z-20">
                                    {filteredParties.length === 0 ? (
                                        <div className="p-3 text-sm text-gray-500">
                                            No party found
                                        </div>
                                    ) : (
                                        filteredParties.map((p) => (
                                            <div
                                                key={p.$id}
                                                onClick={() => {
                                                    if (isView) return
                                                    setForm({ ...form, partyId: p.$id })
                                                    setPartySearch(p.name)
                                                    setShowPartyDropdown(false)
                                                }}
                                                className={`px-3 py-2 cursor-pointer hover:bg-primary/10 ${form.partyId === p.$id ? "bg-primary/5" : ""
                                                    }`}
                                            >
                                                <span className="font-medium">{p.name}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                        </div>

                        <div className="grid grid-cols-1">
                            <label className="text-xs font-semibold text-gray-500 mb-1">
                                Title
                            </label>
                            <input
                                value={form.title}
                                disabled={isView}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-[#dae5e7] text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                            />
                        </div>
                    </div>

                    <div className="border border-[#dae5e7] rounded-lg overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-[#f0f4f5]/60">
                                <tr>
                                    <th className="px-4 py-3 text-xs font-bold uppercase">
                                        Product
                                    </th>
                                    <th className="px-4 py-3 text-xs font-bold uppercase">
                                        Price
                                    </th>
                                    <th className="px-4 py-3 text-xs font-bold uppercase">
                                        Qty
                                    </th>
                                    <th className="px-4 py-3 text-xs font-bold uppercase">
                                        Total
                                    </th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#f0f4f5]">
                                {items.map((item, i) => (
                                    <tr key={i}>
                                        <td className="px-4 py-3">
                                            <select
                                                value={item.productId}
                                                disabled={isView}
                                                onChange={(e) =>
                                                    updateItem(i, "productId", e.target.value)
                                                }
                                                className="w-full px-2 py-2 border border-[#dae5e7] rounded text-sm"
                                            >
                                                <option value="">Select product</option>
                                                {products.map((p) => (
                                                    <option key={p.$id} value={p.$id}>
                                                        {p.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="number"
                                                disabled={isView}
                                                min="0"
                                                step="0.01"
                                                value={item.price}
                                                onChange={(e) =>
                                                    updateItem(i, "price", e.target.value)
                                                }
                                                className="w-24 px-2 py-1 border border-[#dae5e7] rounded text-sm"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="number"
                                                min="1"
                                                disabled={isView}
                                                value={item.quantity}
                                                onChange={(e) =>
                                                    updateItem(i, "quantity", e.target.value)
                                                }
                                                className="w-20 px-2 py-1 border border-[#dae5e7] rounded text-sm"
                                            />
                                        </td>
                                        <td className="px-4 py-3 font-medium text-sm">
                                            ₹{Number(item.totalAmount || 0).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3">
                                            {
                                                !isView && (<button
                                                    type="button"
                                                    onClick={() => removeItem(i)}
                                                    className="text-red-500"
                                                >
                                                    ✕
                                                </button>)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="p-4 border-t border-[#f0f4f5]">
                            {!isView && (<button
                                type="button"
                                onClick={addItem}
                                className="text-primary font-medium text-sm"
                            >
                                + Add line
                            </button>)}
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-2">
                        <p className="text-lg font-bold">
                            Total: ₹{grandTotal.toFixed(2)}
                        </p>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-[#dae5e7] flex justify-end gap-3 sticky bottom-0 bg-white">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-[#dae5e7] rounded-lg"
                    >
                        {isView ? "Close" : "Cancel"}
                    </button>
                    {!isView ? (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-6 py-2 bg-primary text-white rounded-lg font-bold"
                        >
                            {loading ? "Saving…" : isEdit ? "Update invoice" : "Create invoice"}
                        </button>
                    ) : null}
                    {isView && (
                        <>
                            <button
                                onClick={handleDownloadPDF}
                                className="px-6 py-2 bg-black text-white rounded-lg"
                            >
                                Download PDF
                            </button>

                            <button
                                onClick={handlePrint}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg"
                            >
                                Print
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

function Field({ label, children }) {
    return (
        <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-500 mb-1">{label}</label>
            {children}
        </div>
    )
}
