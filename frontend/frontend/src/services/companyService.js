const API_URL = import.meta.env.VITE_API_URL

function getToken() {
    return localStorage.getItem("token")
}

export async function getMyCompany() {
    const token = getToken()
    console.log("Fetching my company with token:", token)
    const res = await fetch(`${API_URL}/companies/my`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
    })

    const data = await res.json()

    if (!res.ok) {
        throw new Error(data.message || "Failed to fetch company")
    }

    return data
}

// 🔥 Create Company
export async function createCompany(data, logoFile, qrFile, userId) {
    const formData = new FormData()

    Object.keys(data).forEach((key) => {
        formData.append(key, data[key])
    })

    formData.append("ownerId", userId)

    if (logoFile) formData.append("logo", logoFile)
    if (qrFile) formData.append("qr", qrFile)

    const res = await fetch(`${API_URL}/companies/create`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${getToken()}`
        },
        body: formData
    })

    const dataRes = await res.json()

    if (!res.ok) throw new Error(dataRes.message || "Failed to create company")

    return dataRes
}

// 🔥 Update Company
export async function updateCompany(companyId, data, logoFile, qrFile) {
    const formData = new FormData()

    Object.keys(data).forEach((key) => {
        formData.append(key, data[key])
    })

    if (logoFile) formData.append("logo", logoFile)
    if (qrFile) formData.append("qr", qrFile)

    const res = await fetch(`${API_URL}/companies/${companyId}`, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${getToken()}`,
        },
        body: formData,
    })

    if (!res.ok) throw new Error("Failed to update company")

    return res.json()
}

// 🔥 Get company by id (optional admin use)
export async function getCompany(companyId) {
    const res = await fetch(`${API_URL}/companies/${companyId}`, {
        headers: {
            Authorization: `Bearer ${getToken()}`,
        },
    })

    if (!res.ok) throw new Error("Failed to fetch company")

    return res.json()
}