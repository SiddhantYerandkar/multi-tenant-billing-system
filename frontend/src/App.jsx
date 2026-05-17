import { useEffect, useState } from "react"
import Login from "./pages/Login"
import CompanySetup from "./pages/CompanySetup"
import Layout from "./components/Layout"
import { getCurrentUser } from "./services/authService"
import { getMyCompany } from "./services/companyService"

export default function App() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [company, setCompany] = useState(null)

  useEffect(() => {
    async function boot() {
      try {
        const userData = await getCurrentUser()
        setUser(userData)

        const companyRes = await getMyCompany()
        if (companyRes?.success && companyRes?.data) {
          setCompany(companyRes.data)
        } else {
          setCompany(null)
        }

      } catch (err) {
        console.log(err)
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