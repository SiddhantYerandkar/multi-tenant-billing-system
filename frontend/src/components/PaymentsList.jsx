const PAYMENT_MODE_LABELS = {
  cash: "Cash",
  upi: "UPI",
  bank: "Bank Transfer",
  cheque: "Cheque"
}

const PAYMENT_MODE_ICONS = {
  cash: "payments",
  upi: "qr_code",
  bank: "account_balance",
  cheque: "description"
}

export default function PaymentsList({ payments = [], onViewReceipt, onPrintReceipt }) {
  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", { 
        year: "numeric", 
        month: "short", 
        day: "numeric" 
      })
    } catch {
      return dateString
    }
  }

  if (payments.length === 0) {
    return (
      <div className="mt-8 p-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 border-dashed text-center">
        <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">receipt_long</span>
        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No payments recorded yet</p>
        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Record a payment to get started</p>
      </div>
    )
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">
          Payments
        </h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {payments.length} {payments.length === 1 ? 'payment' : 'payments'}
        </span>
      </div>

      <div className="space-y-3">
        {payments.map((payment) => {
          const mode = payment.paymentMode || 'cash'
          const modeLabel = PAYMENT_MODE_LABELS[mode] || mode
          const modeIcon = PAYMENT_MODE_ICONS[mode] || 'payments'

          return (
            <div
              key={payment.$id}
              className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <span className="material-symbols-outlined text-primary text-lg">
                        {modeIcon}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-[#121617] dark:text-white">
                        ₹{payment.amount?.toFixed(2) || '0.00'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {modeLabel}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mt-2">
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">calendar_today</span>
                      <span>{formatDate(payment.paymentDate)}</span>
                    </div>
                    {payment.receiptNumber && (
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">receipt</span>
                        <span className="font-medium">{payment.receiptNumber}</span>
                      </div>
                    )}
                  </div>
                  
                  {payment.reference && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
                      {payment.reference}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {onViewReceipt && (
                    <button
                      onClick={() => onViewReceipt(payment)}
                      className="p-2 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      title="View Receipt"
                    >
                      <span className="material-symbols-outlined text-lg">visibility</span>
                    </button>
                  )}
                  {onPrintReceipt && (
                    <button
                      onClick={() => onPrintReceipt(payment)}
                      className="p-2 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      title="Print Receipt"
                    >
                      <span className="material-symbols-outlined text-lg">print</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
