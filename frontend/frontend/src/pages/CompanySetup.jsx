import { useState } from "react"
import { createCompany } from "../services/companyService"
import { getCurrentUser } from "../services/authService"

export default function CompanySetup() {
    const [form, setForm] = useState({
        name: "",
        address: "",
        phone: "",
        gst_number: "",
        gst_enabled: false,
        website: "",
        upi_id: "",
        email: "",
    })

    const [logo, setLogo] = useState(null)
    const [qr, setQr] = useState(null)
    const [loading, setLoading] = useState(false)

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target
        setForm({
            ...form,
            [name]: type === "checkbox" ? checked : value,
        })
    }

    const handleSubmit = async () => {
        if (!form.name) return alert("Company name required")

        try {
            setLoading(true)

            const user = await getCurrentUser()
            if (!user?.id) throw new Error("User not found")

            await createCompany(form, logo, qr, user.id)

            window.location.reload()
        } catch (err) {
            console.error(err)
            alert(err?.message || "Failed to create company")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-xl w-full max-w-xl shadow">
                <h1 className="text-2xl font-bold mb-6">Company Setup</h1>

                <div className="space-y-4">

                    <input
                        name="name"
                        placeholder="Company Name"
                        className="input"
                        onChange={handleChange}
                    />

                    <textarea
                        name="address"
                        placeholder="Address"
                        className="input"
                        onChange={handleChange}
                    />

                    <input
                        name="phone"
                        placeholder="Phone"
                        className="input"
                        onChange={handleChange}
                    />

                    <input
                        name="upi_id"
                        placeholder="UPI ID"
                        className="input"
                        onChange={handleChange}
                    />

                    <input
                        name="email"
                        placeholder="Email"
                        className="input"
                        onChange={handleChange}
                    />

                    <input
                        name="website"
                        placeholder="Website (Optional)"
                        className="input"
                        onChange={handleChange}
                    />

                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            name="gst_enabled"
                            onChange={handleChange}
                        />
                        <label>Enable GST</label>
                    </div>

                    {form.gst_enabled && (
                        <input
                            name="gst_number"
                            placeholder="GST Number"
                            className="input"
                            onChange={handleChange}
                        />
                    )}

                    {/* LOGO UPLOAD */}
                    <div>
                        <label className="text-sm font-semibold">Logo</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setLogo(e.target.files[0])}
                        />
                    </div>

                    {/* QR UPLOAD */}
                    <div>
                        <label className="text-sm font-semibold">QR Code</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setQr(e.target.files[0])}
                        />
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full bg-black text-white py-2 rounded-lg"
                    >
                        {loading ? "Saving..." : "Create Company"}
                    </button>
                </div>
            </div>
        </div>
    )
}