import { useState, useEffect } from "react"
import { getParties } from "../services/partyService"
import { listDesigners } from "../services/designerService"

const STATUS_OPTIONS = ["pending", "working", "approval", "done"]

const SIZE_OPTIONS = [
    "8x12",
    "8x16",
    "8x24",
    "9x12",
    "9x24",
    "12x18",
    "12x24",
    "12x30",
    "12x36"
]

const FUNCTION_OPTIONS = [
    "wedding",
    "birthday",
    "engagement",
    "retirement",
    "naming ceremony",
    "other"
]

export default function CreateJobModal({ open, onClose, onCreate, companyId, editData }) {
    const [form, setForm] = useState({
        dateIn: "",
        party: "",
        title: "",
        function: "",
        size: "",
        pages: "",
        designerId: "",
        status: "pending",
        orderNo: ""
    })

    const [loading, setLoading] = useState(false)

    // 🔥 parties state
    const [parties, setParties] = useState([])
    const [partyLoading, setPartyLoading] = useState(false)
    const [partySearch, setPartySearch] = useState("")
    const [showDropdown, setShowDropdown] = useState(false)
    const [designers, setDesigners] = useState([])
    const [designerLoading, setDesignerLoading] = useState(false)
    const [designerSearch, setDesignerSearch] = useState("")
    const [showDesignerDropdown, setShowDesignerDropdown] = useState(false)
    const getEntityId = (item) => item?.id || item?.$id

    useEffect(() => {
        if (editData) {
            setForm({
                dateIn: editData.dateIn || "",
                party: editData.party || "",
                title: editData.title || "",
                function: editData.function || "",
                size: editData.size || "",
                pages: editData.pages || "",
                designerId: editData.designerId || "",
                status: editData.status || "pending",
                orderNo: editData.orderNo || ""
            })
        }
    }, [editData])

    useEffect(() => {
        if (open && !editData) {
            setForm(prev => ({
                ...prev,
                dateIn: new Date().toISOString().slice(0, 10)
            }))
        }
    }, [open, editData])

    useEffect(() => {
        if (!open || !companyId) return

        const loadParties = async () => {
            setPartyLoading(true)
            try {
                const res = await getParties(companyId)
                setParties(res.documents || [])
            } catch (err) {
                console.error("Failed to load parties:", err)
            }
            setPartyLoading(false)
        }

        loadParties()
    }, [open, companyId])

    useEffect(() => {
        if (!open || !companyId) return

        const loadDesigners = async () => {
            setDesignerLoading(true)
            try {
                const res = await listDesigners(companyId)
                const list = Array.isArray(res) ? res : (res?.documents || [])
                setDesigners(list)
            } catch (err) {
                console.error("Failed to load designers:", err)
            }
            setDesignerLoading(false)
        }

        loadDesigners()
    }, [open, companyId])

    // sync partySearch when editing
    useEffect(() => {
        if (form.party && parties.length) {
            const selected = parties.find(p => p.name === form.party || p.$id === form.party)
            if (selected) {
                setPartySearch(selected.name)
            }
        }
    }, [form.party, parties])

    useEffect(() => {
        if (form.designerId && designers.length) {
            const selected = designers.find(
                d => String(getEntityId(d)) === String(form.designerId)
            )
            if (selected) {
                setDesignerSearch(selected.name || "")
            }
        }
    }, [form.designerId, designers])
    const handleChange = (key, value) => {
        setForm(prev => ({ ...prev, [key]: value }))
    }

    const handleSubmit = async () => {
        if (!form.party || !form.title || !form.designerId) {
            alert("Party, Title and Designer are required")
            return
        }

        setLoading(true)

        await onCreate({
            ...form,
            pages: Number(form.pages) || 0,
        })

        setLoading(false)

        // reset
        setForm({
            dateIn: "",
            party: "",
            title: "",
            function: "",
            size: "",
            pages: "",
            designerId: "",
            status: "pending",
            orderNo: ""
        })

        onClose()
    }

    const filteredParties = parties.filter(p =>
        p.name?.toLowerCase().includes(partySearch.toLowerCase()) ||
        p.partyCode?.toLowerCase().includes(partySearch.toLowerCase()) ||
        p.phone?.toLowerCase().includes(partySearch.toLowerCase())
    )
    const filteredDesigners = designers.filter(d =>
        d.name?.toLowerCase().includes(designerSearch.toLowerCase()) ||
        d.email?.toLowerCase().includes(designerSearch.toLowerCase()) ||
        d.mobile?.toLowerCase().includes(designerSearch.toLowerCase())
    )

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest(".party-dropdown")) {
                setShowDropdown(false)
            }
            if (!e.target.closest(".designer-dropdown")) {
                setShowDesignerDropdown(false)
            }
        }

        document.addEventListener("click", handleClickOutside)
        return () => document.removeEventListener("click", handleClickOutside)
    }, [])

    if (!open) return null

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

            <div className="bg-white w-full max-w-2xl rounded-xl shadow-lg">

                {/* HEADER */}
                <div className="px-6 py-4 border-b border-[#dae5e7] flex justify-between items-center">
                    <h2 className="text-xl font-bold">
                        {editData ? "Edit Design Job" : "Create Design Job"}
                    </h2>
                    <button onClick={onClose}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* BODY */}
                <div className="p-6 grid grid-cols-2 gap-4">

                    <Input label="Date" type="date" value={form.dateIn} onChange={v => handleChange("dateIn", v)} />

                    {/* 🔥 PARTY DROPDOWN */}
                    <div className="flex flex-col">
                        <div className="flex flex-col relative party-dropdown">
                            <label className="text-xs font-semibold text-gray-500 mb-1">
                                Party
                            </label>

                            {/* INPUT */}
                            <input
                                value={partySearch}
                                onChange={(e) => {
                                    setPartySearch(e.target.value)
                                    setShowDropdown(true)
                                }}
                                onFocus={() => setShowDropdown(true)}
                                placeholder={partyLoading ? "Loading..." : "Search Party..."}
                                className="px-3 py-2 rounded-lg border border-[#dae5e7] text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                            />

                            {/* DROPDOWN */}
                            {showDropdown && (
                                <div className="absolute top-full mt-1 w-full bg-white border border-[#dae5e7] rounded-lg shadow-lg max-h-48 overflow-auto z-50">

                                    {filteredParties.length === 0 ? (
                                        <div className="p-3 text-sm text-gray-500">
                                            No party found
                                        </div>
                                    ) : (
                                        filteredParties.map(p => (
                                            <div
                                                key={p.$id}
                                                onClick={() => {
                                                    handleChange("party", p.name)
                                                    setPartySearch(p.name)
                                                    setShowDropdown(false)
                                                }}
                                                className="px-3 py-2 text-sm hover:bg-primary/10 cursor-pointer flex flex-col"
                                            >
                                                <span className="font-medium">{p.name}</span>
                                                <span className="text-xs text-gray-500">
                                                    {p.partyCode} • {p.phone || "No phone"}
                                                </span>
                                            </div>
                                        ))
                                    )}

                                </div>
                            )}


                        </div>


                    </div>

                    <Input label="Title" value={form.title} onChange={v => handleChange("title", v)} />

                    <div className="flex flex-col">
                        <label className="text-xs font-semibold text-gray-500 mb-1">
                            Function
                        </label>
                        <select
                            value={form.function}
                            onChange={(e) => handleChange("function", e.target.value)}
                            className="px-3 py-2 rounded-lg border border-[#dae5e7] text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                        >
                            <option value="">Select function</option>
                            {FUNCTION_OPTIONS.map(f => (
                                <option key={f} value={f}>{f}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col">
                        <label className="text-xs font-semibold text-gray-500 mb-1">Size</label>
                        <select
                            value={form.size}
                            onChange={(e) => handleChange("size", e.target.value)}
                            className="px-3 py-2 rounded-lg border border-[#dae5e7] text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                        >
                            {SIZE_OPTIONS.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>

                    <Input label="Pages" type="number" value={form.pages} onChange={v => handleChange("pages", v)} />

                    <div className="flex flex-col">
                        <div className="flex flex-col relative designer-dropdown">
                            <label className="text-xs font-semibold text-gray-500 mb-1">
                                Designer
                            </label>

                            <input
                                value={designerSearch}
                                onChange={(e) => {
                                    setDesignerSearch(e.target.value)
                                    setShowDesignerDropdown(true)
                                }}
                                onFocus={() => setShowDesignerDropdown(true)}
                                placeholder={designerLoading ? "Loading..." : "Search Designer..."}
                                className="px-3 py-2 rounded-lg border border-[#dae5e7] text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                            />

                            {showDesignerDropdown && (
                                <div className="absolute top-full mt-1 w-full bg-white border border-[#dae5e7] rounded-lg shadow-lg max-h-48 overflow-auto z-50">
                                    {filteredDesigners.length === 0 ? (
                                        <div className="p-3 text-sm text-gray-500">
                                            No designer found
                                        </div>
                                    ) : (
                                        filteredDesigners.map(d => (
                                            <div
                                                key={getEntityId(d)}
                                                onClick={() => {
                                                    handleChange("designerId", getEntityId(d))
                                                    setDesignerSearch(d.name || "")
                                                    setShowDesignerDropdown(false)
                                                }}
                                                className="px-3 py-2 text-sm hover:bg-primary/10 cursor-pointer flex flex-col"
                                            >
                                                <span className="font-medium">{d.name || "-"}</span>
                                                <span className="text-xs text-gray-500">
                                                    {d.email || "No email"} • {d.mobile || d.phone || "No mobile"}
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* STATUS */}
                    <div className="flex flex-col">
                        <label className="text-xs font-semibold text-gray-500 mb-1">Status</label>
                        <select
                            value={form.status}
                            onChange={(e) => handleChange("status", e.target.value)}
                            className="px-3 py-2 rounded-lg border border-[#dae5e7] text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                        >
                            {STATUS_OPTIONS.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>

                    {form.status === "done" && (
                        <Input
                            label="Order No"
                            value={form.orderNo}
                            onChange={v => handleChange("orderNo", v)}
                        />
                    )}

                </div>

                {/* FOOTER */}
                <div className="px-6 py-4 border-t border-[#dae5e7] flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg border border-[#dae5e7]"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-5 py-2 rounded-lg bg-primary text-white font-bold"
                    >
                        {loading ? "Saving..." : editData ? "Update Job" : "Create Job"}
                    </button>
                </div>

            </div>
        </div>
    )
}

/* ---------- INPUT COMPONENT ---------- */
function Input({ label, value, onChange, type = "text" }) {
    return (
        <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-500 mb-1">
                {label}
            </label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="px-3 py-2 rounded-lg border border-[#dae5e7] text-sm focus:ring-2 focus:ring-primary/50 outline-none"
            />
        </div>
    )
}