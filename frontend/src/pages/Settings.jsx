import { useState, useEffect, useRef } from "react"
import { updateCompany } from "../services/companyService"

export default function Settings({ company, onCompanyUpdate }) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    website: "",
    street: "",
    email: "",
    city: "",
    postalCode: "",
  })
  const [logo, setLogo] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [qrCode, setQrCode] = useState(null)
  const [qrCodePreview, setQrCodePreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const logoInputRef = useRef(null)
  const qrCodeInputRef = useRef(null)

  useEffect(() => {
    if (company) {
      console.log("Company data loaded:", company)
      console.log("Company logo URL:", company.logoUrl)
      
      // Parse address if it's a string
      let street = ""
      let city = ""
      let postalCode = ""
      
      if (company.address) {
        if (typeof company.address === "string") {
          const addressParts = company.address.split(",").map(s => s.trim())
          street = addressParts[0] || ""
          city = addressParts[1] || ""
          postalCode = addressParts[2] || ""
        } else if (Array.isArray(company.address)) {
          street = company.address[0] || ""
          city = company.address[1] || ""
          postalCode = company.address[2] || ""
        }
      }

      setFormData({
        name: company.name || "",
        phone: company.phone || "",
        website: company.website || "",
        email: company.email || "",
        street: street,
        city: city,
        postalCode: postalCode,
      })

      // Load logo preview if exists (now stored as URL directly)
      if (company.logoUrl) {
        console.log("Loading logo from URL:", company.logoUrl)
        setLogoPreview(company.logoUrl)
      } else {
        console.log("No logo URL found in company data")
        setLogoPreview(null)
      }

      // Load QR code preview if exists (now stored as URL directly)
      if (company.qrCodeUrl) {
        console.log("Loading QR code from URL:", company.qrCodeUrl)
        setQrCodePreview(company.qrCodeUrl)
      } else {
        console.log("No QR code URL found in company data")
        setQrCodePreview(null)
      }
    }
  }, [company])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setHasChanges(true)
  }

  const handleLogoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setLogo(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result)
      }
      reader.readAsDataURL(file)
      setHasChanges(true)
    }
  }

  const handleRemoveLogo = () => {
    setLogo(null)
    setLogoPreview(null)
    if (logoInputRef.current) {
      logoInputRef.current.value = ""
    }
    setHasChanges(true)
  }

  const handleQrCodeChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setQrCode(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setQrCodePreview(reader.result)
      }
      reader.readAsDataURL(file)
      setHasChanges(true)
    }
  }

  const handleRemoveQrCode = () => {
    setQrCode(null)
    setQrCodePreview(null)
    if (qrCodeInputRef.current) {
      qrCodeInputRef.current.value = ""
    }
    setHasChanges(true)
  }

  const handleDiscard = () => {
    // Reset to original values
    if (company) {
      let street = ""
      let city = ""
      let postalCode = ""
      
      if (company.address) {
        if (typeof company.address === "string") {
          const addressParts = company.address.split(",").map(s => s.trim())
          street = addressParts[0] || ""
          city = addressParts[1] || ""
          postalCode = addressParts[2] || ""
        } else if (Array.isArray(company.address)) {
          street = company.address[0] || ""
          city = company.address[1] || ""
          postalCode = company.address[2] || ""
        }
      }

      setFormData({
        name: company.name || "",
        phone: company.phone || "",
        website: company.website || "",
        email: company.email || "",
        street: street,
        city: city,
        postalCode: postalCode,
      })

      // Logo and QR code URLs are now stored directly in company object
      if (company.logoUrl) {
        setLogoPreview(company.logoUrl)
      } else {
        setLogoPreview(null)
      }

      if (company.qrCodeUrl) {
        setQrCodePreview(company.qrCodeUrl)
      } else {
        setQrCodePreview(null)
      }
    }
    setLogo(null)
    setQrCode(null)
    setHasChanges(false)
  }

  const handleSave = async () => {
    if (!company) return

    setLoading(true)
    try {
      // Combine address fields
      const address = [formData.street, formData.city, formData.postalCode]
        .filter(Boolean)
        .join(", ")

      const updateData = {
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        address: address || undefined,
      }

      // Only include website if it has a value
      if (formData.website && formData.website.trim()) {
        updateData.website = formData.website.trim()
      }

      await updateCompany(company.$id, updateData, logo, qrCode)
      
      if (onCompanyUpdate) {
        onCompanyUpdate()
      }
      
      setHasChanges(false)
      setLogo(null)
      setQrCode(null)
      alert("Settings saved successfully!")
    } catch (error) {
      console.error("Error saving settings:", error)
      alert("Failed to save settings. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="h-full flex flex-col overflow-hidden bg-background-light dark:bg-background-dark relative">
      {/* HEADER */}
      <header className="flex-shrink-0 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-8 py-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">Settings</span>
          <span className="text-slate-400">/</span>
          <span className="font-semibold">Company Profile</span>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            <span className="material-symbols-outlined text-xl">help_outline</span>
          </button>
          <button className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            <span className="material-symbols-outlined text-xl">dark_mode</span>
          </button>
        </div>
      </header>

      {/* CONTENT - Scrollable Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-4xl mx-auto w-full pb-32">
        <div className="mb-8">
          <h2 className="text-3xl font-black tracking-tight mb-2">Company Settings</h2>
          <p className="text-slate-500 text-sm">Update your business details, contact information, and branding preferences.</p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          {/* GENERAL INFORMATION */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 mb-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-primary">info</span>
              <h3 className="font-bold text-lg">General Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2" htmlFor="company-name">
                  Company Name
                </label>
                <input
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  id="company-name"
                  name="name"
                  placeholder="Enter company name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2" htmlFor="email">
                  Email
                </label>
                <input
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  id="email"
                  name="email"
                  placeholder="Enter company email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2" htmlFor="primary-phone">
                  Primary Phone
                </label>
                <input
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  id="primary-phone"
                  name="phone"
                  placeholder="+1 (555) 000-0000"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2" htmlFor="website">
                  Website
                </label>
                <input
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  id="website"
                  name="website"
                  placeholder="www.yourcompany.com"
                  type="url"
                  value={formData.website}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* BUSINESS ADDRESS */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 mb-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-primary">location_on</span>
              <h3 className="font-bold text-lg">Business Address</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2" htmlFor="street">
                  Street Address
                </label>
                <input
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  id="street"
                  name="street"
                  placeholder="123 Business Way"
                  type="text"
                  value={formData.street}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2" htmlFor="city">
                  City
                </label>
                <input
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  id="city"
                  name="city"
                  placeholder="San Francisco"
                  type="text"
                  value={formData.city}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2" htmlFor="postal-code">
                  Postal Code
                </label>
                <input
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  id="postal-code"
                  name="postalCode"
                  placeholder="94103"
                  type="text"
                  value={formData.postalCode}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* COMPANY BRANDING */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 mb-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-primary">palette</span>
              <h3 className="font-bold text-lg">Company Branding</h3>
            </div>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
              <div className="relative group">
                <div className="w-32 h-32 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                  {logoPreview ? (
                    <img
                      alt="Company Logo"
                      className="w-full h-full object-cover"
                      src={logoPreview}
                      onError={() => {
                        console.error("Failed to load logo image")
                        setLogoPreview(null)
                      }}
                    />
                  ) : (
                    <span className="material-symbols-outlined text-slate-400 text-4xl">image</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 bg-primary text-white p-2 rounded-full shadow-lg hover:bg-primary/90 transition-all"
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                </button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold mb-1">Company Logo</p>
                <p className="text-xs text-slate-500 mb-4">Recommended size: 512x512px. Supported formats: PNG, JPG, SVG.</p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="px-4 py-2 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Change Logo
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="px-4 py-2 text-xs font-bold text-red-500 hover:text-red-600 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* QR CODE */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 mb-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-primary">qr_code</span>
              <h3 className="font-bold text-lg">QR Code</h3>
            </div>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
              <div className="relative group">
                <div className="w-32 h-32 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                  {qrCodePreview ? (
                    <img
                      alt="QR Code"
                      className="w-full h-full object-cover"
                      src={qrCodePreview}
                      onError={() => {
                        console.error("Failed to load QR code image")
                        setQrCodePreview(null)
                      }}
                    />
                  ) : (
                    <span className="material-symbols-outlined text-slate-400 text-4xl">qr_code</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => qrCodeInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 bg-primary text-white p-2 rounded-full shadow-lg hover:bg-primary/90 transition-all"
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                </button>
                <input
                  ref={qrCodeInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleQrCodeChange}
                  className="hidden"
                />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold mb-1">QR Code Image</p>
                <p className="text-xs text-slate-500 mb-4">Upload your company QR code. Recommended size: 512x512px. Supported formats: PNG, JPG, SVG.</p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => qrCodeInputRef.current?.click()}
                    className="px-4 py-2 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Change QR Code
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveQrCode}
                    className="px-4 py-2 text-xs font-bold text-red-500 hover:text-red-600 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
        </div>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="flex-shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-8 py-4 flex justify-end gap-3">
        <button
          type="button"
          onClick={handleDiscard}
          disabled={!hasChanges}
          className="px-6 py-2.5 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Discard
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={loading || !hasChanges}
          className="px-8 py-2.5 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <span className="material-symbols-outlined text-sm animate-spin">sync</span>
              Saving...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-sm">save</span>
              Save Changes
            </>
          )}
        </button>
      </div>

    </main>
  )
}
