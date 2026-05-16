import { useEffect, useState } from "react"

const getEntityId = (item) => item?.id || item?.$id

export default function PurchaseModal({ open, onClose, onCreate, company, editData }) {
    const [supplier, setSupplier] = useState("")
    const [itemDescription, setItemDescription] = useState("")
    const [quantity, setQuantity] = useState("")
    const [unitPrice, setUnitPrice] = useState("")
    const [totalAmount, setTotalAmount] = useState("")
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0])
    const [notes, setNotes] = useState("")

    const companyId = getEntityId(company)

    // Populate form when editing
    useEffect(() => {
        if (editData && open) {
            setSupplier(editData.supplier || "")
            setItemDescription(editData.itemDescription || "")
            setQuantity(editData.quantity?.toString() || "")
            setUnitPrice(editData.unitPrice?.toString() || "")
            setTotalAmount(editData.totalAmount?.toString() || "")
            setPurchaseDate(editData.purchaseDate || new Date().toISOString().split('T')[0])
            setNotes(editData.notes || "")
        } else if (!editData && open) {
            // Reset form for new purchase
            setSupplier("")
            setItemDescription("")
            setQuantity("")
            setUnitPrice("")
            setTotalAmount("")
            setPurchaseDate(new Date().toISOString().split('T')[0])
            setNotes("")
        }
    }, [editData, open])

    // Auto-calculate total amount when quantity or unit price changes
    const calculateTotal = () => {
        const qty = Number(quantity) || 0
        const price = Number(unitPrice) || 0
        const total = qty * price
        setTotalAmount(total.toString())
    }

    useEffect(() => {
        const qty = Number(quantity) || 0
        const price = Number(unitPrice) || 0
        const total = qty * price

        setTotalAmount(total.toString())
    }, [quantity, unitPrice])

    const handleSubmit = () => {
        if (!supplier || !itemDescription || !quantity || !unitPrice || !totalAmount || !purchaseDate) return

        const purchaseData = {
            companyId,
            supplier,
            itemDescription,
            quantity: Number(quantity),
            unitPrice: Number(unitPrice),
            totalAmount: Number(totalAmount),
            purchaseDate,
            notes: notes || ""
        }

        onCreate(purchaseData)
    }

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-[600px] bg-white dark:bg-[#2c3136] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-[#f0f4f5] dark:border-slate-700">
                    <h1 className="text-[#101818] dark:text-white text-xl font-bold tracking-tight">
                        {editData ? "Edit Purchase" : "Add New Purchase"}
                    </h1>
                    <button
                        onClick={onClose}
                        className="size-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[#5e878d] transition"
                    >
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 flex flex-col gap-6">

                    {/* Supplier */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[#101818] dark:text-slate-200 text-sm font-semibold">
                            Supplier
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. ABC Paper Suppliers"
                            value={supplier}
                            onChange={(e) => setSupplier(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-[#dae5e7] dark:border-slate-600
                                bg-white dark:bg-slate-800 text-[#101818] dark:text-white
                                outline-none focus:ring-2 focus:ring-primary/20
                                focus:border-primary placeholder:text-[#5e878d]"
                        />
                    </div>

                    {/* Item Description */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[#101818] dark:text-slate-200 text-sm font-semibold">
                            Item Description
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. A4 Glossy Paper, Fuel, Printing Rolls"
                            value={itemDescription}
                            onChange={(e) => setItemDescription(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-[#dae5e7] dark:border-slate-600
                                bg-white dark:bg-slate-800 text-[#101818] dark:text-white
                                outline-none focus:ring-2 focus:ring-primary/20
                                focus:border-primary placeholder:text-[#5e878d]"
                        />
                    </div>

                    {/* Quantity and Unit Price */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-[#101818] dark:text-slate-200 text-sm font-semibold">
                                Quantity
                            </label>
                            <input
                                type="number"
                                placeholder="0"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-[#dae5e7] dark:border-slate-600
                                    bg-white dark:bg-slate-800 text-[#101818] dark:text-white
                                    outline-none focus:ring-2 focus:ring-primary/20
                                    focus:border-primary placeholder:text-[#5e878d]"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[#101818] dark:text-slate-200 text-sm font-semibold">
                                Unit Price
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5e878d] material-symbols-outlined text-[18px]">
                                    currency_rupee
                                </span>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    value={unitPrice}
                                    onChange={(e) => setUnitPrice(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-[#dae5e7] dark:border-slate-600
                                        bg-white dark:bg-slate-800 text-[#101818] dark:text-white
                                        outline-none focus:ring-2 focus:ring-primary/20
                                        focus:border-primary placeholder:text-[#5e878d]"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Total Amount */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[#101818] dark:text-slate-200 text-sm font-semibold">
                            Total Amount
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5e878d] material-symbols-outlined text-[20px]">
                                currency_rupee
                            </span>
                            <input
                                type="number"
                                placeholder="0.00"
                                value={totalAmount}
                                onChange={(e) => setTotalAmount(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-lg border border-[#dae5e7] dark:border-slate-600
                                    bg-white dark:bg-slate-800 text-[#101818] dark:text-white
                                    outline-none focus:ring-2 focus:ring-primary/20
                                    focus:border-primary placeholder:text-[#5e878d]"
                            />
                        </div>
                    </div>

                    {/* Purchase Date */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[#101818] dark:text-slate-200 text-sm font-semibold">
                            Purchase Date
                        </label>
                        <input
                            type="date"
                            value={purchaseDate}
                            onChange={(e) => setPurchaseDate(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-[#dae5e7] dark:border-slate-600
                                bg-white dark:bg-slate-800 text-[#101818] dark:text-white
                                outline-none focus:ring-2 focus:ring-primary/20
                                focus:border-primary"
                        />
                    </div>

                    {/* Notes */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[#101818] dark:text-slate-200 text-sm font-semibold">
                            Notes (Optional)
                        </label>
                        <textarea
                            placeholder="Additional notes about this purchase..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-3 rounded-lg border border-[#dae5e7] dark:border-slate-600
                                bg-white dark:bg-slate-800 text-[#101818] dark:text-white
                                outline-none focus:ring-2 focus:ring-primary/20
                                focus:border-primary placeholder:text-[#5e878d] resize-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-5 bg-[#f9fafa] dark:bg-slate-800/50 flex justify-end gap-3 border-t border-[#f0f4f5] dark:border-slate-700">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-sm font-semibold text-[#5e878d] hover:text-[#101818] dark:hover:text-white transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!supplier || !itemDescription || !quantity || !unitPrice || !totalAmount || !purchaseDate}
                        className="px-6 py-2.5 rounded-lg bg-primary hover:bg-[#006a78]
                            text-white text-sm font-bold shadow-md shadow-primary/20 transition
                            flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="material-symbols-outlined text-sm">
                            {editData ? "edit" : "add_circle"}
                        </span>
                        {editData ? "Update Purchase" : "Add Purchase"}
                    </button>
                </div>
            </div>
        </div>
    )
}