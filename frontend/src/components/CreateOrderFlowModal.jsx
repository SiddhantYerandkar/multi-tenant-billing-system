import { useEffect, useMemo, useState } from "react"
import { getParties } from "../services/partyService"
import { getSuppliers } from "../services/supplierService"
import { getProducts } from "../services/productService"
import { getDynamicPrice } from "../services/dynamicPricingService"
import { createOrder, linkJobToOrder } from "../services/orderService"
import { createJob, updateJob } from "../services/supplierJobService"
import { createInvoice, createInvoiceItem, generateInvoiceNumber } from "../services/invoiceService"
import { getJobsGroupedByJobNo } from "../services/jobService"

const JOB_TYPES = [
  { value: "designing", label: "Designing" },
  { value: "printing", label: "Printing" },
  { value: "designing_printing", label: "Designing & Printing" },
  { value: "binding", label: "Binding" },
  { value: "other", label: "Other" }
]

const SUPPLIER_TYPES = [
  { value: "designer", label: "Designer" },
  { value: "printer", label: "Printer" },
  { value: "binding", label: "Binding" }
]

const EMPTY_LINE = {
  productId: "",
  productName: "",
  qty: 1,
  price: 0,
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]

function mapOrderJobTypeToSupplierType(orderJobType) {
  if (!orderJobType) return "designer"
  if (orderJobType === "designing" || orderJobType === "designing_printing") return "designer"
  if (orderJobType === "printing") return "printer"
  if (orderJobType === "binding") return "binding"
  return "designer"
}

function getJobNoPrefixFromDate(dateStr) {
  // dateStr: YYYY-MM-DD (from <input type="date" />)
  const d = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date()
  const mon = MONTHS[d.getMonth()] || "JAN"
  const year = d.getFullYear()
  return `${mon}-${year}`
}


