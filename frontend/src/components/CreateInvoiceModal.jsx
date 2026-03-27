import { useEffect, useMemo, useState } from "react"
import { getParties } from "../services/partyService"
import { getProducts } from "../services/productService"
import { getDynamicPrice } from "../services/dynamicPricingService"
import { createInvoice, createInvoiceItem, listInvoices } from "../services/invoiceService"

const EMPTY_LINE = {
    productId: "",
    qty: 1,
    unit: "Qty",
    price: 0,
}

export default function CreateInvoiceModal({ open, onClose, company, onInvoiceCreated }) {
    /* -------------------- HOOKS (ALWAYS FIRST) -------------------- */
    const [invoiceTitle, setInvoiceTitle] = useState("")
    const [invoiceNumber, setInvoiceNumber] = useState("")
    const [invoiceDate, setInvoiceDate] = useState("")
    const [status, setStatus] = useState("pending")
    const [selectedPartyId, setSelectedPartyId] = useState("")
    const [parties, setParties] = useState([])
    const [products, setProducts] = useState([])
    const [orderNumber, setOrderNumber] = useState("")
    const [items, setItems] = useState([EMPTY_LINE])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)

    const subtotal = useMemo(
        () => items.reduce((sum, i) => sum + i.qty * i.price, 0),
        [items]
    )

    // Load parties and products when modal opens
    useEffect(() => {
        if (open && company?.$id) {
            async function loadData() {
                try {
                    const [partiesRes, productsRes, invoicesRes] = await Promise.all([
                        getParties(company.$id),
                        getProducts(company.$id),
                        listInvoices(company.$id)
                    ])
                    setParties(partiesRes.documents)
                    setProducts(productsRes.documents)
                    
                    // Generate next invoice number (INV-001, INV-002, etc.)
                    const existingInvoices = invoicesRes.documents || []
                    const existingNumbers = existingInvoices
                        .map(inv => inv.invoiceNumber)
                        .filter(num => num && num.match(/^INV-\d+$/))
                        .map(num => parseInt(num.replace('INV-', ''), 10))
                    
                    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0
                    const nextNumber = maxNumber + 1
                    setInvoiceNumber(`INV-${String(nextNumber).padStart(3, '0')}`)
                    
                    // Set default date and status
                    const today = new Date().toISOString().split('T')[0]
                    setInvoiceDate(today)
                    setStatus("pending")
                } catch (error) {
                    console.error("Error loading data:", error)
                    alert("Failed to load parties or products")
                }
            }
            loadData()
        }
    }, [open, company])

    // Reset form when modal closes
    useEffect(() => {
        if (!open) {
            setInvoiceTitle("")
            setSelectedPartyId("")
            setItems([EMPTY_LINE])
            setInvoiceDate("")
            setStatus("pending")
            setInvoiceNumber("")
            setOrderNumber("")
        }
    }, [open])

    /* -------------------- EARLY EXIT AFTER HOOKS -------------------- */
    if (!open) return null

    /* -------------------- HANDLERS -------------------- */
    const updateItem = async (index, key, value) => {
        const updatedItems = items.map((it, i) =>
            i === index ? { ...it, [key]: value } : it
        )
        
        // If product is selected, fetch dynamic price
        if (key === "productId" && value && selectedPartyId && company?.$id) {
            const product = products.find(p => p.$id === value)
            if (product) {
                try {
                    const dynamicPrice = await getDynamicPrice(company.$id, selectedPartyId, value)
                    const price = dynamicPrice ? dynamicPrice.price : product.basePrice
                    updatedItems[index] = { ...updatedItems[index], price }
                } catch (error) {
                    console.error("Error fetching dynamic price:", error)
                    const product = products.find(p => p.$id === value)
                    updatedItems[index] = { ...updatedItems[index], price: product?.basePrice || 0 }
                }
            }
        }
        
        setItems(updatedItems)
    }

    const addItem = () => setItems([...items, EMPTY_LINE])
    const removeItem = index =>
        setItems(items.filter((_, i) => i !== index))

    const handleCreateInvoice = async () => {
        if (!selectedPartyId) {
            alert("Please select a party")
            return
        }

        if (!invoiceDate) {
            alert("Please select invoice date")
            return
        }

        if (!orderNumber) {
            alert("Please enter order number")
            return
        }

        const validItems = items.filter(item => item.productId && item.qty > 0)
        if (validItems.length === 0) {
            alert("Please add at least one item to the invoice")
            return
        }

        setSaving(true)
        try {
            // Check for duplicate invoice number
            const existingInvoicesRes = await listInvoices(company.$id)
            const existingNumbers = (existingInvoicesRes.documents || []).map(inv => inv.invoiceNumber)
            if (existingNumbers.includes(invoiceNumber)) {
                // Generate a new unique number
                const numbers = existingNumbers
                    .filter(num => num && num.match(/^INV-\d+$/))
                    .map(num => parseInt(num.replace('INV-', ''), 10))
                const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0
                const newInvoiceNumber = `INV-${String(maxNumber + 1).padStart(3, '0')}`
                setInvoiceNumber(newInvoiceNumber)
                alert(`Invoice number ${invoiceNumber} already exists. Using ${newInvoiceNumber} instead.`)
                setSaving(false)
                return
            }
            // Create invoice first (without items)
            const invoiceData = {
                invoiceNumber,
                invoiceTitle: invoiceTitle,
                invoiceDate: new Date(invoiceDate).toISOString(),
                partyId: selectedPartyId,
                companyId: company.$id,
                subTotal: subtotal,
                gstAmount: 0, // Can be added later if needed
                grandTotal: subtotal,
                paidAmount: 0,
                balanceAmount: subtotal,
                status: status,
                orderNo: orderNumber
            }

            const invoice = await createInvoice(invoiceData)
            
            // Create invoice items separately
            for (const item of validItems) {
                const product = products.find(p => p.$id === item.productId)
                const lineTotal = item.qty * item.price
                
                await createInvoiceItem({
                    companyId: company.$id,
                    invoiceId: invoice.$id,
                    productName: product?.name || "",
                    productId: item.productId,
                    quantity: item.qty,
                    rate: item.price,
                    discount: 0, // Can be added later if needed
                    total: lineTotal
                })
            }
            
            if (onInvoiceCreated) {
                onInvoiceCreated()
            }
            
            onClose()
        } catch (error) {
            console.error("Error creating invoice:", error)
            alert("Failed to create invoice. Please try again.")
        } finally {
            setSaving(false)
        }
    }

    /* -------------------- UI -------------------- */
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">

                {/* HEADER */}
                <div className="px-8 py-5 border-b border-zinc-200 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold">Create New Invoice</h2>
                        <span className="px-3 py-1 bg-zinc-100 text-zinc-500 text-xs font-mono rounded border">
                            #{invoiceNumber}
                        </span>
                    </div>

                    <button
                        onClick={onClose}
                        className="text-zinc-400 hover:text-zinc-600"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* BODY */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8">

                    {/* TOP FORM */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-zinc-700">
                                Select Party
                            </label>
                            <div className="relative">
                                <select
                                    value={selectedPartyId}
                                    onChange={e => setSelectedPartyId(e.target.value)}
                                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm appearance-none pr-10"
                                >
                                    <option value="">-- Select Party --</option>
                                    {parties.map(party => (
                                        <option key={party.$id} value={party.$id}>
                                            {party.name} {party.partyCode ? `(${party.partyCode})` : ''}
                                        </option>
                                    ))}
                                </select>
                                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
                                    expand_more
                                </span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-zinc-700">
                                Order Number
                            </label>
                            <input
                                type="text"
                                value={orderNumber}
                                onChange={e => setOrderNumber(e.target.value)}
                                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-zinc-700">
                                Invoice Date
                            </label>
                            <input
                                type="date"
                                value={invoiceDate}
                                onChange={e => setInvoiceDate(e.target.value)}
                                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-zinc-700">
                                Status
                            </label>
                            <div className="relative">
                                <select
                                    value={status}
                                    onChange={e => setStatus(e.target.value)}
                                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm appearance-none pr-10"
                                >
                                    <option value="draft">Draft</option>
                                    <option value="pending">Pending</option>
                                    <option value="paid">Paid</option>
                                </select>
                                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
                                    expand_more
                                </span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-zinc-700">
                                Invoice Title
                            </label>
                            <input
                                type="text"
                                value={invoiceTitle}
                                onChange={e => setInvoiceTitle(e.target.value)}
                                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm"
                            />
                        </div>

                    </div>

                    {/* LINE ITEMS */}
                    <div className="border border-zinc-200 rounded-xl overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-zinc-50 border-b border-zinc-200">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase">
                                        Product
                                    </th>
                                    <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase w-24">
                                        Qty
                                    </th>
                                    <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase w-32">
                                        Unit
                                    </th>
                                    <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase w-40">
                                        Price
                                    </th>
                                    <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase w-40 text-right">
                                        Line Total
                                    </th>
                                    <th className="w-12" />
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-zinc-100">
                                {items.map((item, i) => {
                                    const selectedProduct = products.find(p => p.$id === item.productId)
                                    return (
                                    <tr key={i}>
                                        <td className="px-6 py-4">
                                            <select
                                                value={item.productId}
                                                onChange={e => updateItem(i, "productId", e.target.value)}
                                                className="w-full bg-transparent border-none text-sm p-0"
                                            >
                                                <option value="">-- Select Product --</option>
                                                {products.map(product => (
                                                    <option key={product.$id} value={product.$id}>
                                                        {product.name} {product.sku ? `(${product.sku})` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>

                                        <td className="px-6 py-4">
                                            <input
                                                type="number"
                                                value={item.qty}
                                                onChange={e => updateItem(i, "qty", +e.target.value)}
                                                className="w-full bg-transparent border-none text-sm p-0"
                                            />
                                        </td>

                                        <td className="px-6 py-4">
                                            <select
                                                value={item.unit}
                                                onChange={e => updateItem(i, "unit", e.target.value)}
                                                className="w-full bg-transparent border-none text-sm p-0"
                                            >
                                                <option>Qty</option>
                                                <option>Page</option>
                                                <option>Book</option>
                                            </select>
                                        </td>

                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1">
                                                <span className="text-sm text-zinc-400">₹</span>
                                                <input
                                                    type="number"
                                                    value={item.price}
                                                    onChange={e => updateItem(i, "price", +e.target.value)}
                                                    className="w-full bg-transparent border-none text-sm p-0"
                                                    placeholder={selectedProduct ? `Base: ₹${selectedProduct.basePrice}` : "0.00"}
                                                />
                                            </div>
                                            {selectedProduct && item.price !== selectedProduct.basePrice && (
                                                <span className="text-xs text-zinc-400 mt-1 block">
                                                    Base: ₹{selectedProduct.basePrice}
                                                </span>
                                            )}
                                        </td>

                                        <td className="px-6 py-4 text-right text-sm font-bold">
                                            ₹{(item.qty * item.price).toFixed(2)}
                                        </td>

                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => removeItem(i)}
                                                className="text-zinc-300 hover:text-red-500"
                                            >
                                                <span className="material-symbols-outlined">
                                                    delete
                                                </span>
                                            </button>
                                        </td>
                                    </tr>
                                )})}
                            </tbody>
                        </table>

                        <div className="p-4 bg-zinc-50">
                            <button
                                onClick={addItem}
                                className="flex items-center gap-2 text-primary font-bold text-sm hover:underline"
                            >
                                <span className="material-symbols-outlined">
                                    add_circle
                                </span>
                                Add Line Item
                            </button>
                        </div>
                    </div>

                    {/* TOTALS */}
                    <div className="flex justify-end">
                        <div className="w-64 space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-500">Subtotal</span>
                                <span className="font-medium">₹{subtotal.toFixed(2)}</span>
                            </div>
                            
                            <div className="h-px bg-zinc-200" />

                            <div className="flex justify-between items-center pt-1">
                                <span className="text-base font-bold">Grand Total</span>
                                <span className="text-xl font-black text-primary">
                                    ₹{subtotal.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="px-8 py-5 bg-zinc-50 border-t border-zinc-200 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-lg text-sm font-bold text-zinc-600 hover:bg-zinc-100"
                    >
                        Cancel
                    </button>

                    <button 
                        onClick={handleCreateInvoice}
                        disabled={saving || !selectedPartyId}
                        className="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-bold shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                            <>
                                <span className="material-symbols-outlined animate-spin">sync</span>
                                Creating...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined">save</span>
                                Create Invoice
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
