import { useEffect, useState } from "react"
import { getParty } from "../services/partyService"
import { getPartyLedgerData } from "../services/ledgerService"
import { buildLedger, calculateLedgerSummary } from "../utils/buildLedger"
import LedgerSummary from "../components/LedgerSummary"
import LedgerTable from "../components/LedgerTable"

export default function PartyLedger({ company, partyId, onBack }) {
  const [party, setParty] = useState(null)
  const [ledgerEntries, setLedgerEntries] = useState([])
  const [summary, setSummary] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (partyId && company?.$id) {
      loadLedgerData()
    }
  }, [partyId, company])

  async function loadLedgerData() {
    if (!partyId || !company?.$id) return

    setLoading(true)
    setError("")
    try {
      // Get party details
      const partyData = await getParty(company.$id, partyId)
      setParty(partyData)

      // Get invoices and payments
      const { invoices, payments } = await getPartyLedgerData(company.$id, partyId)

      // Build ledger entries
      const entries = buildLedger(partyData, invoices, payments)
      setLedgerEntries(entries)

      // Calculate summary
      const ledgerSummary = calculateLedgerSummary(entries)
      setSummary(ledgerSummary)
    } catch (err) {
      console.error("Error loading ledger data:", err)
      setError("Failed to load ledger data. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary mb-2">
            sync
          </span>
          <p className="text-gray-500">Loading ledger...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <span className="material-symbols-outlined text-4xl text-red-500 mb-2">
            error
          </span>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!party) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Party not found</p>
      </div>
    )
  }

  return (
    <main className="flex-1 overflow-y-auto flex flex-col bg-background-light">
      {/* Header */}
      <header className="p-8 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
              )}
              <h2 className="text-3xl font-black tracking-tight">Party Ledger</h2>
            </div>
            <p className="text-[#638288] text-sm mt-1">
              {party.name || "Unknown Party"}
            </p>
            {party.address && (
              <p className="text-[#638288] text-xs mt-1">
                {typeof party.address === 'string' ? party.address : party.address.join(', ')}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="px-8 pb-8 flex-1">
        {/* Summary */}
        <LedgerSummary summary={summary} />

        {/* Ledger Table */}
        <LedgerTable entries={ledgerEntries} />
      </div>
    </main>
  )
}
