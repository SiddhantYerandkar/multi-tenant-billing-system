import { useEffect, useState, useMemo } from "react"
import { getJobsWithDetails } from "../services/jobService"
import { calculateJobProfit } from "../utils/calculateJobProfit"
import CreateJobModal from "../components/CreateJobModal"

const STATUS_STYLES = {
  pending: "bg-yellow-100 text-yellow-700",
  billed: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  paid: "bg-green-100 text-green-700"
}

export default function Jobs({ company, onViewJob }) {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showCreateJobModal, setShowCreateJobModal] = useState(false)
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (company?.$id) {
      loadJobs()
    }
  }, [company])

  async function loadJobs() {
    setLoading(true)
    setError("")
    try {
      const jobSummaries = await getJobsWithDetails(company.$id)
      setJobs(jobSummaries)
    } catch (err) {
      console.error("Error loading jobs:", err)
      setError("Failed to load jobs. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const filteredJobs = useMemo(() => {
    if (!search.trim()) return jobs

    const searchLower = search.toLowerCase()
    return jobs.filter(job => {
      return (
        job.jobNo?.toLowerCase().includes(searchLower) ||
        job.party?.name?.toLowerCase().includes(searchLower) ||
        job.invoice?.invoiceNumber?.toLowerCase().includes(searchLower)
      )
    })
  }, [jobs, search])

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
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <span className="material-symbols-outlined animate-spin text-4xl text-primary mb-2">
              sync
            </span>
            <p className="text-gray-500">Loading jobs...</p>
          </div>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <span className="material-symbols-outlined text-4xl text-red-500 mb-2">
              error
            </span>
            <p className="text-red-600">{error}</p>
            <button
              onClick={loadJobs}
              className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
            >
              Retry
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      {/* HEADER */}
      <header className="bg-white border-b border-[#dae5e7] p-6">
        <div className="flex justify-between items-end gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight">
              Jobs
            </h2>
            <p className="text-sm text-[#5e878d] font-medium">
              Track customer jobs and profitability across suppliers.
            </p>
          </div>

          <button
            onClick={() => setShowCreateJobModal(true)}
            className="flex items-center gap-2 h-11 px-6 rounded-lg bg-primary text-white font-bold shadow"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Create Job
          </button>
        </div>
      </header>

      {/* TOOLBAR */}
      <div className="bg-[#f0f4f5]/60 px-6 py-4">
        <div className="bg-white border border-[#dae5e7] rounded-xl relative w-full md:w-96">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#5e878d]">
            search
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by job no, customer, or invoice..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white text-sm focus:ring-2 focus:ring-primary/50 outline-none"
          />
        </div>
      </div>

      {/* TABLE */}
      <section className="flex-1 overflow-auto p-6">
        {filteredJobs.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#dae5e7] p-12 text-center">
            <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">
              work
            </span>
            <h3 className="text-xl font-bold text-gray-600 mb-2">
              {search ? "No jobs found" : "No Jobs Yet"}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {search ? "Try adjusting your search criteria" : "Create your first job to get started"}
            </p>
            {!search && (
              <button
                onClick={() => setShowCreateJobModal(true)}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
              >
                Create Job
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#dae5e7] overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-[#f0f4f5]/60">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold uppercase w-32">Date</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase w-32">Job No</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase">Customer Name</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-center w-32">Status</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase w-32">Order No</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-right w-32">Size</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-right w-32">Pages</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-right w-32">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#f0f4f5]">
                {filteredJobs.map((jobSummary) => {
                  // Calculate profit (simplified - will be more detailed in job details)
                  const profit = calculateJobProfit(
                    jobSummary.invoice,
                    jobSummary.supplierJobs,
                    [], // purchases - will be loaded in details view
                    []  // expenses - will be loaded in details view
                  )

                  return (
                    <tr
                      key={jobSummary.jobNo}
                      className="hover:bg-primary/5 transition"
                    >
                      {/* DATE */}
                      <td className="px-6 py-4 align-middle">
                        {jobSummary.jobDate
                          ? new Date(jobSummary.jobDate).toLocaleDateString("en-IN")
                          : "-"}
                      </td>

                      {/* JOB NO */}
                      <td className="px-6 py-4 align-middle">
                        <span className="px-3 py-1 text-xs font-bold rounded bg-primary/10 text-primary">
                          {jobSummary.jobNo}
                        </span>
                      </td>

                      {/* CUSTOMER */}
                      <td className="px-6 py-4 align-middle">
                        <p className="font-bold">{jobSummary.party?.name || "N/A"}</p>
                        {jobSummary.party?.phone && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {jobSummary.party.phone}
                          </p>
                        )}
                      </td>

                      {/* STATUS */}
                      <td className="px-6 py-4 text-center align-middle">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded ${STATUS_STYLES[jobSummary.status] || STATUS_STYLES.pending
                            }`}
                        >
                          {getStatusLabel(jobSummary.status)}
                        </span>
                      </td>

                      {/* ORDER NO */}
                      <td className="px-6 py-4 align-middle">
                        {jobSummary.order?.orderNo ? (
                          <span className="px-3 py-1 text-xs font-bold rounded bg-blue-100 text-blue-700">
                            {jobSummary.order.orderNo}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>

                      {/* SIZE */}
                      <td className="px-6 py-4 text-right align-middle">
                        {jobSummary.size || "-"}
                      </td>

                      {/* PAGES */}
                      <td className="px-6 py-4 text-right align-middle">
                        {jobSummary.pages || "-"}
                      </td>

                      {/* ACTION */}
                      <td className="px-6 py-4 text-right align-middle">
                        <button
                          onClick={() => onViewJob && onViewJob(jobSummary.jobNo)}
                          className="text-primary text-xs font-bold hover:underline"
                        >
                          View Job
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <CreateJobModal
        open={showCreateJobModal}
        onClose={() => setShowCreateJobModal(false)}
        company={company}
        onJobCreated={loadJobs}
      />
    </main>
  )
}
