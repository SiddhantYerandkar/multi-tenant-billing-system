import { useEffect, useState } from "react"
import Login from "./pages/Login"
import CompanySetup from "./pages/CompanySetup"
import Layout from "./components/Layout"
import { getCurrentUser } from "./services/authService"
import { databases } from "./services/appwrite"
import { Query } from "appwrite"

const DB_ID = "billing_db"
const COMPANY_COLLECTION = "companies"

export default function App() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [company, setCompany] = useState(null)

  useEffect(() => {
    async function boot() {
      try {
        const userData = await getCurrentUser()
        setUser(userData)

        const res = await databases.listDocuments(
          DB_ID,
          COMPANY_COLLECTION,
          [Query.equal("ownerId", userData.$id)]
        )

        if (res.total > 0) {
          setCompany(res.documents[0])
        }
      } catch {
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    boot()
  }, [])

  if (loading) return null
  if (!user) return <Login />
  if (!company) return <CompanySetup />

  return <Layout company={company} />
}
