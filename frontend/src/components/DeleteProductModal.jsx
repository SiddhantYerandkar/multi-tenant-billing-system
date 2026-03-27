export default function DeleteProductModal({
    open,
    onClose,
    onConfirm,
    product,
}) {
    if (!open || !product) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-[440px] bg-white dark:bg-[#1c2128] rounded-xl shadow-2xl overflow-hidden border border-gray-200/50 dark:border-gray-700/50">

                {/* Content */}
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-4">
                        <div className="flex items-center justify-center size-8 rounded-full bg-yellow-400/20">
                            <span className="material-symbols-outlined text-yellow-500 text-[20px]">
                                warning
                            </span>
                        </div>
                        <h2 className="text-xl font-bold tracking-tight text-[#101818] dark:text-gray-100">
                            Delete this product?
                        </h2>
                    </div>

                    {/* Body */}
                    <div className="space-y-3">
                        <p className="text-[#101818] dark:text-gray-300 text-[15px] leading-relaxed">
                            This action <span className="font-bold">cannot be undone</span>.
                            Are you sure you want to delete{" "}
                            <span className="bg-gray-100 dark:bg-gray-800 px-1 rounded font-medium text-primary">
                                {product.name}
                            </span>
                            ?
                        </p>

                        <p className="text-sm text-[#5e878d] dark:text-gray-400">
                            This will permanently remove the item from your inventory database.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-[#f9fafb] dark:bg-[#161b22] px-6 py-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800">
                    <button
                        onClick={onClose}
                        className="min-w-[90px] h-10 px-5 rounded-lg bg-white dark:bg-gray-800
                         border border-gray-300 dark:border-gray-600
                         text-[#101818] dark:text-gray-200 text-sm font-semibold
                         hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={() => onConfirm(product)}
                        className="min-w-[120px] h-10 px-5 rounded-lg bg-red-500
                         text-white text-sm font-bold
                         shadow-lg shadow-red-500/20
                         hover:bg-red-600 active:scale-[0.98] transition"
                    >
                        Delete Product
                    </button>
                </div>
            </div>
        </div>
    );
}
