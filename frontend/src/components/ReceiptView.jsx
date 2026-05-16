export default function ReceiptView({ open, payment, invoice, company, party, onClose, onPrint }) {
  if (!open || !payment) return null

  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", { 
        year: "numeric", 
        month: "long", 
        day: "numeric" 
      })
    } catch {
      return dateString
    }
  }

  const formatAddress = (address) => {
    if (!address) return []
    if (typeof address === "string") {
      return address.split(",").map(line => line.trim())
    }
    return Array.isArray(address) ? address : []
  }

  const PAYMENT_MODE_LABELS = {
    cash: "Cash",
    upi: "UPI",
    bank: "Bank Transfer",
    cheque: "Cheque"
  }

  const paymentMode = PAYMENT_MODE_LABELS[payment.paymentMode] || payment.paymentMode

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-6">
      <div className="bg-white dark:bg-[#1a1c20] w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-[#1a1c20] z-10 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#121617] dark:text-white">
            Receipt #{payment.receiptNumber || "N/A"}
          </h2>
          <div className="flex items-center gap-2">
            {onPrint && (
              <button
                onClick={onPrint}
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Print Receipt"
              >
                <span className="material-symbols-outlined">print</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Receipt Content */}
        <div className="px-8 py-8" id="receipt-content">
          {/* Company Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-[#121617] dark:text-white mb-2">
              {company?.name || "Company Name"}
            </h1>
            <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
              {formatAddress(company?.address).map((line, i) => (
                <p key={i}>{line}</p>
              ))}
              {company?.gstNumber && (
                <p className="mt-2">GST ID: {company.gstNumber}</p>
              )}
            </div>
          </div>

          {/* Receipt Title */}
          <div className="text-center mb-8 pb-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-[#121617] dark:text-white mb-2">PAYMENT RECEIPT</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Receipt Number: {payment.receiptNumber || "N/A"}
            </p>
          </div>

          {/* Receipt Details */}
          <div className="space-y-6 mb-8">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Receipt Date
                </p>
                <p className="text-sm font-medium text-[#121617] dark:text-white">
                  {formatDate(payment.paymentDate)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Payment Mode
                </p>
                <p className="text-sm font-medium text-[#121617] dark:text-white">
                  {paymentMode}
                </p>
              </div>
            </div>

            {invoice && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Invoice Number
                </p>
                <p className="text-sm font-medium text-[#121617] dark:text-white">
                  #{invoice.invoiceNumber || "N/A"}
                </p>
              </div>
            )}

            {party && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Received From
                </p>
                <p className="text-sm font-medium text-[#121617] dark:text-white mb-1">
                  {party.name || "Unknown Party"}
                </p>
                {formatAddress(party.address).length > 0 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formatAddress(party.address).map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {payment.reference && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Reference
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {payment.reference}
                </p>
              </div>
            )}
          </div>

          {/* Amount Section */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-[#121617] dark:text-white">
                Amount Received
              </span>
              <span className="text-3xl font-black text-primary">
                ₹{payment.amount?.toFixed(2) || '0.00'}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              This is a computer-generated receipt. No signature required.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-[#121617] dark:hover:text-white transition"
          >
            Close
          </button>
          {onPrint && (
            <button
              onClick={onPrint}
              className="px-5 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-bold shadow-md shadow-primary/20 transition flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">print</span>
              <span>Print Receipt</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