export default function CreateOrderFlowModal({ open, onClose, company, onOrderCreated }) {
  const [step, setStep] = useState(1) // 1=Order, 2=Job, 3=Invoice, 4=Review

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [existingJobs, setExistingJobs] = useState([])
  const [selectedExistingJobNo, setSelectedExistingJobNo] = useState("")
  const [parties, setParties] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])

  const [orderData, setOrderData] = useState({
    orderNo: "",
    partyId: "",
    title: "",
    jobType: "designing",
    orderDate: new Date().toISOString().split("T")[0],
    notes: ""
  })

  const [jobData, setJobData] = useState({
    jobNo: "",
    jobDate: new Date().toISOString().split("T")[0],
    description: "",
  })
  const [jobNoIsAuto, setJobNoIsAuto] = useState(true)

  const [supplierEntries, setSupplierEntries] = useState([
    { id: 1, supplierType: "designer", supplierId: "", cost: "", description: "", pages: "", size: "" }
  ])

  const [invoiceData, setInvoiceData] = useState({
    invoiceNumber: "",
    invoiceDate: new Date().toISOString().split("T")[0],
    invoiceTitle: "",
    status: "pending",
  })
  const [items, setItems] = useState([EMPTY_LINE])

  function handleSelectExistingJob(jobNo) {
    setSelectedExistingJobNo(jobNo)

    if (!jobNo) {
      // Reset → generate new job number
      generateNewJobNo()

      setSupplierEntries([
        { id: 1, supplierType: "designer", supplierId: "", cost: "", description: "", pages: "", size: "" }
      ])

      return
    }

    const selected = existingJobs.find(([jn]) => jn === jobNo)
    if (!selected) return

    const jobs = selected[1]

    // ✅ SET JOB NUMBER (MAIN FIX)
    setJobData(prev => ({
      ...prev,
      jobNo: jobNo,
      description: jobs[0]?.description || prev.description,
      jobDate: jobs[0]?.jobDate || prev.jobDate
    }))

    // ✅ Prefill suppliers
    const mappedSuppliers = jobs.map((job, index) => ({
      id: index + 1,
      supplierType: job.jobType || "designer",
      supplierId: job.supplierId || "",
      cost: job.invoiceAmount || job.cost || "",
      description: job.description || "",
      size: job.size || "",
      pages: job.pages || ""
    }))

    setSupplierEntries(mappedSuppliers)
  }

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + (Number(i.qty) || 0) * (Number(i.price) || 0), 0),
    [items]
  )

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => (document.body.style.overflow = "")
  }, [open])

  useEffect(() => {
    if (!open) return

    setStep(1)
    setError("")
    setLoading(false)

    setOrderData({
      orderNo: "",
      partyId: "",
      title: "",
      jobType: "designing",
      orderDate: new Date().toISOString().split("T")[0],
      notes: ""
    })
    setJobData({
      jobNo: "",
      jobDate: new Date().toISOString().split("T")[0],
      description: "",
    })
    setJobNoIsAuto(true)
    setSupplierEntries([{ id: 1, supplierType: "designer", supplierId: "", cost: "", description: "" }])
    setInvoiceData({
      invoiceNumber: "",
      invoiceDate: new Date().toISOString().split("T")[0],
      invoiceTitle: "",
      status: "pending",
    })

    setItems([EMPTY_LINE])
  }, [open])

  useEffect(() => {
    if (!open || !company?.$id) return

    async function loadData() {
      try {
        const [partiesRes, suppliersRes, productsRes] = await Promise.all([
          getParties(company.$id),
          getSuppliers(company.$id),
          getProducts(company.$id),
        ])
        setParties(partiesRes.documents || [])
        setSuppliers(suppliersRes.documents || [])
        setProducts(productsRes.documents || [])

        const nextInvoiceNo = await generateInvoiceNumber(company.$id)
        setInvoiceData(prev => ({ ...prev, invoiceNumber: prev.invoiceNumber || nextInvoiceNo }))

        const jobsRes = await getJobsGroupedByJobNo(company.$id)

        setExistingJobs(Object.entries(jobsRes))
        // format: [ [jobNo, jobsArray], ... ]

      } catch (err) {
        console.error("Error loading create-order-flow data:", err)
      }
    }

    loadData()
  }, [open, company])

  useEffect(() => {
    if (!open) return
    setSupplierEntries(prev => {
      const nextType = mapOrderJobTypeToSupplierType(orderData.jobType)
      return prev.map((e, idx) => (idx === 0 ? { ...e, supplierType: nextType } : e))
    })
  }, [open, orderData.jobType])

  useEffect(() => {
    if (!open) return
    setJobData(prev => ({ ...prev, description: prev.description || orderData.title }))
    setInvoiceData(prev => ({ ...prev, invoiceTitle: prev.invoiceTitle || orderData.title }))
  }, [open, orderData.title])

  async function generateNewJobNo() {
    if (!company?.$id) return

    try {
      const jobsByJobNo = await getJobsGroupedByJobNo(company.$id)

      const existingNos = Object.keys(jobsByJobNo)

      let maxNum = 0

      existingNos.forEach(jn => {
        const num = parseInt(jn, 10)
        if (!isNaN(num) && num > maxNum) {
          maxNum = num
        }
      })

      const jobNo = String(maxNum + 1) // 👉 "1", "2", "3"

      setJobData(prev => ({ ...prev, jobNo }))
    } catch (err) {
      console.error("Error generating job number:", err)
    }
  }

  useEffect(() => {
    if (
      open &&
      company?.$id &&
      !jobData.jobNo &&
      !selectedExistingJobNo   // ✅ ADD THIS
    ) {
      generateNewJobNo()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, company?.$id, selectedExistingJobNo])

  useEffect(() => {
    if (!open || !company?.$id) return

    // ❌ STOP if using existing job
    if (selectedExistingJobNo) return   // ✅ ADD THIS

    // ✅ Only auto-update for new jobs
    if (jobNoIsAuto) {
      generateNewJobNo()
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, company?.$id, jobData.jobDate, selectedExistingJobNo])

  const getAvailableSuppliers = (supplierType) => suppliers.filter(s => s.supplierType === supplierType)

  const addSupplierEntry = () => {
    const newId = Math.max(...supplierEntries.map(e => e.id)) + 1
    setSupplierEntries([...supplierEntries, { id: newId, supplierType: "designer", supplierId: "", cost: "", description: "" }])
  }

  const removeSupplierEntry = (id) => {
    if (supplierEntries.length <= 1) return
    setSupplierEntries(supplierEntries.filter(e => e.id !== id))
  }

  const updateSupplierEntry = (id, field, value) => {
    setSupplierEntries(supplierEntries.map(entry => {
      if (entry.id !== id) return entry
      const updated = { ...entry, [field]: value }
      if (field === "supplierType") updated.supplierId = ""
      return updated
    }))
  }

  const supplierTotalCost = useMemo(() => {
    return supplierEntries.reduce((sum, e) => sum + (parseFloat(e.cost) || 0), 0)
  }, [supplierEntries])

  const updateItem = async (index, key, value) => {
    const updatedItems = items.map((it, i) => (i === index ? { ...it, [key]: value } : it))

    if (key === "productId" && value && orderData.partyId && company?.$id) {
      const product = products.find(p => p.$id === value)
      if (product) {
        try {
          const dynamicPrice = await getDynamicPrice(company.$id, orderData.partyId, value)
          const price = dynamicPrice ? dynamicPrice.price : product.basePrice
          updatedItems[index] = {
            ...updatedItems[index],
            price,
            productName: product.name
          }
        } catch (err) {
          console.error("Error fetching dynamic price:", err)
          updatedItems[index] = {
            ...updatedItems[index],
            price: product.basePrice || 0,
            productName: product.name
          }
        }
      }
    }

    setItems(updatedItems)
  }

  const addItem = () => setItems([...items, EMPTY_LINE])
  const removeItem = (index) => setItems(items.filter((_, i) => i !== index))

  function validateStep(targetStep = step) {
    if (targetStep === 1) {
      if (!orderData.orderNo.trim()) return "Order number is required"
      if (!orderData.partyId) return "Please select a customer"
      if (!orderData.title.trim()) return "Title is required"
      if (!orderData.orderDate) return "Order date is required"
      return ""
    }

    if (targetStep === 2) {
      if (!jobData.jobNo.trim()) return "Job number is required"
      if (!jobData.jobDate) return "Job date is required"
      const validEntries = supplierEntries.filter(e => e.supplierId && parseFloat(e.cost) > 0)
      if (validEntries.length === 0) return "Please add at least one supplier with cost"
      return ""
    }

    if (targetStep === 3) {
      if (!invoiceData.invoiceNumber.trim()) return "Invoice number is required"
      if (!invoiceData.invoiceDate) return "Invoice date is required"
      const validItems = items.filter(i => i.productId && Number(i.qty) > 0)
      if (validItems.length === 0) return "Please add at least one product to the invoice"
      return ""
    }

    return ""
  }

  const next = () => {
    const msg = validateStep(step)
    if (msg) {
      setError(msg)
      return
    }
    setError("")
    setStep(s => Math.min(4, s + 1))
  }

  const back = () => {
    setError("")
    setStep(s => Math.max(1, s - 1))
  }

  async function handleCreateAll() {
    const msg = validateStep(1) || validateStep(2) || validateStep(3)
    if (msg) {
      setError(msg)
      setStep(1)
      return
    }

    setLoading(true)
    setError("")

    try {
      // 1) Create order
      const order = await createOrder({
        companyId: company.$id,
        partyId: orderData.partyId,
        orderNo: orderData.orderNo.trim(),
        title: orderData.title.trim(),
        jobType: orderData.jobType,
        orderDate: orderData.orderDate,
        notes: orderData.notes.trim(),
        status: "pending",
        jobNo: jobData.jobNo.trim(),
      })

      // 2) Create jobs (one per supplier entry)
      const validEntries = supplierEntries.filter(e => e.supplierId && parseFloat(e.cost) > 0)
      const createdJobs = []
      for (const entry of validEntries) {
        const created = await createJob({
          companyId: company.$id,
          supplierId: entry.supplierId,
          partyId: orderData.partyId,
          jobNo: jobData.jobNo.trim(),
          jobType: entry.supplierType,
          description: entry.description || jobData.description || orderData.title,
          invoiceAmount: parseFloat(entry.cost),
          jobDate: jobData.jobDate,
          status: "pending",
          orderId: order.$id,
        })
        createdJobs.push(created)
      }

      // Ensure order has jobNo set (even if createOrder schema evolves)
      await linkJobToOrder(order.$id, jobData.jobNo.trim())

      // 3) Create invoice + items
      const invoice = await createInvoice(
        {
          invoiceNumber: invoiceData.invoiceNumber.trim(),
          invoiceTitle: invoiceData.invoiceTitle || orderData.title,
          invoiceDate: new Date(invoiceData.invoiceDate).toISOString(),
          partyId: orderData.partyId,
          companyId: company.$id,
          subTotal: subtotal,
          gstAmount: 0,
          grandTotal: subtotal,
          paidAmount: 0,
          balanceAmount: subtotal,
          status: invoiceData.status,
          jobNo: jobData.jobNo.trim(),
          orderNo: orderData.orderNo.trim(),
        },
        []
      )

      const validItems = items.filter(i => i.productId && Number(i.qty) > 0)
      for (const item of validItems) {
        const product = products.find(p => p.$id === item.productId)
        const lineTotal = (Number(item.qty) || 0) * (Number(item.price) || 0)
        await createInvoiceItem({
          companyId: company.$id,
          invoiceId: invoice.$id,
          productName: item.productName || product?.name || "",
          productId: item.productId,
          quantity: Number(item.qty) || 0,
          rate: Number(item.price) || 0,
          discount: 0,
          total: lineTotal
        })
      }

      // 4) Link invoice to supplier jobs
      const nextJobStatus =
        invoiceData.status === "paid" || invoiceData.status === "completed"
          ? "completed"
          : "pending"
      for (const job of createdJobs) {
        await updateJob(job.$id, {
          invoiceId: invoice.$id,
          status: nextJobStatus
        })
      }

      if (onOrderCreated) onOrderCreated()
      onClose()
    } catch (err) {
      console.error("Error creating order flow:", err)
      setError(err.message || "Failed to create order/job/invoice")
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-5xl bg-white rounded-xl shadow-2xl border border-[#dae5e7] overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#dae5e7] flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-bold">Create Order + Job + Invoice</h2>
            <p className="text-sm text-gray-500 mt-1">
              Step {step} of 4
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <span className="material-symbols-outlined text-gray-500">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Stepper */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { n: 1, label: "Order" },
              { n: 2, label: "Job" },
              { n: 3, label: "Invoice" },
              { n: 4, label: "Review" },
            ].map(s => (
              <button
                key={s.n}
                type="button"
                onClick={() => setStep(s.n)}
                className={`px-3 py-2 rounded-lg border text-sm font-semibold transition ${step === s.n ? "bg-primary text-white border-primary" : "bg-white border-[#dae5e7] text-gray-700 hover:bg-gray-50"
                  }`}
              >
                {s.n}. {s.label}
              </button>
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Order No <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={orderData.orderNo}
                    onChange={(e) => setOrderData({ ...orderData, orderNo: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    placeholder="ORD-0001"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Order Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={orderData.orderDate}
                    onChange={(e) => setOrderData({ ...orderData, orderDate: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Customer <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={orderData.partyId}
                    onChange={(e) => setOrderData({ ...orderData, partyId: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    required
                  >
                    <option value="">-- Select Customer --</option>
                    {parties.map((party) => (
                      <option key={party.$id} value={party.$id}>
                        {party.name} {party.partyCode ? `(${party.partyCode})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Job Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={orderData.jobType}
                    onChange={(e) => setOrderData({ ...orderData, jobType: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  >
                    {JOB_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={orderData.title}
                  onChange={(e) => setOrderData({ ...orderData, title: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  placeholder="e.g., Wedding Card Design, Business Cards"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={orderData.notes}
                  onChange={(e) => setOrderData({ ...orderData, notes: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
                  rows="3"
                  placeholder="Additional notes..."
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                    {/* Existing Job */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Use Existing Job (Optional)
                      </label>

                      <select
                        value={selectedExistingJobNo}
                        onChange={(e) => handleSelectExistingJob(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
                      >
                        <option value="">-- Create New Job --</option>

                        {existingJobs.map(([jobNo, jobs]) => (
                          <option key={jobNo} value={jobNo}>
                            {jobNo} ({jobs.length} suppliers)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Job No */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Job No <span className="text-red-500">*</span>
                      </label>

                      <input
                        type="text"
                        value={jobData.jobNo}
                        readOnly
                        className={`w-full px-3 py-2.5 rounded-lg border text-sm ${selectedExistingJobNo
                          ? "bg-blue-50 border-blue-200"
                          : "bg-gray-50 border-gray-200"
                          }`}
                      />
                    </div>

                    {/* Regenerate */}
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={generateNewJobNo}
                        disabled={!!selectedExistingJobNo}
                        className={`w-full px-3 py-2.5 text-sm font-semibold border rounded-lg transition ${selectedExistingJobNo
                          ? "text-gray-400 border-gray-300 cursor-not-allowed bg-gray-100"
                          : "text-primary border-primary hover:bg-primary/10"
                          }`}
                      >
                        Regenerate Job No
                      </button>
                    </div>

                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Job Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={jobData.jobDate}
                    onChange={(e) => setJobData({ ...jobData, jobDate: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Job Description
                  </label>
                  <input
                    type="text"
                    value={jobData.description}
                    onChange={(e) => setJobData({ ...jobData, description: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
                    placeholder="Optional"
                  />
                </div>
              </div>

              {/* Suppliers */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-700">Suppliers & Costs</h3>
                  <button
                    type="button"
                    onClick={addSupplierEntry}
                    className="flex items-center gap-1 text-sm text-primary font-semibold hover:text-primary/80 transition"
                  >
                    <span className="material-symbols-outlined text-lg">add</span>
                    Add Supplier
                  </button>
                </div>

                <div className="divide-y divide-gray-100">
                  {supplierEntries.map((entry, index) => (
                    <div key={entry.id} className="p-4 bg-white">
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-2">
                          {index + 1}
                        </span>

                        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                            <select
                              value={entry.supplierType}
                              onChange={(e) => updateSupplierEntry(entry.id, "supplierType", e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
                            >
                              {SUPPLIER_TYPES.map((type) => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Supplier</label>
                            <select
                              value={entry.supplierId}
                              onChange={(e) => updateSupplierEntry(entry.id, "supplierId", e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
                            >
                              <option value="">-- Select --</option>
                              {getAvailableSuppliers(entry.supplierType).map((supplier) => (
                                <option key={supplier.$id} value={supplier.$id}>
                                  {supplier.name}
                                </option>
                              ))}
                            </select>
                            {getAvailableSuppliers(entry.supplierType).length === 0 && (
                              <p className="text-xs text-red-500 mt-1">No suppliers</p>
                            )}
                          </div>

                          {/* Size */}
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Size</label>
                            <input
                              type="text"
                              value={entry.size || ""}
                              onChange={(e) => updateSupplierEntry(entry.id, "size", e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                              placeholder="12x36"
                            />
                          </div>

                          {/* Pages */}
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Pages</label>
                            <input
                              type="number"
                              value={entry.pages || ""}
                              onChange={(e) => updateSupplierEntry(entry.id, "pages", e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                              placeholder="0"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Cost (₹)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={entry.cost}
                              onChange={(e) => updateSupplierEntry(entry.id, "cost", e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
                              placeholder="0.00"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Work Description</label>
                            <input
                              type="text"
                              value={entry.description}
                              onChange={(e) => updateSupplierEntry(entry.id, "description", e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
                              placeholder="Optional"
                            />
                          </div>
                        </div>

                        {supplierEntries.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSupplierEntry(entry.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition mt-1"
                            title="Remove"
                          >
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-gray-50 px-4 py-3 flex items-center justify-end gap-4 border-t">
                  <span className="text-sm text-gray-600">Total Supplier Cost:</span>
                  <span className="text-lg font-bold text-primary">₹{supplierTotalCost.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Invoice Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={invoiceData.invoiceNumber}
                    onChange={e => setInvoiceData({ ...invoiceData, invoiceNumber: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Invoice Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={invoiceData.invoiceDate}
                    onChange={e => setInvoiceData({ ...invoiceData, invoiceDate: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={invoiceData.status}
                    onChange={e => setInvoiceData({ ...invoiceData, status: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
                  >
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="paid">Paid</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Invoice Title
                  </label>
                  <input
                    type="text"
                    value={invoiceData.invoiceTitle}
                    onChange={e => setInvoiceData({ ...invoiceData, invoiceTitle: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-700">Invoice Items</h3>
                  <button
                    type="button"
                    onClick={addItem}
                    className="flex items-center gap-1 text-sm text-primary font-semibold hover:text-primary/80 transition"
                  >
                    <span className="material-symbols-outlined text-lg">add</span>
                    Add Item
                  </button>
                </div>

                <div className="divide-y divide-gray-100">
                  {items.map((item, i) => (
                    <div key={i} className="p-4 bg-white">
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-500 mb-1">Product</label>
                          <select
                            value={item.productId}
                            onChange={e => updateItem(i, "productId", e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
                          >
                            <option value="">-- Select Product --</option>
                            {products.map(p => (
                              <option key={p.$id} value={p.$id}>
                                {p.name} {p.sku ? `(${p.sku})` : ""}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Qty</label>
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={e => updateItem(i, "qty", Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Price (₹)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.price}
                            onChange={e => updateItem(i, "price", Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
                          />
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-bold text-gray-800">
                            ₹{((Number(item.qty) || 0) * (Number(item.price) || 0)).toFixed(2)}
                          </div>
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(i)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                              title="Remove"
                            >
                              <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-gray-50 px-4 py-3 flex items-center justify-end gap-4 border-t">
                  <span className="text-sm text-gray-600">Subtotal:</span>
                  <span className="text-lg font-bold text-primary">₹{subtotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-bold text-gray-800 mb-2">Order</h3>
                <div className="text-sm text-gray-700 grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div><span className="text-gray-500">Order No:</span> <span className="font-semibold">{orderData.orderNo}</span></div>
                  <div><span className="text-gray-500">Date:</span> <span className="font-semibold">{orderData.orderDate}</span></div>
                  <div><span className="text-gray-500">Customer:</span> <span className="font-semibold">{parties.find(p => p.$id === orderData.partyId)?.name || "-"}</span></div>
                  <div><span className="text-gray-500">Job Type:</span> <span className="font-semibold">{JOB_TYPES.find(t => t.value === orderData.jobType)?.label || orderData.jobType}</span></div>
                  <div className="md:col-span-2"><span className="text-gray-500">Title:</span> <span className="font-semibold">{orderData.title}</span></div>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-bold text-gray-800 mb-2">Job</h3>
                <div className="text-sm text-gray-700 grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div><span className="text-gray-500">Job No:</span> <span className="font-semibold">{jobData.jobNo}</span></div>
                  <div><span className="text-gray-500">Job Date:</span> <span className="font-semibold">{jobData.jobDate}</span></div>
                  <div className="md:col-span-2"><span className="text-gray-500">Suppliers:</span> <span className="font-semibold">{supplierEntries.filter(e => e.supplierId && parseFloat(e.cost) > 0).length}</span></div>
                  <div className="md:col-span-2"><span className="text-gray-500">Total Supplier Cost:</span> <span className="font-semibold">₹{supplierTotalCost.toFixed(2)}</span></div>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-bold text-gray-800 mb-2">Invoice</h3>
                <div className="text-sm text-gray-700 grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div><span className="text-gray-500">Invoice No:</span> <span className="font-semibold">{invoiceData.invoiceNumber}</span></div>
                  <div><span className="text-gray-500">Invoice Date:</span> <span className="font-semibold">{invoiceData.invoiceDate}</span></div>
                  <div><span className="text-gray-500">Status:</span> <span className="font-semibold">{invoiceData.status}</span></div>
                  <div><span className="text-gray-500">Items:</span> <span className="font-semibold">{items.filter(i => i.productId && Number(i.qty) > 0).length}</span></div>
                  <div className="md:col-span-2"><span className="text-gray-500">Grand Total:</span> <span className="font-semibold">₹{subtotal.toFixed(2)}</span></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#dae5e7] bg-white sticky bottom-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-800 transition"
              disabled={loading}
            >
              Cancel
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={back}
              disabled={loading || step === 1}
              className="px-5 py-2.5 rounded-lg border border-gray-200 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Back
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={next}
                disabled={loading}
                className="px-6 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-bold shadow-md shadow-primary/20 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCreateAll}
                disabled={loading}
                className="px-6 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-bold shadow-md shadow-primary/20 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                    Creating...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">done_all</span>
                    Create All
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

