const API_URL = import.meta.env.VITE_API_URL

function getToken() {
    return localStorage.getItem("token")
}

export async function getProducts() {
    const res = await fetch(`${API_URL}/products`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${getToken()}`
        }
    })
    const data = await res.json()

    if (!res.ok) {
        throw new Error(data.message || "Failed to fetch products")
    }

    return data
}

export async function addProduct(payload) {

    const res = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${getToken()}`
        },
        body: JSON.stringify(payload)
    })

    const data = res.json()

    if (!res.ok) {
        throw new Error(data.message || "Failed to create product")
    }

    return data

}

export async function updateProduct(id, data) {
    const res = await fetch(`${API_URL}/products/${id}`, {
        method: 'PUT',
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${getToken()}`
        },
        body: JSON.stringify(data)
    })

    const updatedData = await res.json()

    if (!res.ok) {
        throw new Error(updatedData.message || "Failed to update product")
    }

    return updatedData
}

export async function deleteProduct(id) {
    const res = await fetch(`${API_URL}/products/${id}`, {
        method: 'DELETE',
        headers: {
            "Authorization": `Bearer ${getToken()}`
        }
    })

    const data = await res.json()

    if (!res.ok) {
        throw new Error(data.message || "Failed to delete product")
    }

    return data
}
