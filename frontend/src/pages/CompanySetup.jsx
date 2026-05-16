import { useState } from "react"
import { createCompany } from "../services/companyService"
import { account } from "../services/appwrite"

export default function CompanySetup() {
    const [form, setForm] = useState({
        name: "",
        address: "",
        phone: "",
        gstNumber: "",
        gstEnabled: false,
    })

    const [logo, setLogo] = useState(null)
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
            const user = await account.get()

            await createCompany(form, logo, user.$id)
            window.location.reload()
        } catch (err) {
            console.error(err)
            alert(`Failed to create company: ${err?.message || "Unknown error"}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-xl w-full max-w-xl shadow">
                <h1 className="text-2xl font-bold mb-6">
                    Company Setup
                </h1>

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

                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            name="gstEnabled"
                            onChange={handleChange}
                        />
                        <label>Enable GST</label>
                    </div>

                    {form.gstEnabled && (
                        <input
                            name="gstNumber"
                            placeholder="GST Number"
                            className="input"
                            onChange={handleChange}
                        />
                    )}

                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setLogo(e.target.files[0])}
                    />

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
