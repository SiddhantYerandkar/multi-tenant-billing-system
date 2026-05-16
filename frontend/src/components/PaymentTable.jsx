import { useState, useEffect } from "react"
import { canEditPayment, canReversePayment, canGenerateReceipt } from "../utils/recalculateInvoiceTotals"

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

const STATUS_CONFIG = {
  completed: {
    label: "Completed",
    bg: "bg-green-100 dark:bg-green-900/20",
    text: "text-green-700 dark:text-green-300",
    dot: "bg-green-500"
  },
  reversed: {
    label: "Reversed",
    bg: "bg-red-100 dark:bg-red-900/20",
    text: "text-red-700 dark:text-red-300",
    dot: "bg-red-500"
  },
  adjusted: {
    label: "Adjusted",
    bg: "bg-blue-100 dark:bg-blue-900/20",
    text: "text-blue-700 dark:text-blue-300",
    dot: "bg-blue-500"
  }
}

export default function PaymentTable({ 
  payments = [], 
  onViewReceipt, 
  onPrintReceipt,
  onEditPayment,
  onReversePayment,
  onAdjustPayment
}) {
  const [openMenuId, setOpenMenuId] = useState(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openMenuId && !event.target.closest('.payment-actions-menu')) {
        setOpenMenuId(null)
      }
    }
    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openMenuId])

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
          const status = payment.status || 'completed'
          const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.completed
          const isReversed = status === 'reversed'
          const amount = payment.amount || 0
          const isNegative = amount < 0

          return (
            <div
              key={payment.$id}
              className={`p-4 bg-white dark:bg-gray-800 rounded-lg border ${
                isReversed 
                  ? 'border-red-200 dark:border-red-800/50 opacity-75' 
                  : 'border-gray-200 dark:border-gray-700'
              } hover:shadow-md transition-shadow`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg ${
                      isReversed 
                        ? 'bg-red-50 dark:bg-red-900/20' 
                        : 'bg-primary/10'
                    }`}>
                      <span className={`material-symbols-outlined text-lg ${
                        isReversed ? 'text-red-500' : 'text-primary'
                      }`}>
                        {modeIcon}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`font-bold ${
                          isNegative 
                            ? 'text-red-600 dark:text-red-400' 
                            : 'text-[#121617] dark:text-white'
                        }`}>
                          {isNegative ? '-' : ''}₹{Math.abs(amount).toFixed(2)}
                        </p>
                         {payment.reversedFrom && (
                           <span className="text-xs text-gray-400 dark:text-gray-500">
                             (linked)
                           </span>
                         )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {modeLabel}
                        </p>
                        <span className="text-gray-300 dark:text-gray-600">•</span>
                        <div className={`flex items-center gap-1 ${statusConfig.bg} px-2 py-0.5 rounded-full`}>
                          <span className={`w-1 h-1 rounded-full ${statusConfig.dot}`}></span>
                          <span className={`text-xs font-semibold ${statusConfig.text}`}>
                            {statusConfig.label}
                          </span>
                        </div>
                      </div>
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

                   {payment.status === 'reversed' && payment.reference && payment.reference.includes('Reversal:') && (
                     <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs">
                       <p className="font-semibold text-red-700 dark:text-red-300">Reversal Reason:</p>
                       <p className="text-red-600 dark:text-red-400">{payment.reference.replace('Reversal: ', '')}</p>
                     </div>
                   )}
                   {payment.status === 'reversed' && payment.reference && payment.reference.includes('Reversed:') && (
                     <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs">
                       <p className="font-semibold text-red-700 dark:text-red-300">Reversal Reason:</p>
                       <p className="text-red-600 dark:text-red-400">{payment.reference.replace('Reversed: ', '')}</p>
                     </div>
                   )}
                </div>

                <div className="flex items-center gap-1">
                  {/* View Receipt - Only if can generate receipt */}
                  {canGenerateReceipt(payment) && onViewReceipt && (
                    <button
                      onClick={() => onViewReceipt(payment)}
                      className="p-2 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      title="View Receipt"
                    >
                      <span className="material-symbols-outlined text-lg">visibility</span>
                    </button>
                  )}

                  {/* Print Receipt - Only if can generate receipt */}
                  {canGenerateReceipt(payment) && onPrintReceipt && (
                    <button
                      onClick={() => onPrintReceipt(payment)}
                      className="p-2 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      title="Print Receipt"
                    >
                      <span className="material-symbols-outlined text-lg">print</span>
                    </button>
                  )}

                  {/* Actions Menu */}
                  {!isReversed && (
                    <div className="relative payment-actions-menu">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenMenuId(openMenuId === payment.$id ? null : payment.$id)
                        }}
                        className={`p-2 rounded-lg transition-colors ${
                          openMenuId === payment.$id 
                            ? 'text-primary bg-primary/10' 
                            : 'text-gray-500 hover:text-primary hover:bg-primary/10'
                        }`}
                        title="More actions"
                      >
                        <span className="material-symbols-outlined text-lg">more_vert</span>
                      </button>
                      {openMenuId === payment.$id && (
                        <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 min-w-[200px]">
                          {canEditPayment(payment) && onEditPayment && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setOpenMenuId(null)
                                onEditPayment(payment)
                              }}
                              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
                            >
                              <span className="material-symbols-outlined text-sm">edit</span>
                              <span>Edit Payment</span>
                            </button>
                          )}
                          {canReversePayment(payment) && onReversePayment && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setOpenMenuId(null)
                                onReversePayment(payment)
                              }}
                              className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors"
                            >
                              <span className="material-symbols-outlined text-sm">undo</span>
                              <span>Reverse Payment</span>
                            </button>
                          )}
                          {canReversePayment(payment) && onAdjustPayment && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setOpenMenuId(null)
                                onAdjustPayment(payment)
                              }}
                              className="w-full text-left px-4 py-2.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-2 transition-colors"
                            >
                              <span className="material-symbols-outlined text-sm">tune</span>
                              <span>Adjust Payment</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
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
