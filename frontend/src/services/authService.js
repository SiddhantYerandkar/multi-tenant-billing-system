const API_URL = import.meta.env.VITE_API_URL

function getToken() {
    return localStorage.getItem("token")
}

/**
 * LOGIN (your backend)
 */
export async function login(email, password) {
    const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
    })

    const data = await res.json()

    if (!res.ok || !data.success) {
        throw new Error(data.message || "Invalid credentials")
    }

    localStorage.setItem("token", data.token)

    // IMPORTANT FIX 👇
    if (data.data) {
        localStorage.setItem("user", JSON.stringify(data.data))
    } else {
        localStorage.removeItem("user")
    }

    return data
}

/**
 * LOGOUT
 */
export async function logout() {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    localStorage.removeItem("companyId")
    window.location.reload()
}

/**
 * GET CURRENT USER (FROM TOKEN)
 */

export async function getCurrentUser() {
    const token = getToken()
    if (!token) return null

    const user = localStorage.getItem("user")

    if (!user || user === "undefined" || user === "null") {
        return null
    }

    try {
        return JSON.parse(user)
    } catch (err) {
        localStorage.removeItem("user")
        return null
    }
}

/**
 * OPTIONAL: VERIFY TOKEN WITH BACKEND
 */
export async function verifyUser() {
    const res = await fetch(`${API_URL}/auth/me`, {
        headers: {
            Authorization: `Bearer ${getToken()}`,
        },
    })

    if (!res.ok) return null

    return res.json()
}