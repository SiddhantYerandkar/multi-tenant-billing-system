import { useEffect, useState } from "react"

export default function AddPartyModal({ isOpen, onClose, onAddParty, partyCode }) {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [openingBalance, setOpeningBalance] = useState("")
  const [balanceType, setBalanceType] = useState("DR")
  const [loading, setLoading] = useState(false)

  // Prevent background scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : ""
    return () => (document.body.style.overflow = "")
  }, [isOpen])

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName("")
      setPhone("")
      setAddress("")
      setLoading(false)
      setOpeningBalance("")
      setBalanceType("DR")
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (!name.trim()) return

    setLoading(true)
    try {
      await onAddParty({
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        isActive: true,

        openingBalance: parseFloat(openingBalance) || 0,
        balanceType: openingBalance ? balanceType : null
      })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[560px] bg-white rounded-xl shadow-2xl border border-[#dae5e7] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-4">
          <h3 className="text-2xl font-bold text-[#101818]">
            Add New Party
          </h3>
          <p className="mt-1 text-sm text-[#5e878d]">
            Create a new customer or vendor record for your inventory.
          </p>
        </div>

        {/* Body */}
        <div className="px-8 py-4 flex flex-col gap-6">
          {/* Party Code */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-[#f0f4f5] border border-[#dae5e7]">
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-[#5e878d] mb-1">
                Party Code
              </span>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-xl">
                  fingerprint
                </span>
                <span className="font-mono text-lg font-bold">
                  {partyCode || "Auto Generated"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
              <span className="material-symbols-outlined text-sm">
                auto_awesome
              </span>
              <span className="text-xs font-bold uppercase">Generated</span>
            </div>
          </div>

          {/* Form */}
          <div className="flex flex-col gap-5">
            {/* Name */}
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold">Customer Name *</span>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#5e878d] group-focus-within:text-primary">
                  person
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  placeholder="Enter full name"
                  className="w-full h-12 pl-12 pr-4 rounded-lg border border-[#dae5e7] focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </label>

            {/* Phone */}
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold">Phone Number</span>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#5e878d] group-focus-within:text-primary">
                  call
                </span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(+91) 00000 00000"
                  className="w-full h-12 pl-12 pr-4 rounded-lg border border-[#dae5e7] focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </label>

            {/* Opening Balance if its present */}
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold">Opening Balance</span>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#5e878d] group-focus-within:text-primary">
                  currency_rupee
                </span>
                <input
                  type="number"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-12 pl-12 pr-4 rounded-lg border border-[#dae5e7] focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="flex items-center gap-4 mt-2">
                <label className="flex items-center gap-2">
                  <input type="radio"
                    name="balanceType"
                    value="DR"
                    checked={balanceType === "DR"}
                    onChange={() => setBalanceType("DR")}
                    className="accent-primary"
                  />
                  <span className="text-sm font-medium">DR</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio"
                    name="balanceType"
                    value="CR"
                    className="accent-primary"
                    checked={balanceType === "CR"}
                    onChange={() => setBalanceType("CR")}
                  />
                  <span className="text-sm font-medium">CR</span>
                </label>
              </div>
            </label>


            {/* Address */}
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold">Address</span>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-4 text-[#5e878d] group-focus-within:text-primary">
                  location_on
                </span>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter address..."
                  className="w-full min-h-[100px] pl-12 pr-4 py-3 rounded-lg border border-[#dae5e7] resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </label>

          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 flex justify-end gap-3 bg-[#f9fafa] dark:bg-slate-800/50 border-t border-[#f0f4f5] dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg border text-sm font-semibold text-[#5e878d]"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading || !name.trim()}
            className="px-8 py-2.5 rounded-lg bg-primary text-white text-sm font-bold disabled:opacity-50 flex items-center gap-2"
          >
            <span className="material-symbols-outlined">save</span>
            {loading ? "Saving..." : "Save Party"}
          </button>
        </div>
      </div>
    </div>
  )
}
