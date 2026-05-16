import { useEffect, useState } from "react";

const UNIT_MAP = {
    qty: "Qty",
    page: "Page",
    book: "Book",
};

const REVERSE_UNIT_MAP = {
    Qty: "qty",
    Page: "page",
    Book: "book",
};

export default function EditProductModal({ open, product, onClose, onUpdate }) {
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [unit, setUnit] = useState("Qty");

    useEffect(() => {
        if (product) {
            setName(product.name);
            setPrice(product.basePrice);
            setUnit(UNIT_MAP[product.unit] || "Qty");
        }
    }, [product]);

    if (!open || !product) return null;

    const handleSubmit = () => {
        if (!name || !price) return;

        onUpdate({
            id: product.$id,
            name,
            basePrice: Number(price),
            unit: REVERSE_UNIT_MAP[unit],
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-[520px] bg-white dark:bg-[#2c3136] rounded-xl shadow-2xl overflow-hidden flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-[#f0f4f5] dark:border-slate-700">
                    <h1 className="text-[#101818] dark:text-white text-xl font-bold tracking-tight">
                        Create New Product
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

                    {/* Product Name */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[#101818] dark:text-slate-200 text-sm font-semibold">
                            Product Name
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Glossy"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-[#dae5e7] dark:border-slate-600
                         bg-white dark:bg-slate-800 text-[#101818] dark:text-white
                         outline-none focus:ring-2 focus:ring-primary/20
                         focus:border-primary placeholder:text-[#5e878d]"
                        />
                    </div>

                    {/* Price & Unit */}
                    <div className="grid grid-cols-2 gap-6">

                        {/* Price */}
                        <div className="flex flex-col gap-2">
                            <label className="text-[#101818] dark:text-slate-200 text-sm font-semibold">
                                Price
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5e878d] material-symbols-outlined text-[20px]">
                                    currency_rupee
                                </span>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-[#dae5e7] dark:border-slate-600
                             bg-white dark:bg-slate-800 text-[#101818] dark:text-white
                             outline-none focus:ring-2 focus:ring-primary/20
                             focus:border-primary placeholder:text-[#5e878d]"
                                />
                            </div>
                        </div>

                        {/* Unit Picker */}
                        <div className="flex flex-col gap-2">
                            <label className="text-[#101818] dark:text-slate-200 text-sm font-semibold">
                                Unit Type
                            </label>
                            <div className="flex p-1 bg-[#f0f4f5] dark:bg-slate-800 rounded-lg border border-[#dae5e7] dark:border-slate-600">
                                {[
                                    { label: "Qty", value: "qty" },
                                    { label: "Page", value: "page" },
                                    { label: "Book", value: "book" },
                                ].map((u) => (
                                    <button
                                        key={u.value}
                                        onClick={() => setUnit(u.value)}
                                        className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition
      ${unit === u.value
                                                ? "bg-white dark:bg-primary text-primary dark:text-white shadow-sm"
                                                : "text-[#5e878d] hover:text-[#101818] dark:hover:text-white"
                                            }`}
                                    >
                                        {u.label}
                                    </button>
                                ))}

                            </div>
                        </div>
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
                        className="px-6 py-2.5 rounded-lg bg-primary hover:bg-[#006a78]
                       text-white text-sm font-bold shadow-md shadow-primary/20 transition
                       flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-sm">
                            edit
                        </span>
                        Edit Product
                    </button>
                </div>
            </div>
        </div>
    );
}
