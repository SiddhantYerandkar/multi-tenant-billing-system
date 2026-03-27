import { useEffect, useState } from "react"
import { getJobDetails } from "../services/jobService"
import { calculateJobProfit, getJobProfitBreakdown } from "../utils/calculateJobProfit"
import { updateJob } from "../services/supplierJobService"
import CreateInvoiceFromJobModal from "../components/CreateInvoiceFromJobModal"

const JOB_TYPES = {
  designer: "Designer",
  printer: "Printer",
  binding: "Binding"
}

const STATUS_STYLES = {
  pending: "bg-yellow-100 text-yellow-700",
  billed: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  paid: "bg-green-100 text-green-700"
}

export default function JobDetails({ company, jobNo, onBack, onViewInvoice }) {
  const [jobData, setJobData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [purchases, setPurchases] = useState([])
  const [expenses, setExpenses] = useState([])
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false)

  useEffect(() => {
    if (jobNo && company?.$id) {
      loadJobDetails()
    }
  }, [jobNo, company])

  async function loadJobDetails() {
    setLoading(true)
    setError("")
    try {
      const details = await getJobDetails(company.$id, jobNo)
      if (!details) {
        setError("Job not found")
        return
      }
      setJobData(details)
      setPurchases(details.purchases || [])
      setExpenses(details.expenses || [])
    } catch (err) {
      console.error("Error loading job details:", err)
      setError("Failed to load job details. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleMarkCompleted = async (jobId) => {
    try {
      await updateJob(jobId, { status: "completed" })
      loadJobDetails()
    } catch (err) {
      console.error("Error updating job:", err)
      alert("Failed to update job status")
    }
  }

  const formatCurrency = (amount) => {
    return `₹${(amount || 0).toFixed(2)}`
  }

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

  const getStatusLabel = (status) => {
    const statusMap = {
      pending: "Pending",
      billed: "Billed",
      completed: "Completed",
      paid: "Paid"
    }
    return statusMap[status] || status
  }

  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto flex flex-col bg-background-light">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <span className="material-symbols-outlined animate-spin text-4xl text-primary mb-2">
              sync
            </span>
            <p className="text-gray-500">Loading job details...</p>
          </div>
        </div>
      </main>
    )
  }

  if (error || !jobData) {
    return (
      <main className="flex-1 overflow-y-auto flex flex-col bg-background-light">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <span className="material-symbols-outlined text-4xl text-red-500 mb-2">
              error
            </span>
            <p className="text-red-600">{error || "Job not found"}</p>
            {onBack && (
              <button
                onClick={onBack}
                className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
              >
                Go Back
              </button>
            )}
          </div>
        </div>
      </main>
    )
  }

  // Calculate profit breakdown
  const profitBreakdown = getJobProfitBreakdown(
    jobData.invoice,
    jobData.supplierJobs,
    purchases,
    expenses
  )

  // Calculate supplier payments summary
  const totalPaid = jobData.payments
    .filter(p => !p.reversed)
    .reduce((sum, p) => sum + (p.amount || 0), 0)
  
  const totalDue = jobData.supplierJobs.reduce((sum, job) => {
    return sum + (job.invoiceAmount || job.cost || 0)
  }, 0) - totalPaid

  return (
    <main className="flex-1 overflow-y-auto flex flex-col bg-background-light">
      {/* HEADER */}
      <header className="p-8 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
              )}
              <h2 className="text-3xl font-black tracking-tight">Job Details</h2>
            </div>
            <p className="text-[#638288] text-sm mt-1">
              {jobData.jobNo}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {jobData.invoice ? (
              <button
                onClick={() => onViewInvoice && onViewInvoice(jobData.invoice.$id)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-100 text-blue-700 font-semibold hover:bg-blue-200 transition"
              >
                <span className="material-symbols-outlined text-lg">receipt</span>
                View Invoice ({jobData.invoice.invoiceNumber})
              </button>
            ) : (
              <button
                onClick={() => setShowCreateInvoiceModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                Create Invoice
              </button>
            )}
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <div className="px-8 pb-8 flex-1">
        {/* Section A: Job Summary */}
        <section className="bg-white rounded-xl border border-[#dae5e7] p-6 mb-6">
          <h3 className="text-lg font-bold mb-4">Job Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Job No</p>
              <p className="font-bold">{jobData.jobNo}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Customer</p>
              <p className="font-bold">{jobData.party?.name || "N/A"}</p>
              {jobData.party?.phone && (
                <p className="text-sm text-gray-500">{jobData.party.phone}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Linked Invoice</p>
              <p className="font-bold">
                {jobData.invoice?.invoiceNumber || "Not linked"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Invoice Amount</p>
              <p className="font-bold text-lg">
                {formatCurrency(profitBreakdown.invoiceTotal)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Total Supplier Cost</p>
              <p className="font-bold text-lg text-red-600">
                {formatCurrency(profitBreakdown.totalSupplierCost)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Profit / Loss</p>
              <p className={`font-bold text-lg ${
                profitBreakdown.profit > 0 ? "text-green-600" : 
                profitBreakdown.profit < 0 ? "text-red-600" : 
                "text-gray-500"
              }`}>
                {formatCurrency(profitBreakdown.profit)}
              </p>
              {profitBreakdown.invoiceTotal > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Margin: {profitBreakdown.profitMargin.toFixed(1)}%
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Section B: Supplier Work Breakdown */}
        <section className="bg-white rounded-xl border border-[#dae5e7] p-6 mb-6">
          <h3 className="text-lg font-bold mb-4">Supplier Work Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#f0f4f5]/60">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold uppercase">Supplier Name</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase">Job Type</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase">Description</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-right">Cost</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-center">Status</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f4f5]">
                {jobData.supplierJobs.map((job) => (
                  <tr key={job.$id} className="hover:bg-primary/5">
                    <td className="px-4 py-3">
                      <p className="font-semibold">{job.supplier?.name || "Unknown"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">
                        {JOB_TYPES[job.jobType] || JOB_TYPES[job.supplierType] || job.jobType || job.supplierType || "N/A"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-600">{job.description || "-"}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold">
                        {formatCurrency(job.invoiceAmount || job.cost || 0)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${
                        STATUS_STYLES[job.status] || STATUS_STYLES.pending
                      }`}>
                        {getStatusLabel(job.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {job.status !== "completed" && job.status !== "paid" && (
                          <button
                            onClick={() => handleMarkCompleted(job.$id)}
                            className="text-xs text-primary hover:underline"
                          >
                            Mark Completed
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section C: Supplier Payments */}
        <section className="bg-white rounded-xl border border-[#dae5e7] p-6 mb-6">
          <h3 className="text-lg font-bold mb-4">Supplier Payments</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Total Paid</p>
              <p className="font-bold text-lg text-green-600">
                {formatCurrency(totalPaid)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Due</p>
              <p className="font-bold text-lg text-red-600">
                {formatCurrency(totalDue)}
              </p>
            </div>
          </div>
          {jobData.payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#f0f4f5]/60">
                  <tr>
                    <th className="px-4 py-3 text-xs font-bold uppercase">Date</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase">Supplier</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase text-right">Amount</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase">Mode</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f4f5]">
                  {jobData.payments.map((payment) => (
                    <tr key={payment.$id} className={payment.reversed ? "opacity-50" : ""}>
                      <td className="px-4 py-3 text-sm">
                        {formatDate(payment.paymentDate)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {payment.supplierId ? "Supplier" : "N/A"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${
                          payment.reversed ? "text-red-600" : "text-green-600"
                        }`}>
                          {formatCurrency(payment.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {payment.paymentMode || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {payment.notes || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No payments recorded yet</p>
          )}
        </section>

        {/* Section D: Linked Purchases & Expenses */}
        <section className="bg-white rounded-xl border border-[#dae5e7] p-6">
          <h3 className="text-lg font-bold mb-4">Linked Purchases & Expenses</h3>
          {purchases.length > 0 || expenses.length > 0 ? (
            <div className="space-y-4">
              {purchases.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Purchases</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-[#f0f4f5]/60">
                        <tr>
                          <th className="px-4 py-2 text-xs font-bold uppercase">Item</th>
                          <th className="px-4 py-2 text-xs font-bold uppercase text-right">Amount</th>
                          <th className="px-4 py-2 text-xs font-bold uppercase">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f0f4f5]">
                        {purchases.map((purchase) => (
                          <tr key={purchase.$id}>
                            <td className="px-4 py-2 text-sm">{purchase.itemName || "-"}</td>
                            <td className="px-4 py-2 text-sm text-right font-semibold">
                              {formatCurrency(purchase.totalAmount || 0)}
                            </td>
                            <td className="px-4 py-2 text-sm">{formatDate(purchase.purchaseDate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {expenses.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Expenses</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-[#f0f4f5]/60">
                        <tr>
                          <th className="px-4 py-2 text-xs font-bold uppercase">Description</th>
                          <th className="px-4 py-2 text-xs font-bold uppercase text-right">Amount</th>
                          <th className="px-4 py-2 text-xs font-bold uppercase">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f0f4f5]">
                        {expenses.map((expense) => (
                          <tr key={expense.$id}>
                            <td className="px-4 py-2 text-sm">{expense.description || "-"}</td>
                            <td className="px-4 py-2 text-sm text-right font-semibold">
                              {formatCurrency(expense.amount || 0)}
                            </td>
                            <td className="px-4 py-2 text-sm">{formatDate(expense.date)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No purchases or expenses linked to this job</p>
          )}
        </section>
      </div>

      {/* Create Invoice Modal */}
      <CreateInvoiceFromJobModal
        open={showCreateInvoiceModal}
        onClose={() => setShowCreateInvoiceModal(false)}
        company={company}
        jobData={jobData}
        onInvoiceCreated={(invoiceId) => {
          setShowCreateInvoiceModal(false)
          loadJobDetails()
          if (onViewInvoice) {
            onViewInvoice(invoiceId)
          }
        }}
      />
    </main>
  )
}
