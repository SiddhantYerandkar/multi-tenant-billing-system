import { useState, useEffect, useMemo } from "react"
import { createInvoice, createInvoiceItem, listInvoices } from "../services/invoiceService"
import { updateJob } from "../services/supplierJobService"
import { getProducts } from "../services/productService"
import { getDynamicPrice } from "../services/dynamicPricingService"

const EMPTY_LINE = {
  productId: "",
  productName: "",
  qty: 1,
  price: 0,
}

export default function CreateInvoiceFromJobModal({ open, onClose, company, jobData, onInvoiceCreated }) {
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState([])
  
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [invoiceDate, setInvoiceDate] = useState("")
  const [invoiceTitle, setInvoiceTitle] = useState("")
  const [status, setStatus] = useState("pending")
  
  const [items, setItems] = useState([EMPTY_LINE])
  const [saving, setSaving] = useState(false)

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.qty * i.price, 0),
    [items]
  )

  useEffect(() => {
    if (open && company?.$id) {
      loadData()
    }
  }, [open, company])

  async function loadData() {
    setLoading(true)
    try {
      const [productsRes, invoicesRes] = await Promise.all([
        getProducts(company.$id),
        listInvoices(company.$id)
      ])
      
      setProducts(productsRes.documents || [])
      
      // Generate next invoice number
      const existingInvoices = invoicesRes.documents || []
      const existingNumbers = existingInvoices
        .map(inv => inv.invoiceNumber)
        .filter(num => num && num.match(/^INV-\d+$/))
        .map(num => parseInt(num.replace('INV-', ''), 10))
      
      const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0
      setInvoiceNumber(`INV-${String(maxNumber + 1).padStart(3, '0')}`)
      
      // Set default date
      const today = new Date().toISOString().split('T')[0]
      setInvoiceDate(today)
      setStatus("pending")
      
      // Pre-populate from job
      if (jobData) {
        const jobDescription = jobData.supplierJobs?.[0]?.description || jobData.description || ""
        setInvoiceTitle(jobDescription)
        setItems([{
          ...EMPTY_LINE,
          productName: jobDescription || "Job Work",
        }])
      }
    } catch (err) {
      console.error("Error loading data:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open) {
      setInvoiceTitle("")
      setItems([EMPTY_LINE])
      setInvoiceDate("")
      setStatus("pending")
      setInvoiceNumber("")
    }
  }, [open])

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => (document.body.style.overflow = "")
  }, [open])

  const updateItem = async (index, key, value) => {
    const updatedItems = items.map((it, i) =>
      i === index ? { ...it, [key]: value } : it
    )
    
    // If product is selected, fetch dynamic price
    if (key === "productId" && value && jobData?.party?.$id && company?.$id) {
      const product = products.find(p => p.$id === value)
      if (product) {
        try {
          const dynamicPrice = await getDynamicPrice(company.$id, jobData.party.$id, value)
          const price = dynamicPrice ? dynamicPrice.price : product.basePrice
          updatedItems[index] = { 
            ...updatedItems[index], 
            price,
            productName: product.name
          }
        } catch (error) {
          console.error("Error fetching dynamic price:", error)
          updatedItems[index] = { 
            ...updatedItems[index], 
            price: product?.basePrice || 0,
            productName: product.name
          }
        }
      }
    }
    
    setItems(updatedItems)
  }

  const addItem = () => setItems([...items, EMPTY_LINE])
  const removeItem = (index) => setItems(items.filter((_, i) => i !== index))

  const handleCreateInvoice = async () => {
    if (!invoiceDate) {
      alert("Please select invoice date")
      return
    }

    const validItems = items.filter(item => item.productId && item.qty > 0)
    if (validItems.length === 0) {
      alert("Please add at least one product to the invoice")
      return
    }

    setSaving(true)
    try {
      // Check for duplicate invoice number
      const existingInvoicesRes = await listInvoices(company.$id)
      const existingNumbers = (existingInvoicesRes.documents || []).map(inv => inv.invoiceNumber)
      
      let finalInvoiceNumber = invoiceNumber
      if (existingNumbers.includes(invoiceNumber)) {
        const numbers = existingNumbers
          .filter(num => num && num.match(/^INV-\d+$/))
          .map(num => parseInt(num.replace('INV-', ''), 10))
        const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0
        finalInvoiceNumber = `INV-${String(maxNumber + 1).padStart(3, '0')}`
        setInvoiceNumber(finalInvoiceNumber)
      }

      // Create invoice
      const invoiceData = {
        invoiceNumber: finalInvoiceNumber,
        invoiceTitle: invoiceTitle,
        invoiceDate: new Date(invoiceDate).toISOString(),
        partyId: jobData?.party?.$id || jobData?.partyId,
        companyId: company.$id,
        subTotal: subtotal,
        gstAmount: 0,
        grandTotal: subtotal,
        paidAmount: 0,
        balanceAmount: subtotal,
        status: status,
        jobNo: jobData?.jobNo,
        orderNo: jobData?.orderId || ""
      }

      const invoice = await createInvoice(invoiceData)
      
      // Create invoice items
      for (const item of validItems) {
        const product = products.find(p => p.$id === item.productId)
        const lineTotal = item.qty * item.price
        
        await createInvoiceItem({
          companyId: company.$id,
          invoiceId: invoice.$id,
          productName: product?.name || "",
          productId: item.productId,
          quantity: item.qty,
          rate: item.price,
          discount: 0,
          total: lineTotal
        })
      }

      // Link invoice to all supplier jobs for this job number
      if (jobData?.supplierJobs) {
        for (const job of jobData.supplierJobs) {
          await updateJob(job.$id, { 
            invoiceId: invoice.$id,
            status: "completed"
          })
        }
      }

      if (onInvoiceCreated) {
        onInvoiceCreated(invoice.$id)
      }
      onClose()
    } catch (err) {
      console.error("Error creating invoice:", err)
      alert(err.message || "Failed to create invoice")
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">

        {/* HEADER */}
        <div className="px-8 py-5 border-b border-zinc-200 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold">Create Invoice from Job</h2>
              <span className="px-3 py-1 bg-zinc-100 text-zinc-500 text-xs font-mono rounded border">
                #{invoiceNumber}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Job: <span className="font-semibold text-primary">{jobData?.jobNo}</span>
              {jobData?.party?.name && <span className="ml-2">| Customer: {jobData.party.name}</span>}
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">

          {/* Customer Info */}
          <div className="bg-zinc-50 rounded-lg p-4 border border-zinc-200">
            <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Bill To</p>
            <p className="font-bold text-lg">{jobData?.party?.name || "Unknown Customer"}</p>
            {jobData?.party?.address && (
              <p className="text-sm text-gray-600">{jobData.party.address}</p>
            )}
            {jobData?.party?.phone && (
              <p className="text-sm text-gray-600">Phone: {jobData.party.phone}</p>
            )}
          </div>

          {/* TOP FORM */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700">
                Invoice Number
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={e => setInvoiceNumber(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700">
                Invoice Date
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={e => setInvoiceDate(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700">
                Status
              </label>
              <div className="relative">
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm appearance-none pr-10"
                >
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
                  expand_more
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700">
                Invoice Title
              </label>
              <input
                type="text"
                value={invoiceTitle}
                onChange={e => setInvoiceTitle(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm"
                placeholder="e.g., Wedding Cards"
              />
            </div>
          </div>

          {/* LINE ITEMS */}
          <div className="border border-zinc-200 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase">
                    Product
                  </th>
                  <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase w-24">
                    Qty
                  </th>
                  <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase w-40">
                    Price
                  </th>
                  <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase w-40 text-right">
                    Line Total
                  </th>
                  <th className="w-12" />
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100">
                {items.map((item, i) => {
                  const selectedProduct = products.find(p => p.$id === item.productId)
                  return (
                    <tr key={i}>
                      <td className="px-6 py-4">
                        <select
                          value={item.productId}
                          onChange={e => updateItem(i, "productId", e.target.value)}
                          className="w-full bg-transparent border-none text-sm p-0"
                        >
                          <option value="">-- Select Product --</option>
                          {products.map(product => (
                            <option key={product.$id} value={product.$id}>
                              {product.name} {product.sku ? `(${product.sku})` : ''}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-6 py-4">
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={e => updateItem(i, "qty", +e.target.value)}
                          className="w-full bg-transparent border-none text-sm p-0"
                        />
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-zinc-400">₹</span>
                          <input
                            type="number"
                            step="0.01"
                            value={item.price}
                            onChange={e => updateItem(i, "price", +e.target.value)}
                            className="w-full bg-transparent border-none text-sm p-0"
                            placeholder={selectedProduct ? `Base: ₹${selectedProduct.basePrice}` : "0.00"}
                          />
                        </div>
                        {selectedProduct && item.price !== selectedProduct.basePrice && (
                          <span className="text-xs text-zinc-400 mt-1 block">
                            Base: ₹{selectedProduct.basePrice}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right text-sm font-bold">
                        ₹{(item.qty * item.price).toFixed(2)}
                      </td>

                      <td className="px-6 py-4">
                        {items.length > 1 && (
                          <button
                            onClick={() => removeItem(i)}
                            className="text-zinc-300 hover:text-red-500"
                          >
                            <span className="material-symbols-outlined">
                              delete
                            </span>
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div className="p-4 bg-zinc-50">
              <button
                onClick={addItem}
                className="flex items-center gap-2 text-primary font-bold text-sm hover:underline"
              >
                <span className="material-symbols-outlined">
                  add_circle
                </span>
                Add Line Item
              </button>
            </div>
          </div>

          {/* TOTALS */}
          <div className="flex justify-end">
            <div className="w-64 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Subtotal</span>
                <span className="font-medium">₹{subtotal.toFixed(2)}</span>
              </div>
              
              <div className="h-px bg-zinc-200" />

              <div className="flex justify-between items-center pt-1">
                <span className="text-base font-bold">Grand Total</span>
                <span className="text-xl font-black text-primary">
                  ₹{subtotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-8 py-5 bg-zinc-50 border-t border-zinc-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg text-sm font-bold text-zinc-600 hover:bg-zinc-100"
          >
            Cancel
          </button>

          <button 
            onClick={handleCreateInvoice}
            disabled={saving}
            className="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-bold shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <span className="material-symbols-outlined animate-spin">sync</span>
                Creating...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">receipt</span>
                Create Invoice
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
