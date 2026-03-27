import { useEffect, useState } from "react"
import { getParties } from "../services/partyService"
import { getProducts } from "../services/productService"
import { getDynamicPricesForParty, setDynamicPrice, deleteDynamicPrice } from "../services/dynamicPricingService"

export default function DynamicPricing({ company }) {
    const [parties, setParties] = useState([])
    const [products, setProducts] = useState([])
    const [selectedPartyId, setSelectedPartyId] = useState("")
    const [dynamicPrices, setDynamicPrices] = useState({}) // Map of productId -> price
    const [priceInputs, setPriceInputs] = useState({}) // Map of productId -> input value
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState({}) // Map of productId -> saving state
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(5)

    async function loadParties() {
        const res = await getParties(company.$id)
        setParties(res.documents)
    }

    async function loadProducts() {
        const res = await getProducts(company.$id)
        console.log(res)
        setProducts(res.documents)
    }

    async function loadDynamicPrices() {
        if (!selectedPartyId) {
            setDynamicPrices({})
            setPriceInputs({})
            return
        }

        setLoading(true)
        try {
            const res = await getDynamicPricesForParty(company.$id, selectedPartyId)
            const priceMap = {}
            const inputMap = {}
            
            res.documents.forEach(dp => {
                priceMap[dp.productId] = dp.price
                inputMap[dp.productId] = dp.price.toString()
            })
            
            setDynamicPrices(priceMap)
            setPriceInputs(inputMap)
        } catch (error) {
            console.error("Error loading dynamic prices:", error)
            alert("Failed to load pricing. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { 
        loadParties()
        loadProducts()
    }, [])

    useEffect(() => {
        loadDynamicPrices()
        setCurrentPage(1) // Reset to page 1 when party changes
    }, [selectedPartyId])

    // Pagination calculations
    const totalPages = Math.ceil(products.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedProducts = products.slice(startIndex, endIndex)
    const startEntry = products.length === 0 ? 0 : startIndex + 1
    const endEntry = Math.min(endIndex, products.length)

    const handlePageChange = (page) => {
        setCurrentPage(page)
    }

    const handlePreviousPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1)
        }
    }

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1)
        }
    }

    // Generate page numbers to display
    const getPageNumbers = () => {
        const pages = []
        const maxVisiblePages = 5
        
        if (totalPages <= maxVisiblePages) {
            // Show all pages if total pages is less than max visible
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i)
            }
        } else {
            // Show pages with ellipsis logic
            if (currentPage <= 3) {
                // Show first pages
                for (let i = 1; i <= 4; i++) {
                    pages.push(i)
                }
                pages.push('...')
                pages.push(totalPages)
            } else if (currentPage >= totalPages - 2) {
                // Show last pages
                pages.push(1)
                pages.push('...')
                for (let i = totalPages - 3; i <= totalPages; i++) {
                    pages.push(i)
                }
            } else {
                // Show middle pages
                pages.push(1)
                pages.push('...')
                for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                    pages.push(i)
                }
                pages.push('...')
                pages.push(totalPages)
            }
        }
        
        return pages
    }

    const handlePriceChange = (productId, value) => {
        setPriceInputs(prev => ({
            ...prev,
            [productId]: value
        }))
    }

    const handleSavePrice = async (productId) => {
        const inputValue = priceInputs[productId]?.trim()
        const product = products.find(p => p.$id === productId)
        
        if (!product || !selectedPartyId) return

        setSaving(prev => ({ ...prev, [productId]: true }))

        try {
            if (!inputValue || inputValue === "") {
                // Clear dynamic price (use base price)
                await deleteDynamicPrice(company.$id, selectedPartyId, productId)
                setDynamicPrices(prev => {
                    const updated = { ...prev }
                    delete updated[productId]
                    return updated
                })
                setPriceInputs(prev => {
                    const updated = { ...prev }
                    delete updated[productId]
                    return updated
                })
            } else {
                const price = Number(inputValue)
                if (isNaN(price) || price < 0) {
                    alert("Please enter a valid price")
                    return
                }
                
                await setDynamicPrice(company.$id, selectedPartyId, productId, price)
                setDynamicPrices(prev => ({
                    ...prev,
                    [productId]: price
                }))
            }
        } catch (error) {
            console.error("Error saving price:", error)
            alert("Failed to save price. Please try again.")
        } finally {
            setSaving(prev => ({ ...prev, [productId]: false }))
        }
    }

    const handleClearPrice = async (productId) => {
        if (!selectedPartyId) return
        
        setSaving(prev => ({ ...prev, [productId]: true }))
        try {
            await deleteDynamicPrice(company.$id, selectedPartyId, productId)
            setDynamicPrices(prev => {
                const updated = { ...prev }
                delete updated[productId]
                return updated
            })
            setPriceInputs(prev => {
                const updated = { ...prev }
                delete updated[productId]
                return updated
            })
        } catch (error) {
            console.error("Error clearing price:", error)
            alert("Failed to clear price. Please try again.")
        } finally {
            setSaving(prev => ({ ...prev, [productId]: false }))
        }
    }

    const getEffectivePrice = (productId) => {
        return dynamicPrices[productId] ?? products.find(p => p.$id === productId)?.basePrice ?? 0
    }

    const hasCustomPrice = (productId) => {
        return dynamicPrices.hasOwnProperty(productId)
    }

    const selectedParty = parties.find(p => p.$id === selectedPartyId)

    return (
        <div className="max-w-[1200px] mx-auto px-6 py-6 font-display">
      
          {/* Page Heading */}
          <div className="mb-6">
            <h1 className="text-3xl font-black tracking-tight text-[#111718]">
              Party Pricing Manager
            </h1>
            <p className="text-[#638288] mt-1">
              Set and manage custom product prices for specific customers.
            </p>
          </div>
      
          {/* Select Party */}
          <div className="bg-white border border-[#dce4e5] rounded-xl p-4 shadow-sm mb-6">
            <label className="block text-sm font-bold text-[#111718] mb-2">
              Select Party (Customer)
            </label>
      
            <div className="relative max-w-md">
              <select
                value={selectedPartyId}
                onChange={(e) => setSelectedPartyId(e.target.value)}
                className="w-full h-12 appearance-none rounded-lg border border-[#dce4e5] bg-white px-4 pr-10 text-sm focus:border-primary focus:ring-primary"
              >
                <option value="">-- Select party --</option>
                {parties.map(p => (
                  <option key={p.$id} value={p.$id}>
                    {p.name}
                  </option>
                ))}
              </select>
      
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#638288]">
                expand_more
              </span>
            </div>
          </div>
      
          {/* Loading */}
          {loading && (
            <div className="text-center py-10 text-[#638288]">
              Loading pricing data…
            </div>
          )}
      
          {/* Pricing Table */}
          {!loading && selectedPartyId && (
            <div className="bg-white border border-[#dce4e5] rounded-xl shadow-sm overflow-hidden">
      
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f0f4f4] text-xs font-bold uppercase tracking-wider text-[#638288]">
                    <th className="px-6 py-4">Product Name</th>
                    <th className="px-6 py-4">Base Price</th>
                    <th className="px-6 py-4">Custom Price</th>
                    <th className="px-6 py-4 text-center">Status</th>
                  </tr>
                </thead>
      
                <tbody className="divide-y divide-[#dce4e5]">
                  {paginatedProducts.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-sm text-[#638288]">
                        No products found
                      </td>
                    </tr>
                  )}
                  {paginatedProducts.map(product => {
                    const customPrice = dynamicPrices[product.$id]
                    const inputValue = priceInputs[product.$id] ?? ""
      
                    return (
                      <tr
                        key={product.$id}
                        className="hover:bg-[#f9fafa] transition-colors"
                      >
                        {/* Product */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-[#111718]">
                              {product.name}
                            </span>
                            <span className="text-xs text-[#638288]">
                              SKU: {product.sku || "—"}
                            </span>
                          </div>
                        </td>
      
                        {/* Base Price */}
                        <td className="px-6 py-4 text-[#638288] font-medium">
                          ₹{product.basePrice}
                        </td>
      
                        {/* Custom Price */}
                        <td className="px-6 py-4">
                          <div className="relative max-w-[160px]">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#638288]">
                              ₹
                            </span>
                            <input
                              type="number"
                              value={inputValue}
                              onChange={(e) =>
                                handlePriceChange(product.$id, e.target.value)
                              }
                              onBlur={() => handleSavePrice(product.$id)}
                              placeholder="Using Base Price"
                              className={`w-full pl-6 h-10 rounded-lg border text-sm
                                ${
                                  customPrice
                                    ? "border-primary text-primary font-bold"
                                    : "border-[#dce4e5] italic"
                                }
                              `}
                            />
                          </div>
                        </td>
      
                        {/* Status */}
                        <td className="px-6 py-4 text-center">
                          {customPrice ? (
                            <span className="inline-flex px-2 py-1 rounded-full text-[10px] font-bold bg-primary/10 text-primary uppercase">
                              Customized
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-[#638288] uppercase">
                              Base Rate
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
      
              {/* PAGINATION FOOTER */}
              <div className="px-6 py-4 bg-[#f0f4f5]/30 dark:bg-slate-800/30 flex items-center justify-between border-t border-[#dae5e7] dark:border-slate-800">
                <p className="text-xs text-[#5e878d] dark:text-slate-400 font-medium">
                  Showing {startEntry} to {endEntry} of {products.length} entries
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded bg-white dark:bg-slate-700 border border-[#dae5e7] dark:border-slate-600 text-[#5e878d] hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                  </button>
                  
                  {getPageNumbers().map((page, index) => {
                    if (page === '...') {
                      return (
                        <span key={`ellipsis-${index}`} className="w-8 h-8 flex items-center justify-center text-[#5e878d] text-xs">
                          ...
                        </span>
                      )
                    }
                    
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`w-8 h-8 rounded text-xs font-bold transition-colors ${
                          currentPage === page
                            ? 'bg-primary text-white'
                            : 'bg-white dark:bg-slate-700 text-[#5e878d] hover:bg-primary/5'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  })}
                  
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="p-1.5 rounded bg-white dark:bg-slate-700 border border-[#dae5e7] dark:border-slate-600 text-[#5e878d] hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>
          )}
      
          {!loading && !selectedPartyId && (
            <div className="bg-white border border-[#dce4e5] rounded-xl p-10 text-center text-[#638288]">
              Please select a party to manage pricing
            </div>
          )}
        </div>
      )
      
}
