import { calculateInvoiceStatus } from "../utils/invoiceStatus"
import { recalculateInvoiceTotals } from "../utils/recalculateInvoiceTotals"

const STATUS_CONFIG = {
  draft: {
    label: "Draft",
    bg: "bg-gray-100",
    text: "text-gray-700",
    dot: "bg-gray-500"
  },
  pending: {
    label: "Pending",
    bg: "bg-yellow-100",
    text: "text-yellow-700",
    dot: "bg-yellow-500"
  },
  partial: {
    label: "Partial",
    bg: "bg-blue-100",
    text: "text-blue-700",
    dot: "bg-blue-500"
  },
  paid: {
    label: "Paid",
    bg: "bg-green-100",
    text: "text-green-700",
    dot: "bg-green-500"
  },
  overdue: {
    label: "Overdue",
    bg: "bg-red-100",
    text: "text-red-700",
    dot: "bg-red-500"
  }
}

export default function PaymentSummary({ invoice, payments = [] }) {
  const totals = recalculateInvoiceTotals(invoice, payments)
  const grandTotal = totals.grandTotal
  const totalPaid = totals.totalPaid
  const dueAmount = totals.balanceAmount
  const status = calculateInvoiceStatus(invoice, payments)
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.pending

  return (
    <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
      <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4">
        Payment Summary
      </h3>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500 dark:text-gray-400 font-medium">Total Amount</span>
          <span className="text-[#121617] dark:text-white font-bold">₹{grandTotal.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500 dark:text-gray-400 font-medium">Paid Amount</span>
          <span className="text-green-600 dark:text-green-400 font-bold">₹{totalPaid.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500 dark:text-gray-400 font-medium">Due Amount</span>
          <span className={`font-bold ${dueAmount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
            ₹{dueAmount.toFixed(2)}
          </span>
        </div>
        
        <div className="h-px bg-gray-200 dark:bg-gray-700 my-3"></div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-500 dark:text-gray-400 font-medium">Invoice Status</span>
          <div className={`flex h-7 shrink-0 items-center justify-center gap-x-2 rounded-full px-3 ${statusConfig.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`}></span>
            <p className={`${statusConfig.text} text-xs font-bold uppercase tracking-wider`}>
              {statusConfig.label}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
