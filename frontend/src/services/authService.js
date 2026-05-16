import { account } from "./appwrite"

export async function login(email, password) {
    return account.createEmailPasswordSession(email, password)
}

export async function logout() {
    try {
        await account.deleteSession("current")
        // Reload the page to reset app state
        window.location.reload()
    } catch (error) {
        console.error("Logout error:", error)
        // Even if logout fails, reload to clear local state
        window.location.reload()
    }
}

export async function getCurrentUser() {
    return account.get()
}
